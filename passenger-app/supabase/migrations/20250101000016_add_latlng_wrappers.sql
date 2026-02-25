-- Wrapper for estimate_fare that takes lat/lng doubles (callable from REST/RPC)
create or replace function public.estimate_fare_latlng(
  p_ride_type_id uuid,
  p_pickup_lat double precision,
  p_pickup_lng double precision,
  p_dropoff_lat double precision,
  p_dropoff_lng double precision
)
returns jsonb
language plpgsql
security definer
as $$
begin
  return public.estimate_fare(
    p_ride_type_id,
    ST_SetSRID(ST_MakePoint(p_pickup_lng, p_pickup_lat), 4326)::geography,
    ST_SetSRID(ST_MakePoint(p_dropoff_lng, p_dropoff_lat), 4326)::geography
  );
end;
$$;

-- Wrapper for find_nearby_drivers that takes lat/lng doubles
create or replace function public.find_nearby_drivers_latlng(
  p_lat double precision,
  p_lng double precision,
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
  select * from public.find_nearby_drivers(
    ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography,
    p_radius_meters,
    p_vehicle_type,
    p_requested_seats,
    p_limit
  );
end;
$$;

-- Complete a ride (transition to completed status)
create or replace function public.complete_ride(p_ride_id uuid)
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

  if v_ride.status not in ('arriving', 'in_progress') then
    raise exception 'Cannot complete ride in status: %', v_ride.status;
  end if;

  update public.rides
  set status = 'completed',
      dropoff_at = now(),
      final_fare_nok = estimated_fare_nok
  where id = p_ride_id;

  return jsonb_build_object(
    'ride_id', p_ride_id,
    'status', 'completed',
    'final_fare_nok', v_ride.estimated_fare_nok
  );
end;
$$;
