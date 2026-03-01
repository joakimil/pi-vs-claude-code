create table public.ride_types (
  id                uuid primary key default gen_random_uuid(),
  name              text not null unique,
  description       text not null default '',
  icon              text not null default '🚗',
  max_passengers    int not null default 3,
  base_fare_nok     numeric(10,2) not null,
  per_km_nok        numeric(10,2) not null,
  per_min_nok       numeric(10,2) not null,
  min_fare_nok      numeric(10,2) not null default 49,
  surge_multiplier  numeric(4,2) not null default 1.0,
  vehicle_type      public.vehicle_type not null default 'sedan',
  is_active         boolean not null default true,
  sort_order        int not null default 0,
  created_at        timestamptz not null default now()
);

create index idx_ride_types_active on public.ride_types(is_active, sort_order);
