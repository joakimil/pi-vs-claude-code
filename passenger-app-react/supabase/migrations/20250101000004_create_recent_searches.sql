create table public.recent_searches (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  name        text not null,
  address     text not null,
  location    geography(Point, 4326) not null,
  searched_at timestamptz not null default now()
);

create index idx_recent_searches_user on public.recent_searches(user_id, searched_at desc);
