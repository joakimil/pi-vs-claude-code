-- Calculate fare estimate based on ride type and distance/duration
create or replace function public.estimate_fare(
  p_ride_type_id uuid,
  p_pickup geography,
  p_dropoff geography
)
returns jsonb
language plpgsql
security definer
as $$
declare
  v_ride_type record;
  v_distance_km numeric;
  v_duration_min numeric;
  v_fare numeric;
begin
  -- Get ride type pricing
  select * into v_ride_type
  from public.ride_types
  where id = p_ride_type_id and is_active = true;

  if not found then
    raise exception 'Ride type not found or inactive';
  end if;

  -- Calculate straight-line distance (approximate)
  v_distance_km := round((ST_Distance(p_pickup, p_dropoff) / 1000.0)::numeric, 2);

  -- Estimate duration (assume avg 30 km/h in city)
  v_duration_min := round((v_distance_km / 30.0 * 60.0)::numeric, 1);
  if v_duration_min < 3 then
    v_duration_min := 3;
  end if;

  -- Calculate fare
  v_fare := v_ride_type.base_fare_nok
           + (v_distance_km * v_ride_type.per_km_nok)
           + (v_duration_min * v_ride_type.per_min_nok);

  -- Apply surge
  v_fare := v_fare * v_ride_type.surge_multiplier;

  -- Apply minimum fare
  if v_fare < v_ride_type.min_fare_nok then
    v_fare := v_ride_type.min_fare_nok;
  end if;

  v_fare := round(v_fare, 0); -- round to whole NOK

  return jsonb_build_object(
    'ride_type_id', v_ride_type.id,
    'ride_type_name', v_ride_type.name,
    'distance_km', v_distance_km,
    'duration_min', v_duration_min,
    'base_fare', v_ride_type.base_fare_nok,
    'distance_fare', round(v_distance_km * v_ride_type.per_km_nok, 2),
    'time_fare', round(v_duration_min * v_ride_type.per_min_nok, 2),
    'surge_multiplier', v_ride_type.surge_multiplier,
    'estimated_fare', v_fare
  );
end;
$$;

-- Find nearby available drivers
create or replace function public.find_nearby_drivers(
  p_pickup geography,
  p_radius_meters int default 5000,
  p_vehicle_type public.vehicle_type default null,
  p_limit int default 10
)
returns table (
  driver_id uuid,
  display_name text,
  rating_avg numeric,
  total_trips int,
  vehicle_make text,
  vehicle_model text,
  vehicle_color text,
  vehicle_plate text,
  vehicle_type public.vehicle_type,
  distance_meters numeric,
  eta_min numeric
)
language plpgsql
security definer
as $$
begin
  return query
  select
    d.id as driver_id,
    d.display_name,
    d.rating_avg,
    d.total_trips,
    v.make as vehicle_make,
    v.model as vehicle_model,
    v.color as vehicle_color,
    v.license_plate as vehicle_plate,
    v.vehicle_type,
    round(ST_Distance(dl.location, p_pickup)::numeric, 0) as distance_meters,
    round((ST_Distance(dl.location, p_pickup) / 1000.0 / 30.0 * 60.0)::numeric, 1) as eta_min
  from public.drivers d
  join public.driver_locations dl on dl.driver_id = d.id
  join public.vehicles v on v.driver_id = d.id and v.is_active = true
  where d.is_active = true
    and d.is_online = true
    and ST_DWithin(dl.location, p_pickup, p_radius_meters)
    and (p_vehicle_type is null or v.vehicle_type = p_vehicle_type)
    and not exists (
      select 1 from public.rides r
      where r.driver_id = d.id
        and r.status in ('driver_assigned', 'arriving', 'in_progress')
    )
  order by ST_Distance(dl.location, p_pickup)
  limit p_limit;
end;
$$;

-- Request a ride (creates ride record and starts matching)
create or replace function public.request_ride(
  p_ride_type_id uuid,
  p_pickup_name text,
  p_pickup_address text,
  p_pickup_lat double precision,
  p_pickup_lng double precision,
  p_dropoff_name text,
  p_dropoff_address text,
  p_dropoff_lat double precision,
  p_dropoff_lng double precision,
  p_payment_method_id uuid default null
)
returns jsonb
language plpgsql
security definer
as $$
declare
  v_passenger_id uuid := auth.uid();
  v_pickup geography := ST_SetSRID(ST_MakePoint(p_pickup_lng, p_pickup_lat), 4326)::geography;
  v_dropoff geography := ST_SetSRID(ST_MakePoint(p_dropoff_lng, p_dropoff_lat), 4326)::geography;
  v_estimate jsonb;
  v_ride_id uuid;
begin
  if v_passenger_id is null then
    raise exception 'Not authenticated';
  end if;

  -- Check for existing active ride
  if exists (
    select 1 from public.rides
    where passenger_id = v_passenger_id
      and status in ('requested', 'matching', 'driver_assigned', 'arriving', 'in_progress')
  ) then
    raise exception 'You already have an active ride';
  end if;

  -- Get fare estimate
  v_estimate := public.estimate_fare(p_ride_type_id, v_pickup, v_dropoff);

  -- Create the ride
  insert into public.rides (
    passenger_id, ride_type_id, status,
    pickup_name, pickup_address, pickup_location,
    dropoff_name, dropoff_address, dropoff_location,
    distance_km, duration_min,
    estimated_fare_nok, surge_multiplier,
    payment_method_id, payment_type,
    eta_pickup_min
  ) values (
    v_passenger_id, p_ride_type_id, 'matching',
    p_pickup_name, p_pickup_address, v_pickup,
    p_dropoff_name, p_dropoff_address, v_dropoff,
    (v_estimate->>'distance_km')::numeric,
    (v_estimate->>'duration_min')::numeric,
    (v_estimate->>'estimated_fare')::numeric,
    (v_estimate->>'surge_multiplier')::numeric,
    p_payment_method_id, 'card',
    null
  )
  returning id into v_ride_id;

  -- Save to recent searches
  insert into public.recent_searches (user_id, name, address, location)
  values (v_passenger_id, p_dropoff_name, p_dropoff_address, v_dropoff)
  on conflict do nothing;

  return jsonb_build_object(
    'ride_id', v_ride_id,
    'status', 'matching',
    'estimate', v_estimate
  );
end;
$$;

-- Cancel a ride
create or replace function public.cancel_ride(p_ride_id uuid)
returns jsonb
language plpgsql
security definer
as $$
declare
  v_ride record;
begin
  select * into v_ride
  from public.rides
  where id = p_ride_id and passenger_id = auth.uid();

  if not found then
    raise exception 'Ride not found';
  end if;

  if v_ride.status not in ('requested', 'matching', 'driver_assigned', 'arriving') then
    raise exception 'Cannot cancel ride in status: %', v_ride.status;
  end if;

  update public.rides
  set status = 'cancelled_by_passenger',
      cancelled_at = now()
  where id = p_ride_id;

  return jsonb_build_object(
    'ride_id', p_ride_id,
    'status', 'cancelled_by_passenger',
    'cancelled_at', now()
  );
end;
$$;

-- Submit a ride rating
create or replace function public.rate_ride(
  p_ride_id uuid,
  p_stars int,
  p_tip_nok numeric default 0,
  p_comment text default null
)
returns jsonb
language plpgsql
security definer
as $$
declare
  v_ride record;
begin
  select * into v_ride
  from public.rides
  where id = p_ride_id and passenger_id = auth.uid();

  if not found then
    raise exception 'Ride not found';
  end if;

  if v_ride.status != 'completed' then
    raise exception 'Can only rate completed rides';
  end if;

  if v_ride.driver_id is null then
    raise exception 'No driver to rate';
  end if;

  insert into public.ride_ratings (ride_id, passenger_id, driver_id, stars, tip_nok, comment)
  values (p_ride_id, auth.uid(), v_ride.driver_id, p_stars, p_tip_nok, p_comment)
  on conflict (ride_id) do update set
    stars = excluded.stars,
    tip_nok = excluded.tip_nok,
    comment = excluded.comment;

  return jsonb_build_object(
    'ride_id', p_ride_id,
    'stars', p_stars,
    'tip_nok', p_tip_nok,
    'rated', true
  );
end;
$$;
