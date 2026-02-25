-- Add available_seats to vehicles (actual seat capacity per car)
alter table public.vehicles
  add column available_seats int not null default 4;

comment on column public.vehicles.available_seats is 'Number of passenger seats available in this vehicle';

-- Add requested_seats to rides (how many seats the passenger needs)
alter table public.rides
  add column requested_seats int not null default 1;

comment on column public.rides.requested_seats is 'Number of seats the passenger requested for this ride';

-- Note: seed data already includes available_seats values in the INSERT statements.

-- Update find_nearby_drivers to accept and filter by requested seats
create or replace function public.find_nearby_drivers(
  p_pickup geography,
  p_radius_meters int default 5000,
  p_vehicle_type public.vehicle_type default null,
  p_requested_seats int default 1,
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
  available_seats int,
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
    v.available_seats,
    round(ST_Distance(dl.location, p_pickup)::numeric, 0) as distance_meters,
    round((ST_Distance(dl.location, p_pickup) / 1000.0 / 30.0 * 60.0)::numeric, 1) as eta_min
  from public.drivers d
  join public.driver_locations dl on dl.driver_id = d.id
  join public.vehicles v on v.driver_id = d.id and v.is_active = true
  where d.is_active = true
    and d.is_online = true
    and ST_DWithin(dl.location, p_pickup, p_radius_meters)
    and v.available_seats >= p_requested_seats
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

-- Update request_ride to accept requested_seats
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
  p_payment_method_id uuid default null,
  p_requested_seats int default 1
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

  -- Validate requested seats
  if p_requested_seats < 1 or p_requested_seats > 8 then
    raise exception 'Requested seats must be between 1 and 8';
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
    requested_seats,
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
    p_requested_seats,
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
    'requested_seats', p_requested_seats,
    'estimate', v_estimate
  );
end;
$$;
