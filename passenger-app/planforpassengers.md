# Plan: Hosting RideGo as a Native-Like App for Passengers

## Current State

- Single `index.html` file (~3800 lines), vanilla HTML/CSS/JS
- Supabase backend (hosted)
- Deployed as static site on Vercel
- No service worker, no push notifications, no offline support
- Uses geolocation and vibration APIs already
- Has a "Push Notifications" toggle in settings, but it's a no-op (purely local state)

## The Problem

A plain webpage **cannot**:
- Send push notifications when the app is closed/backgrounded
- Run background tasks (e.g. tracking ride status)
- Feel native (home screen icon, splash screen, no browser chrome)
- Work offline or in flaky network conditions

## Options Evaluated

### Option A: PWA (Progressive Web App) ✅ Recommended
**Effort: Low-Medium | Timeline: 1-2 days**

Turn the existing single HTML file into a PWA by adding:

1. **Web App Manifest** (`manifest.json`)
   - App name, icons (192px, 512px), theme color, display: `standalone`
   - iOS: add `apple-touch-icon`, `apple-mobile-web-app-capable` meta tags

2. **Service Worker** (`sw.js`)
   - Cache the HTML, config.js, and any assets for offline shell
   - Handle push notification events (`push`, `notificationclick`)
   - Background sync for failed requests

3. **Push Notifications via Web Push API**
   - Use VAPID keys (generate a keypair, store public key in app, private key in Supabase Edge Function)
   - On notification opt-in → `PushManager.subscribe()` → save subscription to Supabase `push_subscriptions` table
   - Supabase Edge Function or DB webhook sends push via Web Push protocol when ride status changes (driver assigned, arriving, etc.)

4. **"Add to Home Screen" prompt**
   - Listen for `beforeinstallprompt` event
   - Show a custom banner/modal encouraging install after first ride booking
   - On iOS (no prompt event): show instruction overlay ("Tap Share → Add to Home Screen")

**Pros:**
- Zero app store friction — users get it instantly from a link
- Single codebase stays as-is (HTML/CSS/JS)
- Vercel hosting works perfectly, no changes needed
- Push notifications work on Android (Chrome, Edge, Firefox) and macOS Safari
- iOS 16.4+ supports web push for home-screen PWAs

**Cons:**
- iOS web push requires the PWA to be added to home screen first
- No access to some native APIs (Bluetooth, NFC, advanced background location)
- iOS PWA experience is slightly less polished than native

### Option B: Capacitor (Wrap as Native App)
**Effort: Medium | Timeline: 3-5 days**

Use [Capacitor](https://capacitorjs.com/) to wrap the HTML in a native WebView:

1. `npm init @capacitor/app` → configure for iOS + Android
2. Copy `index.html` into `www/` (Capacitor's web root)
3. Add Capacitor plugins:
   - `@capacitor/push-notifications` — native APNs/FCM push
   - `@capacitor/geolocation` — native GPS (already using web API, but native is more reliable)
   - `@capacitor/haptics` — native haptic feedback
   - `@capacitor/splash-screen` — launch screen
   - `@capacitor/local-notifications` — schedule local reminders

4. Build & publish:
   - iOS: Xcode → TestFlight → App Store
   - Android: Android Studio → Play Store / direct APK

**Pros:**
- Full native push notifications (reliable on all iOS versions)
- Access to all native APIs
- App Store presence can build trust

**Cons:**
- Requires Apple Developer ($99/yr) and Google Play ($25 one-time) accounts
- App Store review process (days/weeks)
- Must maintain native project configs, signing, etc.
- Users must download from store — higher friction

### Option C: Expo / React Native Rewrite
**Effort: High | Timeline: 2-4 weeks**

Full rewrite in React Native. **Not recommended** — the app works well as vanilla HTML/JS. A rewrite is unjustified overhead for the current scope.

---

## Recommendation: PWA (Option A) → Capacitor Later (Option B)

Start with PWA. It's the fastest path to native-like experience with push notifications, and requires minimal changes to the existing codebase. If iOS push limitations become a real problem (most passengers are on iPhone and refuse to add to home screen), then wrap with Capacitor.

---

## PWA Implementation Plan

### Step 1: Manifest & Icons
- Create `manifest.json` with app metadata
- Generate icon set (192x192, 512x512, maskable) from the RideGo logo/branding
- Add `<link rel="manifest">` and iOS meta tags to `index.html`

### Step 2: Service Worker
- Create `sw.js` in root
- Cache strategy: **Network-first** for API calls, **Cache-first** for app shell (HTML, config.js)
- Register SW from `index.html` on load
- Handle `install`, `activate`, `fetch`, `push`, `notificationclick` events

### Step 3: Push Notifications
- Generate VAPID key pair (`web-push generate-vapid-keys`)
- Add public VAPID key to app config
- Store private key as Supabase secret / env var
- New Supabase table: `push_subscriptions (id, user_id, subscription_json, created_at)`
- In-app: request notification permission → subscribe → POST subscription to Supabase
- Supabase Edge Function: `send-push-notification` — triggered by ride status changes (via DB webhook or called from existing functions)
- Notification payloads: "Driver on the way", "Driver arriving", "Ride completed", etc.

### Step 4: Install Prompt UX
- Detect if app is already installed (`display-mode: standalone` media query)
- If not installed, show subtle banner after first interaction
- iOS-specific: detect Safari + show manual "Add to Home Screen" instructions
- Track install state in localStorage to avoid nagging

### Step 5: Offline Support (Light)
- Cache app shell so it loads without network
- Show "You're offline" state when API calls fail
- Queue ride requests / messages for retry when back online (optional, low priority)

### File Changes Summary
```
passenger-app/
├── index.html          ← add manifest link, iOS meta tags, SW registration
├── manifest.json       ← NEW
├── sw.js               ← NEW
├── icons/              ← NEW (app icons)
│   ├── icon-192.png
│   ├── icon-512.png
│   └── icon-maskable.png
├── config.js           ← add VAPID public key
├── vercel.json         ← add cache headers for SW
└── supabase/
    ├── migrations/
    │   └── XXXXXX_push_subscriptions.sql  ← NEW
    └── functions/
        └── send-push/  ← NEW edge function
```

### Deployment
- Still on Vercel, same as today
- Service worker served from root (`/sw.js`) — already handled by current static setup
- Add `Service-Worker-Allowed` header if needed
- HTTPS required (Vercel provides this)

### Testing Checklist
- [ ] PWA install prompt appears (Chrome DevTools → Application)
- [ ] App works from home screen without browser chrome
- [ ] Push notification received when ride status changes
- [ ] App loads when offline (cached shell)
- [ ] iOS Safari "Add to Home Screen" flow works
- [ ] Push works on Android Chrome
- [ ] Push works on iOS 16.4+ (home screen PWA)
