create table public.ride_ratings (
  id         uuid primary key default gen_random_uuid(),
  ride_id    uuid not null references public.rides(id) on delete cascade unique,
  passenger_id uuid not null references public.profiles(id),
  driver_id  uuid not null references public.drivers(id),
  stars      int not null check (stars >= 1 and stars <= 5),
  tip_nok    numeric(10,2) not null default 0,
  comment    text,
  created_at timestamptz not null default now()
);

create index idx_ride_ratings_driver on public.ride_ratings(driver_id);
create index idx_ride_ratings_passenger on public.ride_ratings(passenger_id);

-- Function to update driver's average rating after new rating
create or replace function public.update_driver_rating()
returns trigger
language plpgsql
security definer
as $$
begin
  update public.drivers
  set
    rating_avg = (
      select coalesce(round(avg(stars)::numeric, 2), 5.0)
      from public.ride_ratings
      where driver_id = new.driver_id
    ),
    total_trips = (
      select count(*)
      from public.ride_ratings
      where driver_id = new.driver_id
    )
  where id = new.driver_id;
  return new;
end;
$$;

create trigger on_ride_rated
  after insert on public.ride_ratings
  for each row execute procedure public.update_driver_rating();
