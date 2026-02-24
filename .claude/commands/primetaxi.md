---
description: Load full context for the RideGo passenger taxi app to prepare for coding improvements.
---

# Prime: RideGo Passenger App

Orient yourself in the RideGo taxi passenger app — an Oslo-based ride-hailing UI with a Supabase backend.

## Workflow

1. Read the project instructions: `CLAUDE.md`
2. Read the main app file: `passenger-app/index.html` (single-file app: HTML + CSS + JS, ~1670 lines)
3. Read the database schema migrations in order:
   - `passenger-app/supabase/migrations/20250101000001_create_enums.sql`
   - `passenger-app/supabase/migrations/20250101000002_create_profiles.sql`
   - `passenger-app/supabase/migrations/20250101000003_create_saved_places.sql`
   - `passenger-app/supabase/migrations/20250101000004_create_recent_searches.sql`
   - `passenger-app/supabase/migrations/20250101000005_create_ride_types.sql`
   - `passenger-app/supabase/migrations/20250101000006_create_drivers_and_vehicles.sql`
   - `passenger-app/supabase/migrations/20250101000007_create_driver_locations.sql`
   - `passenger-app/supabase/migrations/20250101000008_create_rides.sql`
   - `passenger-app/supabase/migrations/20250101000009_create_ride_ratings.sql`
   - `passenger-app/supabase/migrations/20250101000010_create_payment_methods.sql`
   - `passenger-app/supabase/migrations/20250101000011_create_promo_codes.sql`
   - `passenger-app/supabase/migrations/20250101000012_create_rls_policies.sql`
   - `passenger-app/supabase/migrations/20250101000013_create_functions.sql`
   - `passenger-app/supabase/migrations/20250101000014_enable_realtime.sql`
   - `passenger-app/supabase/migrations/20250101000015_add_available_seats.sql`
4. Read the seed data: `passenger-app/supabase/seed.sql`
5. Read the Supabase config: `passenger-app/supabase/config.toml`
6. Read `passenger-app/package.json`

## App Architecture Summary

Provide a summary covering:

### Frontend (single-file `index.html`)
- **Stack**: Vanilla HTML/CSS/JS, no build step, served via `python3 -m http.server 3000`
- **Design**: Dark theme, mobile-first with iPhone-style phone frame (390×844), CSS custom properties for theming
- **Screen flow** (6 screens, animated transitions):
  1. **Home** — Map background, greeting, "Where to?" search bar, quick chips (Home/Work/Airport), recent places, bottom nav
  2. **Search** — Pickup (fixed "Current Location") + destination input, filters recent/suggestions list in real-time
  3. **Ride Options** — Route map with pickup/destination markers, 3 ride tiers (Economy kr89 / Comfort kr139 / XL kr199), payment method, confirm button
  4. **Driver Matching** — Spinner animation, auto-advances to Trip screen after 3 seconds
  5. **Trip In Progress** — Arriving countdown (3 min timer), driver card (name/rating/car), Call/Message buttons, pickup/dropoff timeline, cancel + share trip + "Complete Trip (Demo)" button
  6. **Trip Complete** — Fare breakdown, 5-star rating, tip selection (No tip / kr10 / kr20 / kr30), comment box, Done button
- **State**: IIFE with closure variables (`currentScreen`, `selectedRide`, `selectedDestination`, `countdownSeconds`)
- **Navigation**: `showScreen(name)` for forward, `goBack(from)` for back animations
- **No Supabase integration yet** — all data is hardcoded in the HTML, the backend schema exists but isn't wired up

### Backend (Supabase / PostgreSQL)
- **Local dev**: `npx supabase start` (Docker-based), Studio at `localhost:54323`
- **Key tables**: `profiles`, `saved_places`, `recent_searches`, `ride_types`, `drivers`, `vehicles`, `driver_locations` (PostGIS), `rides`, `ride_ratings`, `payment_methods`, `promo_codes`
- **Enums**: `ride_status` (requested→accepted→arriving→in_progress→completed→cancelled), `payment_type`, `vehicle_type`, `place_type`
- **Features**: PostGIS for geo, RLS policies, realtime enabled on `rides`/`driver_locations`, DB functions for nearby drivers and fare estimation
- **Seed data**: 3 ride types, 5 Oslo drivers with vehicles and locations, sample saved places

### Scripts (`package.json`)
- `bun run dev` — starts Supabase + HTTP server on port 3000
- `bun run db:reset` — reset and re-seed the database
- `bun run db:studio` — open Supabase Studio

## Key Gaps & Improvement Areas
- Frontend has zero Supabase client integration (no `@supabase/supabase-js`)
- All places, drivers, fares, and ride data are hardcoded HTML — need to fetch from DB
- No auth flow (profiles table exists but no login UI)
- No real geolocation (pickup is always "Nydalen")
- Matching screen is a fake 3-second timer, not a real driver query
- No ride persistence — rides aren't saved to the `rides` table
- Ratings/tips aren't persisted to `ride_ratings`
- Realtime subscriptions (driver location updates, ride status changes) not implemented
- No error handling, loading states, or offline support
