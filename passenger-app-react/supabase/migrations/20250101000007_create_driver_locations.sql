create table public.driver_locations (
  driver_id   uuid primary key references public.drivers(id) on delete cascade,
  location    geography(Point, 4326) not null,
  heading     numeric(5,2), -- compass degrees 0-360
  speed_kmh   numeric(5,1),
  updated_at  timestamptz not null default now()
);

create index idx_driver_locations_geo on public.driver_locations using gist(location);
create index idx_driver_locations_updated on public.driver_locations(updated_at);
