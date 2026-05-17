---
id: AGENT-SV-001
title: simply-voice
status: ready
created: 2026-05-17
author: Anthony Coffey
reviewers: []
affected_repos: [simply-voice]
---

# Agent Brief: simply-voice

## Purpose

Text-to-speech SaaS. Authenticated users convert text to WAV audio via Google Cloud TTS, save clips to personal history, and pay (optionally) for a higher monthly character quota via Stripe. Single monolithic repo: React SPA + Firebase Cloud Functions + Firestore + Storage.

## Tech stack

| Layer | Tech |
|---|---|
| Frontend | Vite 6, React 18, TypeScript 5.5, Tailwind, shadcn/ui, React Router 6 |
| Auth | Firebase Auth (Google provider) |
| Database | Cloud Firestore |
| File storage | Firebase Storage |
| Backend API | Express on Firebase Cloud Functions v2 (Node 22, us-central1) |
| TTS engine | Google Cloud Text-to-Speech |
| Hosting | Firebase Hosting (Vite frameworks integration) |
| Payments | Stripe (Checkout, Customer Portal, webhooks) |
| Secrets | Google Cloud Secret Manager (via `firebase functions:secrets`) |
| Local dev mirror | Express server (`server/index.js`) on port 3000 |

GCP / Firebase project: **`simply-voice-452800`** (Blaze tier).

## Entry points

| File | Role |
|---|---|
| `src/main.tsx` | React root mount |
| `src/App.tsx` | Theme + ErrorBoundary + AuthProvider + Router |
| `src/lib/auth.tsx` | `<AuthProvider>` and `useAuth()` hook |
| `src/lib/firebase.ts` | Firebase web SDK init |
| `src/lib/speechUtils.ts` | `fetch` wrappers for `/api/**` and Stripe |
| `src/lib/hooks/useFirebase.ts` | `useProfile`, `useTTSHistory`, `useSubscription`, `useFirebaseStorage` |
| `functions/index.js` | Express app, exports `ttsAPI` Cloud Function (Gen 2) |
| `functions/routes/getVoices.js` | `GET /api/tts/voices` |
| `functions/routes/synthesizeSpeech.js` | `POST /api/tts/synthesize` — quota check + TTS call |
| `functions/routes/stripe/stripeWebhook.js` | `POST /api/stripe/webhook` — signature verification + subscription lifecycle |
| `server/index.js` | Local dev mirror of `ttsAPI` (no auth, no quota) |

## Public interface

All `/api/**` endpoints require `Authorization: Bearer <Firebase ID token>` **except** the Stripe webhook, which authenticates via Stripe signature.

| Method | Path | Body / params | Returns |
|---|---|---|---|
| GET | `/api/tts/voices` | — | `Voice[]` (top 30 en-US voices, ranked by tier) |
| POST | `/api/tts/synthesize` | `{ text, voiceId, lang, speakingRate, pitch }` | `audio/wav` (LINEAR16) or `429` JSON on quota exceeded |
| POST | `/api/stripe/create-checkout-session` | — | `{ url }` — redirect to Stripe Checkout |
| POST | `/api/stripe/create-portal-session` | — | `{ url }` — redirect to Stripe Customer Portal |
| POST | `/api/stripe/webhook` | Stripe event payload | `{ received: true }` |

Full request/response shapes: see [`../deep-dives/api-integrations.md`](../deep-dives/api-integrations.md).

## Dependencies

### Inbound (who calls us)

- Browser SPA (the React app served from Firebase Hosting)
- Stripe (webhook events)

### Outbound (what we call)

- Google Cloud Text-to-Speech (via `@google-cloud/text-to-speech` SDK, ADC auth)
- Stripe (via `stripe` SDK)
- Firebase Auth, Firestore, Storage (via `firebase-admin` SDK in functions, web SDK in client)

## Data ownership

| Collection / bucket | Writer | Reader | Notes |
|---|---|---|---|
| `profiles/{uid}` | Client (web SDK) and Cloud Function | Owner only | Web SDK writes profile edits; function updates `chars_this_month` after each synthesis |
| `tts_history/{autoId}` | Client (web SDK) | Owner only | Composite index on `(user_id ASC, created_at DESC)` |
| `subscriptions/{uid}` | Cloud Function only (Admin SDK) | Owner read-only | No client write rule — Stripe webhook is the source of truth |
| `tts-files/{uid}/*.wav` | Client (web SDK) | Owner only | Path prefix enforces ownership |

Document shapes are documented in [`../deep-dives/features.md`](../deep-dives/features.md) and [`../repos/simply-voice.md`](../repos/simply-voice.md).

## Configuration

### Frontend `.env` (gitignored, public Firebase web SDK config — safe to expose)

| Variable | Source | Purpose |
|---|---|---|
| `VITE_FIREBASE_API_KEY` | Firebase console | Web SDK init |
| `VITE_FIREBASE_AUTH_DOMAIN` | Firebase console | OAuth redirect domain |
| `VITE_FIREBASE_PROJECT_ID` | Firebase console | Project ID (`simply-voice-452800`) |
| `VITE_FIREBASE_STORAGE_BUCKET` | Firebase console | Storage bucket |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | Firebase console | FCM (unused currently) |
| `VITE_FIREBASE_APP_ID` | Firebase console | App identifier |

### Cloud Function secrets (Google Cloud Secret Manager)

Set via `firebase functions:secrets:set <NAME>`. Injected into `process.env.*` at runtime.

| Variable | Purpose |
|---|---|
| `STRIPE_SECRET_KEY` | Stripe server-side API calls |
| `STRIPE_WEBHOOK_SECRET` | Verify Stripe webhook signatures |
| `STRIPE_PRO_PRICE_ID` | Stripe Price ID for the Pro plan |
| `FRONTEND_URL` *(optional)* | Override redirect base URL (defaults to `https://simply-voice-452800.web.app`) |

### Local development

Google Cloud TTS uses Application Default Credentials. Run `gcloud auth application-default login` once.

## Where to look for X

| If you need to … | Look in |
|---|---|
| Add a new API endpoint | `functions/index.js` + new file under `functions/routes/` |
| Change quota limits | `functions/routes/synthesizeSpeech.js` (constants at top) |
| Change voice ranking / filtering | `functions/routes/getVoices.js` |
| Handle a new Stripe event | `functions/routes/stripe/stripeWebhook.js` |
| Tweak Firestore access rules | `firestore.rules` |
| Tweak Storage access rules | `storage.rules` |
| Add a new page / route | `src/App.tsx` + `src/pages/` |
| Read/write user data from the client | `src/lib/hooks/useFirebase.ts` |
| Call `/api/**` from the client | `src/lib/speechUtils.ts` |
| Adjust the dev API proxy | `vite.config.ts` |
| Adjust hosting rewrites | `firebase.json` |

## Operational notes

- **Region:** `us-central1` (Hosting + Functions)
- **Deploy command:** `npm run deploy` (or `:hosting` / `:functions` / `:rules` for subsets)
- **Logs:** `npm run logs` (tails Cloud Function logs)
- **Health check:** none formal — verify via the live site at https://simply-voice-452800.web.app
- **Emulators:** `npm run emulate`

## Known gotchas

- **Stripe webhook route must be registered before the JSON-parsing `authenticate` middleware.** Past incident: the webhook returned 401 because auth ran first. See `functions/index.js` ordering.
- **Raw body capture for Stripe.** Cloud Functions Gen 2 (Cloud Run) consumes the request body before `express.raw()` can buffer it on a per-route basis. The fix is the `express.json({ verify })` callback in `functions/index.js` that saves `req.rawBody`.
- **Local dev server enforces neither auth nor quota.** Anything tested locally must also be tested against the deployed Cloud Function before shipping.
- **Subscriptions are backend-write only.** Never attempt to write `subscriptions/{uid}` from the client — Firestore rules will reject it. The Stripe webhook is the only writer.
- **`VITE_FIREBASE_*` values are public by design.** Do not treat them as secrets. Data protection comes from Firebase rules + ID-token auth, not from hiding these keys.
- **TTS hard limit per request: 4,800 characters.** Enforced in `synthesizeSpeech.js` with a 400 response — separate from the monthly quota check.
