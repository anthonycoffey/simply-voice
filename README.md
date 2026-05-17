# Simply Voice

Text-to-speech SaaS powered by Google Cloud TTS. Authenticated users convert text to WAV audio, save clips to personal history, and manage a monthly character quota. Paid subscribers unlock 10× the free limit via Stripe.

**Live:** https://simply-voice-452800.web.app

---

## Tech stack

| Layer        | Tech |
|---|---|
| Frontend     | Vite 6, React 18, TypeScript, Tailwind, shadcn/ui, React Router 6 |
| Auth         | Firebase Auth (Google provider) |
| Database     | Cloud Firestore |
| File storage | Firebase Storage |
| Backend API  | Express on Firebase Cloud Functions v2 (Node 22) |
| TTS engine   | Google Cloud Text-to-Speech |
| Hosting      | Firebase Hosting (Vite frameworks integration) |
| Payments     | Stripe (Checkout, Customer Portal, webhooks) |
| Secrets      | Google Cloud Secret Manager (via `firebase functions:secrets`) |

GCP / Firebase project: **`simply-voice-452800`**

---

## Architecture

```
                  Browser (Vite SPA)
                         |
                         |  signInWithPopup (Google)
                         v
                  Firebase Auth  ─────────────────────┐
                         │                             │
                         │  ID token on every          │
                         │  /api/** request            │
                         v                             │
            ┌─────────────────────┐                   │
            │   Cloud Firestore   │  rules enforce ownership by uid
            │                     │
            │  profiles/{uid}     │  usage tracking (chars_this_month)
            │  tts_history/{id}   │  saved audio clips
            │  subscriptions/{uid}│  Stripe tier + status (backend-write only)
            └─────────────────────┘
                         ^
                         │  upload / download / delete blobs
                         v
            ┌─────────────────────┐
            │  Firebase Storage   │  rules enforce {uid} path prefix
            │  tts-files/{uid}/   │
            └─────────────────────┘

                  Browser (Vite SPA)
                         │
                         │  Bearer <Firebase ID token>
                         v
            ┌─────────────────────┐
            │  Firebase Hosting   │  rewrites /api/** → ttsAPI function
            └─────────────────────┘
                         │
                         v
            ┌─────────────────────────────────────────┐
            │  Cloud Function: ttsAPI (us-central1)   │
            │  Express app                            │
            │                                         │
            │  GET  /api/tts/voices                   │
            │  POST /api/tts/synthesize   ──► quota check → Google TTS
            │  POST /api/stripe/create-checkout-session
            │  POST /api/stripe/create-portal-session
            │  POST /api/stripe/webhook   ◄── Stripe events
            └─────────────────────────────────────────┘
                         │
                         v
            ┌─────────────────────┐
            │  Google Cloud TTS   │
            └─────────────────────┘

                  Stripe Dashboard
                         │
                         │  checkout.session.completed
                         │  customer.subscription.updated
                         │  customer.subscription.deleted
                         v
            ttsAPI /api/stripe/webhook
                         │
                         v
            Firestore subscriptions/{uid}   (Admin SDK write)
```

### Request flow: generate and save a clip

1. User signs in via Google popup → `AuthProvider` exposes the `User` to the tree.
2. `VoiceSelector` calls `GET /api/tts/voices` (with ID token) → top 30 English voices ranked by quality.
3. User enters text + picks voice → `TextToSpeech` calls `POST /api/tts/synthesize`.
4. Backend reads `subscriptions/{uid}` and `profiles/{uid}` in parallel, checks monthly quota, returns `429` if over limit, otherwise calls Google TTS and increments `chars_this_month`.
5. User clicks **Save to History**: blob uploaded to Firebase Storage, `tts_history` row created with `audio_url` + `audio_path`.
6. `useSubscription` real-time listener updates the compact `UsageBar` in the dashboard header immediately.

### Stripe subscription flow

1. User clicks **Upgrade to Pro** on `/pricing` → `createCheckoutSession` → redirected to Stripe Checkout.
2. On success, Stripe fires `checkout.session.completed` to the webhook endpoint.
3. Webhook verifies signature, writes `subscriptions/{uid}` with `{ tier: 'pro', status: 'active', stripeCustomerId, stripeSubscriptionId }`.
4. `useSubscription` listener picks up the change; UI reflects Pro tier instantly.
5. Cancellation fires `customer.subscription.deleted` → resets to `{ tier: 'free' }`.

---

## Subscription tiers

| | Free | Pro |
|---|---|---|
| Monthly character limit | 10,000 | 100,000 |
| Price | $0 | $9.99 / month |
| All AI voices | ✓ | ✓ |
| Audio history | ✓ | ✓ |
| Download as WAV | ✓ | ✓ |
| Priority support | — | ✓ |

---

## Project structure

```
.
├── firebase.json              Hosting + Functions + Firestore + Storage config
├── .firebaserc                Default project: simply-voice-452800
├── firestore.rules            Per-uid access; subscriptions read-only for owner
├── firestore.indexes.json     Composite index: tts_history (user_id, created_at)
├── storage.rules              Per-uid Storage access under tts-files/{uid}/**
├── vite.config.ts             Dev proxy: /api → http://localhost:3000
├── .env                       Firebase web SDK config (gitignored)
│
├── src/
│   ├── main.tsx
│   ├── App.tsx                ThemeProvider + ErrorBoundary + AuthProvider + Router
│   │
│   ├── lib/
│   │   ├── firebase.ts        SDK init: auth, db, storage, googleProvider
│   │   ├── auth.tsx           <AuthProvider> + useAuth()
│   │   ├── speechUtils.ts     fetch wrappers + ApiError class + Stripe helpers
│   │   ├── utils.ts           cn() helper
│   │   └── hooks/
│   │       └── useFirebase.ts useProfile, useTTSHistory, useFirebaseStorage,
│   │                          useSubscription
│   │
│   ├── pages/
│   │   ├── Index.tsx          Landing page
│   │   ├── Login.tsx          Google sign-in
│   │   ├── Dashboard.tsx      Tabs: Text-to-Speech / History
│   │   ├── Pricing.tsx        Free vs Pro plan cards
│   │   ├── Account.tsx        Profile, plan badge, usage stats, Stripe portal
│   │   └── NotFound.tsx
│   │
│   └── components/
│       ├── ProtectedRoute.tsx
│       ├── TextToSpeech.tsx   Char counter, rate/pitch sliders, 429 upgrade prompt
│       ├── TTSHistory.tsx     History list with AudioPlayer per row
│       ├── VoiceSelector.tsx  Voice dropdown
│       ├── AudioPlayer.tsx    Single-active-player (AbortError-safe)
│       ├── UsageBar.tsx       Compact + full usage bar (chars used / limit)
│       ├── DarkModeToggle.tsx Sun/moon toggle (next-themes)
│       ├── ErrorBoundary.tsx  Catches render errors, shows reload screen
│       └── ui/                shadcn/ui primitives
│
├── functions/                 Firebase Cloud Functions (deployed backend)
│   ├── index.js               Express app, exports ttsAPI onRequest (Gen 2)
│   └── routes/
│       ├── getVoices.js
│       ├── synthesizeSpeech.js  Quota check + usage increment
│       └── stripe/
│           ├── createCheckoutSession.js
│           ├── createPortalSession.js
│           └── stripeWebhook.js  Handles subscription lifecycle events
│
└── server/                    Local-only dev mirror of ttsAPI (no auth / Stripe)
    ├── index.js
    └── services/tts-service.js
```

---

## Data model

### Firestore

**`profiles/{uid}`** — created on first sign-in, updated after each synthesis.

```ts
{
  id:              string          // == auth uid
  email:           string
  first_name:      string | null
  last_name:       string | null
  chars_this_month: number         // running total for current period
  period_month:    string          // "YYYY-MM" — resets on new month
}
```

**`tts_history/{autoId}`** — one row per saved clip.

```ts
{
  user_id:      string   // owner uid
  text_content: string
  voice_id:     string
  created_at:   string   // ISO 8601
  audio_url:    string | null  // long-lived Firebase Storage download URL
  audio_path:   string | null  // canonical path for delete / refresh
}
```

Composite index: `(user_id ASC, created_at DESC)`.

**`subscriptions/{uid}`** — written exclusively by the backend (Admin SDK).

```ts
{
  tier:                 'free' | 'pro'
  status:               string         // 'active' | 'canceled' | etc.
  stripeCustomerId:     string
  stripeSubscriptionId: string
  currentPeriodEnd:     string         // ISO 8601
}
```

### Storage

```
gs://simply-voice-452800.firebasestorage.app/
└── tts-files/
    └── {uid}/
        └── {timestamp}_{cleanName}.wav
```

---

## Security rules

**Firestore** — owner-only access. `subscriptions/{uid}` is read-only for the owner; all writes come from the backend Admin SDK (which bypasses rules).

**Storage** — read/write under `tts-files/{userId}/**` requires `request.auth.uid == userId`.

**API** — every `/api/**` request requires a valid Firebase ID token in `Authorization: Bearer <token>`. The `authenticate` middleware rejects unauthenticated requests with `401`.

The `VITE_FIREBASE_*` values in `.env` are public web-client credentials by design; rules + token auth are what protect the data and the TTS quota.

---

## Local development

### Prerequisites

- Node 22, npm
- `firebase-tools` (`npm i -g firebase-tools`), logged in via `firebase login`
- `gcloud` CLI with ADC for local TTS calls: `gcloud auth application-default login`

### Setup

```bash
npm run install:all   # installs root + functions/ + server/ in one shot
cp .env.example .env  # then fill in your Firebase web SDK values
```

Or to re-fetch SDK config from Firebase:

```bash
firebase apps:sdkconfig WEB
```

### Run

```bash
npm run dev
```

Starts two processes in parallel:

| Process | Port | Purpose |
|---|---|---|
| `vite` | 8080 | React SPA with HMR |
| `node server/index.js` | 3000 | Local TTS Express server (dev mirror of ttsAPI) |

Vite proxies `/api/**` → `http://localhost:3000`, so the frontend uses the local server in dev and the deployed Cloud Function in production with zero code change.

> **Note:** The local dev server does not enforce Firebase auth or Stripe quota — those only run in the deployed Cloud Function.

### Environment variables

`.env` (gitignored):

```
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=simply-voice-452800.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=simply-voice-452800
VITE_FIREBASE_STORAGE_BUCKET=simply-voice-452800.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
```

### Cloud Function secrets (production only)

Set once via the Firebase CLI — stored in Google Cloud Secret Manager:

```bash
firebase functions:secrets:set STRIPE_SECRET_KEY
firebase functions:secrets:set STRIPE_WEBHOOK_SECRET
firebase functions:secrets:set STRIPE_PRO_PRICE_ID
```

---

## npm scripts

| Script | Description |
|---|---|
| `npm run dev` | Vite + local Express server (parallel) |
| `npm run build` | Production build |
| `npm run preview` | Preview production build locally |
| `npm run lint` | ESLint |
| `npm run deploy` | Deploy everything (hosting + functions + rules) |
| `npm run deploy:hosting` | Hosting only |
| `npm run deploy:functions` | Cloud Functions only |
| `npm run deploy:rules` | Firestore rules + Storage rules only |
| `npm run logs` | Tail live Cloud Function logs |
| `npm run emulate` | Start Firebase emulators |
| `npm run install:functions` | `npm install` inside `functions/` |
| `npm run install:server` | `npm install` inside `server/` |
| `npm run install:all` | Install all three workspaces |

---

## Backend API

All endpoints require `Authorization: Bearer <Firebase ID token>` except the Stripe webhook (which uses Stripe signature verification instead).

### `GET /api/tts/voices`

Returns up to 30 English voices ranked by quality tier (Neural2 > Chirp3-HD > Chirp-HD > Studio > Wavenet > Standard).

```json
[
  {
    "id": "en-US-Neural2-D",
    "name": "Neural2-D",
    "lang": "en-US",
    "ssmlGender": "MALE",
    "naturalSampleRateHertz": 24000,
    "type": "Neural2",
    "tier": 1
  }
]
```

### `POST /api/tts/synthesize`

Request body:

```json
{
  "text": "Hello world",
  "voiceId": "en-US-Neural2-D",
  "lang": "en-US",
  "speakingRate": 1.0,
  "pitch": 0.0
}
```

- `text` max 4,800 characters per request.
- Returns `audio/wav` (LINEAR16) on success.
- Returns `429` with JSON body if monthly quota exceeded:

```json
{
  "error": "Monthly character limit reached",
  "chars_used": 10000,
  "chars_requested": 500,
  "limit": 10000,
  "tier": "free"
}
```

### `POST /api/stripe/create-checkout-session`

Creates a Stripe Checkout session for the Pro plan. Returns `{ url }`. Client redirects to the URL.

### `POST /api/stripe/create-portal-session`

Creates a Stripe Customer Portal session for the authenticated user. Returns `{ url }`.

### `POST /api/stripe/webhook`

Stripe webhook endpoint — uses raw body + `STRIPE_WEBHOOK_SECRET` for signature verification. Handles:

- `checkout.session.completed` → writes `subscriptions/{uid}` as Pro
- `customer.subscription.updated` → syncs status/tier
- `customer.subscription.deleted` → resets to Free

---

## Deployment

`.firebaserc` sets `simply-voice-452800` as the default project, so no `--project` flag is needed.

```bash
npm run deploy            # everything
npm run deploy:hosting    # frontend only
npm run deploy:functions  # backend only
npm run deploy:rules      # Firestore + Storage rules only
```

The project must be on the **Blaze (pay-as-you-go)** plan — Firebase Storage and Cloud Functions are not available on Spark.
