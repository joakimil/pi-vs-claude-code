# RideGo Database Schema

Complete reference for the Supabase/PostgreSQL schema powering the RideGo passenger app.

---

## Migration Order & Dependency Chain

The 15 migration files run sequentially. Each builds on the previous — the order matters because of foreign key references, triggers, and the PostGIS extension.

```
00 enable_extensions        ← PostGIS + pgcrypto (required by everything)
01 create_enums             ← custom types used across tables
02 create_profiles          ← depends on auth.users; creates set_updated_at() trigger reused everywhere
03 create_saved_places      ← depends on profiles, PostGIS
04 create_recent_searches   ← depends on profiles, PostGIS
05 create_ride_types        ← standalone pricing table
06 create_drivers_vehicles  ← drivers + vehicles tables
07 create_driver_locations  ← depends on drivers, PostGIS
08 create_rides             ← central table; FK to profiles, drivers, vehicles, ride_types
09 create_ride_ratings      ← depends on rides, profiles, drivers; trigger updates driver.rating_avg
10 create_payment_methods   ← depends on profiles; adds deferred FK back to profiles.default_payment_method_id
11 create_promo_codes       ← promo_codes + promo_usage; depends on profiles, rides
12 create_rls_policies      ← RLS on all 12 tables
13 create_functions         ← estimate_fare, find_nearby_drivers, request_ride, cancel_ride, rate_ride
14 enable_realtime          ← adds rides + driver_locations to supabase_realtime publication
15 add_available_seats      ← adds vehicles.available_seats + rides.requested_seats; updates find_nearby_drivers & request_ride
```

---

## Extensions (migration 00)

| Extension | Schema | Purpose |
|-----------|--------|---------|
| `postgis` | extensions | Geography/geometry types, `ST_Distance`, `ST_DWithin`, `ST_MakePoint` for location queries |
| `pgcrypto` | extensions | `gen_random_uuid()` for UUID primary keys |

---

## Enums (migration 01)

| Enum | Values | Used by |
|------|--------|---------|
| `ride_status` | `requested`, `matching`, `driver_assigned`, `arriving`, `in_progress`, `completed`, `cancelled_by_passenger`, `cancelled_by_driver`, `cancelled_by_system`, `no_drivers` | `rides.status` |
| `vehicle_type` | `sedan`, `suv`, `van`, `luxury` | `vehicles`, `ride_types` |
| `payment_type` | `card`, `vipps`, `corporate`, `cash` | `payment_methods`, `rides` |
| `promo_type` | `percentage`, `fixed` | `promo_codes` |

---

## Tables

### 1. `profiles` (migration 02)
The passenger's user profile, auto-created on Supabase Auth signup via trigger.

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid PK | References `auth.users(id)` CASCADE |
| `display_name` | text | Defaults to email username |
| `phone` | text | |
| `email` | text | |
| `avatar_url` | text | |
| `default_payment_method_id` | uuid FK → `payment_methods` | Added in migration 10 |
| `created_at` | timestamptz | |
| `updated_at` | timestamptz | Auto-set by `set_updated_at()` trigger |

**Triggers**: `handle_new_user()` on `auth.users` INSERT → auto-inserts profile. `set_updated_at()` on UPDATE.

---

### 2. `saved_places` (migration 03)
User's bookmarked locations (Home, Work, etc.).

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid PK | |
| `user_id` | uuid FK → `profiles` CASCADE | |
| `label` | text | e.g. "Home", "Work" |
| `name` | text | Place name |
| `address` | text | Full address string |
| `location` | geography(Point, 4326) | PostGIS point |
| `icon` | text | Default `'pin'` |
| `sort_order` | int | For display ordering |
| `created_at` / `updated_at` | timestamptz | |

**Indexes**: `(user_id, sort_order)`, GIST on `location`.

---

### 3. `recent_searches` (migration 04)
Destinations the user has searched for recently.

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid PK | |
| `user_id` | uuid FK → `profiles` CASCADE | |
| `name` | text | Place name |
| `address` | text | |
| `location` | geography(Point, 4326) | |
| `searched_at` | timestamptz | Default `now()` |

**Indexes**: `(user_id, searched_at DESC)` for chronological listing.

---

### 4. `ride_types` (migration 05)
The available ride tiers with pricing formulas.

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid PK | |
| `name` | text UNIQUE | Economy, Comfort, XL |
| `description` | text | |
| `icon` | text | Emoji |
| `max_passengers` | int | |
| `base_fare_nok` | numeric(10,2) | Fixed starting fare |
| `per_km_nok` | numeric(10,2) | Price per kilometer |
| `per_min_nok` | numeric(10,2) | Price per minute |
| `min_fare_nok` | numeric(10,2) | Floor price |
| `surge_multiplier` | numeric(4,2) | Default 1.0 |
| `vehicle_type` | vehicle_type enum | |
| `is_active` | boolean | |
| `sort_order` | int | Display order |

**Seed data**: Economy (kr39 base + kr12/km + kr3/min), Comfort (kr59 + kr16/km + kr4.50/min), XL (kr79 + kr20/km + kr5.50/min).

---

### 5. `drivers` (migration 06)
Driver profiles. Managed externally (dispatch/driver app), not by passengers.

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid PK | |
| `user_id` | uuid FK → `auth.users` | Optional auth link |
| `display_name` | text | |
| `phone` | text | |
| `avatar_url` | text | |
| `rating_avg` | numeric(3,2) | Updated by trigger on `ride_ratings` |
| `total_trips` | int | Also updated by trigger |
| `is_active` | boolean | Account status |
| `is_online` | boolean | Currently accepting rides |
| `created_at` / `updated_at` | timestamptz | |

**Seed data**: 5 drivers — Mohamed K. (4.92★), Anna S. (4.88★), Erik B. (4.75★), Fatima H. (4.95★), Lars O. (4.60★, offline).

---

### 6. `vehicles` (migration 06, updated migration 15)
Each driver's vehicle. One driver can have multiple vehicles but only one active.

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid PK | |
| `driver_id` | uuid FK → `drivers` CASCADE | |
| `make` / `model` | text | e.g. Toyota Camry |
| `year` | int | |
| `color` | text | |
| `license_plate` | text UNIQUE | |
| `vehicle_type` | vehicle_type enum | |
| `available_seats` | int | **Added in migration 15.** Actual passenger seats in this vehicle (default 4) |
| `is_active` | boolean | |

---

### 7. `driver_locations` (migration 07)
Real-time GPS position per driver. One row per driver (upserted).

| Column | Type | Notes |
|--------|------|-------|
| `driver_id` | uuid PK FK → `drivers` CASCADE | |
| `location` | geography(Point, 4326) | Current position |
| `heading` | numeric(5,2) | Compass bearing 0–360° |
| `speed_kmh` | numeric(5,1) | |
| `updated_at` | timestamptz | |

**Realtime**: Published to `supabase_realtime` (migration 14) for live map updates.  
**Indexes**: GIST on `location` for spatial queries.

---

### 8. `rides` (migration 08)
The central table — every ride request from creation to completion.

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid PK | |
| `passenger_id` | uuid FK → `profiles` | |
| `driver_id` | uuid FK → `drivers` | Set when matched |
| `vehicle_id` | uuid FK → `vehicles` | Set when matched |
| `ride_type_id` | uuid FK → `ride_types` | |
| `status` | ride_status enum | Lifecycle state |
| `pickup_name` / `pickup_address` | text | |
| `pickup_location` | geography(Point, 4326) | |
| `dropoff_name` / `dropoff_address` | text | |
| `dropoff_location` | geography(Point, 4326) | |
| `distance_km` | numeric(10,2) | |
| `duration_min` | numeric(10,1) | |
| `route_polyline` | text | Encoded for map rendering |
| `estimated_fare_nok` | numeric(10,2) | Calculated at request time |
| `final_fare_nok` | numeric(10,2) | Set at completion |
| `surge_multiplier` | numeric(4,2) | |
| `promo_code_id` | uuid | |
| `discount_nok` | numeric(10,2) | |
| `payment_method_id` | uuid | |
| `payment_type` | payment_type enum | |
| `requested_seats` | int | **Added in migration 15.** Number of seats the passenger needs (default 1) |
| `eta_pickup_min` / `eta_dropoff_min` | numeric(5,1) | |
| `requested_at` | timestamptz | |
| `matched_at` / `pickup_at` / `dropoff_at` / `cancelled_at` | timestamptz | Lifecycle timestamps |
| `cancellation_reason` | text | |

**Realtime**: Published to `supabase_realtime` for live status updates.  
**Indexes**: `(passenger_id, created_at DESC)`, `(driver_id, created_at DESC)`, partial on active statuses, GIST on `pickup_location`.

**Status lifecycle**:
```
requested → matching → driver_assigned → arriving → in_progress → completed
                ↓              ↓              ↓
            no_drivers   cancelled_by_*   cancelled_by_*
```

---

### 9. `ride_ratings` (migration 09)
Post-trip ratings and tips, one per ride.

| Column         | Type                              | Notes               |
| -------------- | --------------------------------- | ------------------- |
| `id`           | uuid PK                           |                     |
| `ride_id`      | uuid FK → `rides` CASCADE, UNIQUE | One rating per ride |
| `passenger_id` | uuid FK → `profiles`              |                     |
| `driver_id`    | uuid FK → `drivers`               |                     |
| `stars`        | int                               | CHECK 1–5           |
| `tip_nok`      | numeric(10,2)                     | Default 0           |
| `comment`      | text                              |                     |
| `created_at`   | timestamptz                       |                     |

**Trigger**: `update_driver_rating()` on INSERT recalculates `drivers.rating_avg` and `drivers.total_trips`.

---

### 10. `payment_methods` (migration 10)
Stored payment methods for the passenger.

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid PK | |
| `user_id` | uuid FK → `profiles` CASCADE | |
| `payment_type` | payment_type enum | |
| `label` | text | e.g. "Visa •••• 4242" |
| `is_default` | boolean | |
| `card_brand` | text | visa, mastercard |
| `card_last4` | text | |
| `expires_at` | date | |

Also adds the deferred FK `profiles.default_payment_method_id → payment_methods.id`.

---

### 11. `promo_codes` + `promo_usage` (migration 11)

**`promo_codes`**:

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid PK | |
| `code` | text UNIQUE | e.g. "WELCOME50" |
| `promo_type` | promo_type enum | percentage or fixed |
| `value` | numeric(10,2) | % (0–100) or NOK amount |
| `max_discount_nok` | numeric(10,2) | Cap for percentage promos |
| `min_fare_nok` | numeric(10,2) | Minimum fare to apply |
| `max_uses` | int | null = unlimited |
| `used_count` | int | |
| `valid_from` / `valid_until` | timestamptz | |
| `is_active` | boolean | |

**Seed data**: `WELCOME50` (50% off, max kr100), `OSLO2025` (kr30 off), `FREERIDE` (100% off, max kr150).

**`promo_usage`**: Tracks per-user redemption with UNIQUE constraint on `(promo_code_id, user_id)`.

---

## RLS Policies (migration 12)

All tables have RLS enabled. Key rules:

| Table | Policy | Rule |
|-------|--------|------|
| `profiles` | SELECT/UPDATE own | `auth.uid() = id` |
| `saved_places` | Full CRUD own | `auth.uid() = user_id` |
| `recent_searches` | SELECT/INSERT/DELETE own | `auth.uid() = user_id` |
| `ride_types` | SELECT all active | `is_active = true` (public) |
| `drivers` | SELECT active | `is_active = true` (authenticated) |
| `vehicles` | SELECT active | `is_active = true` (authenticated) |
| `driver_locations` | SELECT for own ride's driver | Only if passenger has active ride with that driver |
| `rides` | SELECT/INSERT/UPDATE own | `auth.uid() = passenger_id` |
| `ride_ratings` | SELECT/INSERT own | `auth.uid() = passenger_id` |
| `payment_methods` | Full CRUD own | `auth.uid() = user_id` |
| `promo_codes` | SELECT active | `is_active = true` (authenticated) |
| `promo_usage` | SELECT/INSERT own | `auth.uid() = user_id` |

---

## Database Functions (migration 13)

### `estimate_fare(ride_type_id, pickup, dropoff) → jsonb`
Calculates fare using straight-line distance (PostGIS `ST_Distance`), estimated duration (assumes 30 km/h city speed), and the ride type's pricing formula. Returns distance, duration, fare breakdown, and surge multiplier.

### `find_nearby_drivers(pickup, radius, vehicle_type?, requested_seats?, limit?) → table`
Spatial query: finds online, active drivers within radius (default 5km) who don't have an active ride **and whose vehicle has enough seats** (`available_seats >= p_requested_seats`). Returns driver info, vehicle details, `available_seats`, distance in meters, and ETA. *(Updated in migration 15.)*

### `request_ride(..., requested_seats?) → jsonb`
Full ride creation flow: validates auth, validates `requested_seats` (1–8), checks no existing active ride, estimates fare, inserts into `rides` with status `matching` and `requested_seats`, saves destination to `recent_searches`. Returns ride_id + requested_seats + estimate. *(Updated in migration 15.)*

### `cancel_ride(ride_id) → jsonb`
Validates ownership and cancellable status, sets status to `cancelled_by_passenger`.

### `rate_ride(ride_id, stars, tip?, comment?) → jsonb`
Validates completed ride, upserts into `ride_ratings` (triggers driver rating recalculation).

---

## Realtime (migration 14)

Two tables added to `supabase_realtime` publication:
- **`rides`** — status changes push to passenger in real-time (matching → assigned → arriving → in_progress → completed)
- **`driver_locations`** — live GPS updates for the map during active rides

---

## Entity Relationship Diagram (simplified)

```
auth.users ──1:1──► profiles ──1:N──► saved_places
                        │          └──► recent_searches
                        │          └──► payment_methods
                        │          └──► rides ◄──N:1── ride_types
                        │                │
                        │                ├──► ride_ratings
                        │                ├──N:1──► drivers ──1:N──► vehicles
                        │                │             └──1:1──► driver_locations
                        │                └──► promo_usage ──► promo_codes
                        └── default_payment_method_id ──►─┘
```
