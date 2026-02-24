-- Enable realtime for tables that need live updates
alter publication supabase_realtime add table public.rides;
alter publication supabase_realtime add table public.driver_locations;
