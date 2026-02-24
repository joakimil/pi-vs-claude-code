-- Enable PostGIS for location/geography operations
create extension if not exists "postgis" with schema "extensions";

-- Enable pgcrypto for gen_random_uuid()
create extension if not exists "pgcrypto" with schema "extensions";
