-- Drivers table (populated from dispatch app)
create table public.drivers (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid references auth.users(id) on delete set null, -- optional auth link
  display_name text not null,
  phone        text not null,
  avatar_url   text,
  rating_avg   numeric(3,2) not null default 5.0,
  total_trips  int not null default 0,
  is_active    boolean not null default true,
  is_online    boolean not null default false,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create trigger drivers_updated_at
  before update on public.drivers
  for each row execute procedure public.set_updated_at();

-- Vehicles table
create table public.vehicles (
  id            uuid primary key default gen_random_uuid(),
  driver_id     uuid not null references public.drivers(id) on delete cascade,
  make          text not null,
  model         text not null,
  year          int,
  color         text not null,
  license_plate text not null unique,
  vehicle_type  public.vehicle_type not null default 'sedan',
  is_active     boolean not null default true,
  created_at    timestamptz not null default now()
);

create index idx_vehicles_driver on public.vehicles(driver_id);
create index idx_drivers_online on public.drivers(is_online, is_active);
