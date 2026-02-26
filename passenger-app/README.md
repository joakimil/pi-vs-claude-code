# RideGo Passenger App

Oslo-based ride-hailing passenger UI — single-page HTML/CSS/JS app with a Supabase backend.

Deployed at: **https://passenger-app-lovat.vercel.app**

---

## ⚠️ Remove Before Production

The following dev/demo shortcuts are baked into `index.html` and **must be removed** before a real launch:

1. **Demo driver fallback** (~line 3228) — When no real drivers are found nearby, a fake driver (Mohamed K., Toyota Camry) is auto-assigned so you can test the full ride flow. Search for `Demo mode: assigning test driver` in `index.html`.

2. **"Complete Trip (Demo)" button** (~line 1946) — A visible button on the trip screen that instantly completes the ride. Search for `complete-trip-btn`.

3. **Client-side driver matching** — The passenger app itself finds and assigns drivers (calls `find_nearby_drivers` then updates the `rides` table). In production, this should be a server-side process where drivers accept/reject ride requests.

4. **Hardcoded Supabase fallback credentials** (~line 2344–2345) — The anon key is embedded directly in the HTML as a fallback. For production, credentials should only come from `config.js` (or env vars), and the fallback should be removed.

5. **No rate limiting** — Ride requests, auth attempts, and chat messages have no throttling.

6. **Chat is one-sided** — Passenger can send messages, but there's no driver app to respond yet. Messages are stored in `ride_messages` table via Supabase realtime.

---

## Prerequisites

- **Node.js** (for npm) — use `npm install` and `npm run dev`.
- **Bun** is optional. If you see `command not found: bun`, use npm instead, or [install Bun](https://bun.sh): `curl -fsSL https://bun.sh/install | bash` (then restart the terminal).
- **Docker** — required for local Supabase.

## Install

From the `passenger-app` directory:

```bash
npm install
```

## Development server

Start Supabase (local Postgres + Studio) and the static HTTP server:

```bash
npm run dev
```

This runs:

1. **Supabase** — local backend (Docker required). Studio: [http://localhost:54323](http://localhost:54323)
2. **HTTP server** — app at [http://localhost:3001](http://localhost:3001)

Stop Supabase when done:

```bash
npm run db:stop
```

### Port conflicts

If port 3000/3001 is in use:

- Start Supabase first (`npm run db:start`), then `npm run serve` in another terminal.
- Or free the port: `lsof -i :3000` then `kill <PID>`.

## Build

No build step. The app is vanilla HTML/CSS/JS; `index.html` is the single entry point.

Deploy as static files to any host. Currently deployed on Vercel (see `vercel.json` for rewrites and headers).

## Database

| Command             | Description                              |
|---------------------|------------------------------------------|
| `npm run db:start`  | Start Supabase (Docker)                  |
| `npm run db:stop`   | Stop Supabase                            |
| `npm run db:reset`  | Reset DB and re-run migrations + seed    |
| `npm run db:studio` | Open Supabase Studio (after start)       |

### Seed data

`supabase/seed.sql` populates:
- 3 ride types (Economy, Comfort, XL)
- 5 drivers around central Oslo (4 online, 1 offline)
- 5 vehicles
- Driver locations (needed for `find_nearby_drivers`)
- 3 promo codes (`WELCOME50`, `OSLO2025`, `FREERIDE`)

## Config

`config.js` sets the Supabase URL and anon key:

```js
window.__RIDEGO_SUPABASE_URL = 'https://your-project.supabase.co';
window.__RIDEGO_SUPABASE_KEY = 'your-anon-key';
```

For local dev, these default to the values in `index.html`.

## Architecture

```
index.html          ← entire app (HTML + CSS + JS, ~3800 lines)
config.js           ← runtime Supabase config
vercel.json         ← deployment config (rewrites, headers)
supabase/
  migrations/       ← 17 migration files (schema, RLS, functions, realtime)
  seed.sql          ← test data
```

### Key Supabase functions (server-side via RPC)

| Function                      | Purpose                                |
|-------------------------------|----------------------------------------|
| `request_ride`                | Create a ride, calculate fare estimate |
| `find_nearby_drivers_latlng`  | Find available drivers within radius   |
| `estimate_fare_latlng`        | Get fare estimate for a route          |
| `cancel_ride`                 | Cancel an active ride                  |
| `complete_ride`               | Mark ride as completed                 |
| `rate_ride`                   | Submit rating + tip for completed ride |

## Future Plans

See `planforpassengers.md` for the PWA / native app plan (push notifications, offline support, install prompt).
