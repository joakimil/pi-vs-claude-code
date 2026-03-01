# Connect Passenger App → Dispatch App (TaxiHelper)

## Goal
When a passenger requests a ride in the Passenger App (RideGo), the driver should receive the ride request in the Dispatch App (TaxiHelper). Both apps share one Supabase database — the **TaxiHelper database** (`pezaxapzsxluklbxixqc.supabase.co`) — as the single source of truth for all ride/booking operations.

---

## Architecture Overview

```
┌──────────────────────┐
│   Passenger App      │  (pi-vs-claude-code/passenger-app)
│   RideGo             │  Static HTML + Supabase JS client
│                      │
│   Connects to:       │
│   → TaxiHelper DB    │  for rides, bookings, driver locations
│   → Own DB (legacy)  │  for profiles, saved places, promo codes (keep for now)
└──────┬───────────────┘
       │  INSERT into booking_requests
       │  Supabase Realtime subscription on booking_requests
       │
       ▼
┌──────────────────────────────────────────┐
│   TaxiHelper Supabase                    │
│   (pezaxapzsxluklbxixqc.supabase.co)    │
│                                          │
│   Tables used for ride flow:             │
│   • booking_requests    ← ride requests  │
│   • booking_notifications ← driver push  │
│   • driver_availability ← who's online   │
│   • trips               ← completed trip │
│   • profiles            ← driver info    │
│   • passenger_profiles  ← passenger info │
│   • passenger_locations ← saved places   │
└──────┬───────────────────────────────────┘
       │  Realtime subscription on booking_requests
       │  Realtime subscription on booking_notifications
       │
       ▼
┌──────────────────────┐
│   Dispatch App       │  (TaxihelperDEV/frontend)
│   TaxiHelper         │  React + Vite + Supabase
│                      │
│   Driver sees:       │
│   → New ride popup   │
│   → Accept/reject    │
│   → Navigate to      │
│     pickup           │
└──────────────────────┘
```

---

## Phase 1: Point Passenger App at TaxiHelper DB for bookings

### 1.1 Add a second Supabase client in the Passenger App

The passenger app (`passenger-app/index.html`) currently uses one Supabase client pointing at the passenger DB. Add a **second client** for the dispatch/rides DB.

**File: `passenger-app/config.js`**
```js
// Passenger-specific Supabase (auth, profiles, saved places, promo codes)
window.__RIDEGO_SUPABASE_URL = 'https://plpkelkbwcyuglaghsfk.supabase.co';
window.__RIDEGO_SUPABASE_KEY = '...existing key...';

// Dispatch/Rides Supabase (bookings, driver availability, trips)
window.__DISPATCH_SUPABASE_URL = 'https://pezaxapzsxluklbxixqc.supabase.co';
window.__DISPATCH_SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBlemF4YXB6c3hsdWtsYnhpeHFjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIxNDU1NDUsImV4cCI6MjA4NzcyMTU0NX0.yjH8b3L0nYf1JD_WcpWX-D5Ch-l-10TWy8fkyVdYOoQ';
```

**In `index.html`, create two clients:**
```js
var sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);           // passenger DB (auth, profiles)
var dispatchDb = window.supabase.createClient(DISPATCH_URL, DISPATCH_KEY);   // dispatch DB (bookings)
```

### 1.2 Change the ride request flow to write to TaxiHelper's `booking_requests`

Currently the passenger app calls `sb.rpc('request_ride', {...})` which writes to the passenger DB's `rides` table. Change this to **insert directly into the dispatch DB's `booking_requests` table**.

**Replace the `request_ride` RPC call (~line 3261) with:**
```js
// Map passenger app fields → dispatch DB booking_requests columns
var { data, error } = await dispatchDb
  .from('booking_requests')
  .insert({
    customer_name: passengerName,           // from passenger profile
    customer_phone: passengerPhone,         // from passenger profile
    customer_email: passengerEmail || null,
    pickup_address: pickupAddress,
    dropoff_address: dropoffAddress,
    pickup_latitude: pickupLat,
    pickup_longitude: pickupLng,
    dropoff_latitude: dropoffLat,
    dropoff_longitude: dropoffLng,
    requested_pickup_time: new Date().toISOString(),
    estimated_duration_minutes: Math.round(durationMin),
    payment_method: selectedPaymentType,    // 'card', 'cash', 'vipps'
    estimated_fare: estimatedFare,
    booking_source: 'passenger_app',        // identifies origin
    trip_type: selectedRideType,            // 'standard', 'luxury', etc.
    status: 'pending',
  })
  .select()
  .single();
```

### 1.3 Subscribe to booking status changes via Realtime

After inserting, subscribe to changes on that specific booking row so the passenger sees driver assignment, arrival, etc.

```js
function subscribeToBooking(bookingId) {
  window._bookingSubscription = dispatchDb
    .channel('booking-' + bookingId)
    .on('postgres_changes', {
      event: 'UPDATE',
      schema: 'public',
      table: 'booking_requests',
      filter: 'id=eq.' + bookingId,
    }, (payload) => {
      handleBookingUpdate(payload.new);
    })
    .subscribe();
}

function handleBookingUpdate(booking) {
  // Map dispatch statuses → passenger UI states
  switch (booking.status) {
    case 'accepted':
    case 'assigned':
      showDriverAssigned(booking);
      break;
    case 'driver_arriving':
      showDriverArriving(booking);
      break;
    case 'driver_arrived':
      showDriverArrived(booking);
      break;
    case 'trip_started':
      showTripInProgress(booking);
      break;
    case 'trip_completed':
      showTripCompleted(booking);
      break;
    case 'cancelled':
    case 'expired':
      showTripCancelled(booking);
      break;
  }
}
```

### 1.4 Enable Realtime on `booking_requests` in TaxiHelper DB

Run this migration in the TaxiHelper Supabase project:

```sql
-- Enable realtime for booking_requests if not already enabled
ALTER PUBLICATION supabase_realtime ADD TABLE public.booking_requests;
```

### 1.5 Add RLS policy for anonymous passenger inserts

The passenger app uses the anon key (no auth on dispatch DB), so we need a policy that allows inserts from `booking_source = 'passenger_app'`:

```sql
-- Allow anonymous inserts from passenger app
CREATE POLICY "passenger_app_can_insert_bookings"
  ON public.booking_requests
  FOR INSERT
  WITH CHECK (booking_source = 'passenger_app');

-- Allow anonymous reads on own booking (by ID, via realtime)
CREATE POLICY "anyone_can_read_own_booking"
  ON public.booking_requests
  FOR SELECT
  USING (true);  -- Or restrict by some token/session ID for security

-- Make sure RLS is enabled
ALTER TABLE public.booking_requests ENABLE ROW LEVEL SECURITY;
```

> **Security note:** For MVP/testing this is fine. For production, consider adding a `passenger_token` column (a UUID generated client-side) so passengers can only read their own bookings without full auth.

---

## Phase 2: Driver receives the ride request in TaxiHelper

### 2.1 Verify existing Realtime subscription in dispatch app

The TaxiHelper app already has `realtime-booking.ts` and `bookingService.ts` that handle `booking_requests`. The existing flow:

1. `bookingService.ts` → subscribes to realtime notifications
2. `realtime-booking.ts` → watches `booking_requests` table
3. `bookingStore.ts` → manages state and triggers UI notifications
4. Driver sees popup → accepts/rejects

**What to check/fix:**
- Ensure `booking_requests` has Realtime enabled (see 1.4)
- Ensure the Realtime subscription in `realtime-booking.ts` listens for `INSERT` events (not just mock data)
- The current code has `isUsingMockData = process.env.NODE_ENV === 'development'` — in production, it tries WebSocket. **We need to add a Supabase Realtime path** as an alternative to WebSocket.

### 2.2 Add Supabase Realtime listener for new bookings (in dispatch app)

Add this to `realtime-booking.ts` (or a new file):

```typescript
// Subscribe to new booking_requests from passenger app
const bookingChannel = supabase
  .channel('passenger-bookings')
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'booking_requests',
    filter: 'booking_source=eq.passenger_app',
  }, (payload) => {
    const newBooking = payload.new;
    console.log('🔔 New passenger booking:', newBooking);
    
    // Convert to internal format and trigger notification
    this.notifyBookingEvent({
      type: 'booking_created',
      bookingId: newBooking.id,
      passengerId: newBooking.id,
      timestamp: newBooking.created_at,
    });

    // Trigger driver notification
    this.notifyNotification({
      id: crypto.randomUUID(),
      type: 'booking_request',
      title: 'New Ride Request',
      message: `${newBooking.customer_name} → ${newBooking.dropoff_address}`,
      bookingId: newBooking.id,
      priority: 'high',
      createdAt: new Date().toISOString(),
    });
  })
  .subscribe();
```

### 2.3 Driver accepts → update booking status

When driver accepts in the dispatch app, update `booking_requests`:

```typescript
await supabase
  .from('booking_requests')
  .update({
    status: 'accepted',
    assigned_driver_id: currentDriverId,
    assigned_at: new Date().toISOString(),
  })
  .eq('id', bookingId);
```

This triggers the Realtime subscription on the passenger side (Phase 1.3), and the passenger sees "Driver assigned."

### 2.4 Continue the existing trip flow

The dispatch app already handles the full trip lifecycle:
- `accepted` → `driver_arriving` → `driver_arrived` → `trip_started` → `trip_completed`

Each status update automatically propagates to the passenger via Realtime.

---

## Phase 3: Create `passenger_profiles` record from passenger app

### 3.1 Upsert passenger profile on first booking

When the passenger first books through the app, create/update their profile in the dispatch DB so the driver has their info:

```js
// On first booking or profile change
await dispatchDb
  .from('passenger_profiles')
  .upsert({
    full_name: passengerName,
    phone: passengerPhone,
    email: passengerEmail,
    payment_preference: 'card',
    registration_source: 'passenger_app',
    is_active: true,
  }, { onConflict: 'phone' })  // use phone as unique identifier
  .select()
  .single();
```

> **Note:** The `passenger_profiles` table already exists in TaxiHelper DB. May need to add a unique constraint on `phone` if not present.

---

## Phase 4: Show driver location to passenger

### 4.1 Passenger subscribes to driver location

After a driver is assigned, the passenger app subscribes to the driver's location from `driver_availability`:

```js
function subscribeToDriverLocation(driverId) {
  dispatchDb
    .channel('driver-location-' + driverId)
    .on('postgres_changes', {
      event: 'UPDATE',
      schema: 'public',
      table: 'driver_availability',
      filter: 'user_id=eq.' + driverId,
    }, (payload) => {
      updateDriverMarkerOnMap(
        payload.new.current_latitude,
        payload.new.current_longitude
      );
    })
    .subscribe();
}
```

### 4.2 Enable Realtime on `driver_availability`

```sql
ALTER PUBLICATION supabase_realtime ADD TABLE public.driver_availability;
```

---

## Field Mapping Reference

### Passenger App → Dispatch DB (`booking_requests`)

| Passenger App field     | booking_requests column       |
|------------------------|-------------------------------|
| pickup name/address     | pickup_address                |
| pickup lat/lng          | pickup_latitude/longitude     |
| dropoff name/address    | dropoff_address               |
| dropoff lat/lng         | dropoff_latitude/longitude    |
| estimated fare (NOK)    | estimated_fare                |
| duration estimate       | estimated_duration_minutes    |
| payment type            | payment_method                |
| ride type               | trip_type                     |
| passenger name          | customer_name                 |
| passenger phone         | customer_phone                |
| —                       | booking_source = 'passenger_app' |
| —                       | status = 'pending'            |

### Dispatch DB → Passenger App (status mapping)

| booking_requests.status | Passenger UI state    |
|------------------------|-----------------------|
| pending                | "Finding driver..."   |
| accepted / assigned    | "Driver assigned"     |
| driver_arriving        | "Driver on the way"   |
| driver_arrived         | "Driver has arrived"  |
| trip_started           | "Trip in progress"    |
| trip_completed         | "Trip complete"       |
| cancelled              | "Trip cancelled"      |
| expired                | "No drivers available"|

---

## SQL Migrations Needed (run on TaxiHelper Supabase)

```sql
-- 1. Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.booking_requests;
ALTER PUBLICATION supabase_realtime ADD TABLE public.driver_availability;

-- 2. RLS policies for passenger app (anon key access)
ALTER TABLE public.booking_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "passenger_app_insert"
  ON public.booking_requests FOR INSERT
  WITH CHECK (booking_source = 'passenger_app');

CREATE POLICY "passenger_app_read_own"
  ON public.booking_requests FOR SELECT
  USING (true);

-- 3. Unique constraint on passenger_profiles.phone (if not exists)
ALTER TABLE public.passenger_profiles
  ADD CONSTRAINT passenger_profiles_phone_unique UNIQUE (phone);

-- 4. RLS for passenger_profiles upsert
CREATE POLICY "passenger_app_upsert_profile"
  ON public.passenger_profiles FOR INSERT
  WITH CHECK (registration_source = 'passenger_app');

CREATE POLICY "passenger_app_update_profile"
  ON public.passenger_profiles FOR UPDATE
  USING (registration_source = 'passenger_app');
```

---

## Implementation Order

1. **Run SQL migrations** on TaxiHelper Supabase (realtime + RLS)
2. **Passenger App:** Add dispatch Supabase client + config
3. **Passenger App:** Replace `request_ride` RPC with `booking_requests` insert
4. **Passenger App:** Add Realtime subscription for booking status
5. **Dispatch App:** Add Supabase Realtime listener for new `passenger_app` bookings
6. **Test end-to-end:** Passenger books → driver sees popup → driver accepts → passenger sees update
7. **Passenger App:** Add driver location tracking (Phase 4)
8. **Passenger App:** Add passenger_profiles upsert (Phase 3)

---

## What stays on the Passenger DB (for now)

- `auth.users` — passenger authentication
- `profiles` — passenger profile details
- `saved_places` — home, work, airport
- `recent_searches` — search history
- `ride_types` — fare pricing config
- `promo_codes` — discount codes
- `payment_methods` — saved cards

These can be migrated later if you want to consolidate into one DB.

---

## Testing Checklist

- [ ] Passenger can book a ride → row appears in TaxiHelper `booking_requests`
- [ ] Driver (online in TaxiHelper) receives real-time notification
- [ ] Driver accepts → passenger sees "Driver assigned" with driver info
- [ ] Driver status changes propagate: arriving → arrived → trip started → completed
- [ ] Driver location updates show on passenger's map
- [ ] Booking from dispatch app (phone/street) still works as before
- [ ] No auth conflicts between the two Supabase clients
