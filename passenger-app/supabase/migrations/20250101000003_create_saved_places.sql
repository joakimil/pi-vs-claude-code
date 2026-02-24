create table public.saved_places (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles(id) on delete cascade,
  label      text not null,
  name       text not null,
  address    text not null,
  location   geography(Point, 4326) not null,
  icon       text not null default 'pin',
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger saved_places_updated_at
  before update on public.saved_places
  for each row execute procedure public.set_updated_at();

create index idx_saved_places_user on public.saved_places(user_id, sort_order);
create index idx_saved_places_location on public.saved_places using gist(location);
