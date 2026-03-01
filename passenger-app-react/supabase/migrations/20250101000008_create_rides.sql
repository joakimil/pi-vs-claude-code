create table public.rides (
  id                  uuid primary key default gen_random_uuid(),
  passenger_id        uuid not null references public.profiles(id),
  driver_id           uuid references public.drivers(id),
  vehicle_id          uuid references public.vehicles(id),
  ride_type_id        uuid not null references public.ride_types(id),

  -- Status
  status              public.ride_status not null default 'requested',

  -- Locations
  pickup_name         text not null,
  pickup_address      text not null,
  pickup_location     geography(Point, 4326) not null,
  dropoff_name        text not null,
  dropoff_address     text not null,
  dropoff_location    geography(Point, 4326) not null,

  -- Route info
  distance_km         numeric(10,2),
  duration_min        numeric(10,1),
  route_polyline      text, -- encoded polyline for map display

  -- Pricing
  estimated_fare_nok  numeric(10,2) not null,
  final_fare_nok      numeric(10,2),
  surge_multiplier    numeric(4,2) not null default 1.0,
  promo_code_id       uuid,
  discount_nok        numeric(10,2) not null default 0,

  -- Payment
  payment_method_id   uuid,
  payment_type        public.payment_type not null default 'card',

  -- ETA
  eta_pickup_min      numeric(5,1),
  eta_dropoff_min     numeric(5,1),

  -- Timestamps
  requested_at        timestamptz not null default now(),
  matched_at          timestamptz,
  pickup_at           timestamptz,
  dropoff_at          timestamptz,
  cancelled_at        timestamptz,
  cancellation_reason text,

  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create trigger rides_updated_at
  before update on public.rides
  for each row execute procedure public.set_updated_at();

create index idx_rides_passenger on public.rides(passenger_id, created_at desc);
create index idx_rides_driver on public.rides(driver_id, created_at desc);
create index idx_rides_status on public.rides(status) where status not in ('completed', 'cancelled_by_passenger', 'cancelled_by_driver', 'cancelled_by_system', 'no_drivers');
create index idx_rides_pickup_geo on public.rides using gist(pickup_location);
