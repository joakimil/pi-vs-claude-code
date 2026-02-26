-- Update estimate_fare to accept real route distance/duration from Google Routes API
-- Falls back to straight-line calculation if not provided (backwards compatible)

create or replace function public.estimate_fare(
  p_ride_type_id uuid,
  p_pickup geography,
  p_dropoff geography,
  p_real_distance_km numeric default null,
  p_real_duration_min numeric default null
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

  -- Use real route data if provided, otherwise fall back to straight-line estimate
  if p_real_distance_km is not null and p_real_duration_min is not null then
    v_distance_km := round(p_real_distance_km, 2);
    v_duration_min := round(p_real_duration_min, 1);
  else
    -- Fallback: straight-line distance (approximate)
    v_distance_km := round((ST_Distance(p_pickup, p_dropoff) / 1000.0)::numeric, 2);
    -- Fallback: assume avg 30 km/h in city
    v_duration_min := round((v_distance_km / 30.0 * 60.0)::numeric, 1);
  end if;

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

  v_fare := round(v_fare, 0);

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

-- Update the lat/lng wrapper to pass through real route data
create or replace function public.estimate_fare_latlng(
  p_ride_type_id uuid,
  p_pickup_lat double precision,
  p_pickup_lng double precision,
  p_dropoff_lat double precision,
  p_dropoff_lng double precision,
  p_real_distance_km numeric default null,
  p_real_duration_min numeric default null
)
returns jsonb
language plpgsql
security definer
as $$
begin
  return public.estimate_fare(
    p_ride_type_id,
    ST_SetSRID(ST_MakePoint(p_pickup_lng, p_pickup_lat), 4326)::geography,
    ST_SetSRID(ST_MakePoint(p_dropoff_lng, p_dropoff_lat), 4326)::geography,
    p_real_distance_km,
    p_real_duration_min
  );
end;
$$;
