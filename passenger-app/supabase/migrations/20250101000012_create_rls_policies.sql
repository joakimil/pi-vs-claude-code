-- Enable RLS on all tables
alter table public.profiles enable row level security;
alter table public.saved_places enable row level security;
alter table public.recent_searches enable row level security;
alter table public.ride_types enable row level security;
alter table public.drivers enable row level security;
alter table public.vehicles enable row level security;
alter table public.driver_locations enable row level security;
alter table public.rides enable row level security;
alter table public.ride_ratings enable row level security;
alter table public.payment_methods enable row level security;
alter table public.promo_codes enable row level security;
alter table public.promo_usage enable row level security;

-- PROFILES: users can read/update their own profile
create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- SAVED PLACES: users manage their own saved places
create policy "Users can view own saved places"
  on public.saved_places for select
  using (auth.uid() = user_id);

create policy "Users can insert own saved places"
  on public.saved_places for insert
  with check (auth.uid() = user_id);

create policy "Users can update own saved places"
  on public.saved_places for update
  using (auth.uid() = user_id);

create policy "Users can delete own saved places"
  on public.saved_places for delete
  using (auth.uid() = user_id);

-- RECENT SEARCHES: users manage their own
create policy "Users can view own recent searches"
  on public.recent_searches for select
  using (auth.uid() = user_id);

create policy "Users can insert own recent searches"
  on public.recent_searches for insert
  with check (auth.uid() = user_id);

create policy "Users can delete own recent searches"
  on public.recent_searches for delete
  using (auth.uid() = user_id);

-- RIDE TYPES: everyone can view active ride types
create policy "Anyone can view active ride types"
  on public.ride_types for select
  using (is_active = true);

-- DRIVERS: passengers can see active drivers (limited info)
create policy "Authenticated users can view active drivers"
  on public.drivers for select
  to authenticated
  using (is_active = true);

-- VEHICLES: passengers can see active vehicles
create policy "Authenticated users can view active vehicles"
  on public.vehicles for select
  to authenticated
  using (is_active = true);

-- DRIVER LOCATIONS: passengers can see locations of drivers on their active rides
create policy "Passengers can view their ride driver location"
  on public.driver_locations for select
  to authenticated
  using (
    exists (
      select 1 from public.rides
      where rides.driver_id = driver_locations.driver_id
        and rides.passenger_id = auth.uid()
        and rides.status in ('driver_assigned', 'arriving', 'in_progress')
    )
  );

-- RIDES: passengers can view and create their own rides
create policy "Passengers can view own rides"
  on public.rides for select
  using (auth.uid() = passenger_id);

create policy "Passengers can create rides"
  on public.rides for insert
  with check (auth.uid() = passenger_id);

create policy "Passengers can update own rides"
  on public.rides for update
  using (auth.uid() = passenger_id);

-- RIDE RATINGS: passengers can create and view their own ratings
create policy "Passengers can view own ratings"
  on public.ride_ratings for select
  using (auth.uid() = passenger_id);

create policy "Passengers can create ratings"
  on public.ride_ratings for insert
  with check (auth.uid() = passenger_id);

-- PAYMENT METHODS: users manage their own
create policy "Users can view own payment methods"
  on public.payment_methods for select
  using (auth.uid() = user_id);

create policy "Users can insert own payment methods"
  on public.payment_methods for insert
  with check (auth.uid() = user_id);

create policy "Users can update own payment methods"
  on public.payment_methods for update
  using (auth.uid() = user_id);

create policy "Users can delete own payment methods"
  on public.payment_methods for delete
  using (auth.uid() = user_id);

-- PROMO CODES: anyone authenticated can view active promos
create policy "Users can view active promo codes"
  on public.promo_codes for select
  to authenticated
  using (is_active = true);

-- PROMO USAGE: users can see their own usage
create policy "Users can view own promo usage"
  on public.promo_usage for select
  using (auth.uid() = user_id);

create policy "Users can insert own promo usage"
  on public.promo_usage for insert
  with check (auth.uid() = user_id);
