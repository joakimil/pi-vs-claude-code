# RideGo Passenger App

Oslo-based ride-hailing passenger UI — single-page HTML/CSS/JS app with a Supabase backend.

## Prerequisites

- **Node.js** (for npm) — use `npm install` and `npm run dev`.
- **Bun** is optional. If you see `command not found: bun`, use npm instead, or [install Bun](https://bun.sh): `curl -fsSL https://bun.sh/install | bash` (then restart the terminal).
- **Docker** — required for local Supabase.

## Install
Shortcut:
cd passenger-app
npm run dev
From the `passenger-app` directory:

```bash
npm install
```

With Bun (if installed):

```bash
bun install
```

## Development server

Start Supabase (local Postgres + Studio) and the static HTTP server:

```bash
npm run dev
```

With Bun: `bun run dev`.

This runs:

1. **Supabase** — local backend (Docker required). Studio: [http://localhost:54323](http://localhost:54323) (or [http://127.0.0.1:54323](http://127.0.0.1:54323))
2. **HTTP server** — app at [http://localhost:3001](http://localhost:3001)

**Open in browser:** [http://localhost:3001](http://localhost:3001)

Stop Supabase when done:

```bash
npm run db:stop
```

### Port 3000 already in use

If you see `OSError: [Errno 48] Address already in use`, something else is using port 3000. Either:

- **Use another port** — start Supabase first (`npm run db:start`), then in another terminal run:  
  `npm run serve:alt` (serves on port 3001). Open [http://localhost:3001](http://localhost:3001).
- **Free port 3000** — find and stop the process, e.g. `lsof -i :3000` then `kill <PID>`.

## Build

There is no build step. The app is vanilla HTML/CSS/JS; `index.html` is the entry point.

For production:

- Serve the directory as static files (e.g. `index.html`, `config.js`), or
- Deploy to a static host (e.g. Vercel; see `vercel.json` for rewrites and headers).

Example local “production” serve:

```bash
python3 -m http.server 3000
```

(Use your own port if needed.)

## Database

| Command           | Description                    |
|-------------------|--------------------------------|
| `bun run db:start`  | Start Supabase (Docker)        |
| `bun run db:stop`   | Stop Supabase                  |
| `bun run db:reset`  | Reset DB and re-run migrations + seed |
| `bun run db:studio` | Open Supabase Studio (after start) |

## Config

Copy or create `config.js` to override Supabase URL/key (see repo or env). Defaults are in `index.html` for local/dev.
