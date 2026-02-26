-- Ride messages: in-app chat between passenger and driver during active trips
create table public.ride_messages (
  id            uuid primary key default gen_random_uuid(),
  ride_id       uuid not null references public.rides(id) on delete cascade,
  sender_type   text not null check (sender_type in ('passenger', 'driver')),
  message       text not null,
  created_at    timestamptz not null default now()
);

create index idx_ride_messages_ride on public.ride_messages(ride_id, created_at);

-- Enable RLS
alter table public.ride_messages enable row level security;

-- Passengers can read all messages (both passenger and driver) for their own active rides
create policy "Passengers can view messages on own active rides"
  on public.ride_messages for select
  using (
    exists (
      select 1 from public.rides
      where rides.id = ride_messages.ride_id
        and rides.passenger_id = auth.uid()
        and rides.status in ('driver_assigned', 'arriving', 'in_progress')
    )
  );

-- Passengers can send messages on their own active rides
create policy "Passengers can send messages on own active rides"
  on public.ride_messages for insert
  with check (
    sender_type = 'passenger'
    and exists (
      select 1 from public.rides
      where rides.id = ride_messages.ride_id
        and rides.passenger_id = auth.uid()
        and rides.status in ('driver_assigned', 'arriving', 'in_progress')
    )
  );

-- Enable realtime for live chat
alter publication supabase_realtime add table public.ride_messages;
