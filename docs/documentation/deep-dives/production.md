# Production Architecture

How Simply Voice runs in production — hosting, regions, the request lifecycle, and the data plane.

## At a glance

| | |
|---|---|
| GCP / Firebase project | `simply-voice-452800` |
| Billing plan | **Blaze** (pay-as-you-go) — required for Storage and Cloud Functions |
| Live URL | https://simply-voice-452800.web.app |
| Frontend hosting | Firebase Hosting (Vite frameworks integration) |
| Backend | Firebase Cloud Functions v2 (Gen 2 / Cloud Run) |
| Function name | `ttsAPI` |
| Region | `us-central1` (both Hosting backend and the function) |
| Runtime | Node 22 |
| Database | Cloud Firestore (multi-region) |
| File storage | Firebase Storage — bucket `gs://simply-voice-452800.firebasestorage.app/` |
| Auth provider | Firebase Auth (Google OAuth) |
| Payments | Stripe (live mode after promotion from test) |
| TTS provider | Google Cloud Text-to-Speech |

## Hosting & rewrites

`firebase.json` sets the project as a Vite frameworks-managed site. Hosting serves the static SPA build and rewrites all `/api/**` requests to the `ttsAPI` Cloud Function in `us-central1`:

```json
"hosting": {
  "frameworksBackend": { "region": "us-central1" },
  "rewrites": [
    { "source": "/api/**",
      "function": { "functionId": "ttsAPI", "region": "us-central1" } }
  ]
}
```

This means the SPA and the API live on the same origin (`simply-voice-452800.web.app`), which avoids CORS preflights and lets the browser send the Firebase ID token without any cross-origin friction.

## Request lifecycle — generate and save a clip

```
Browser (Vite SPA)
   │
   │  1. signInWithPopup(google) → Firebase Auth
   │  2. getIdToken() → Bearer token
   │
   ├──► GET /api/tts/voices             (with Bearer token)
   │       └─► Hosting rewrite ─► ttsAPI ─► getVoices ─► Google TTS listVoices()
   │           (returns top 30 en-US voices ranked by quality tier)
   │
   ├──► POST /api/tts/synthesize        (with Bearer token + JSON body)
   │       └─► Hosting rewrite ─► ttsAPI ─► authenticate (verifyIdToken)
   │            └─► synthesizeSpeech
   │                ├─► Firestore: read subscriptions/{uid} + profiles/{uid} in parallel
   │                ├─► quota check → 429 if exceeded
   │                ├─► Google TTS synthesizeSpeech() → LINEAR16 WAV
   │                ├─► Firestore: write profiles/{uid}.chars_this_month
   │                └─► respond with audio/wav
   │
   └──► (client-side) Save to history
           ├─► Firebase Storage upload to tts-files/{uid}/<timestamp>_<name>.wav
           └─► Firestore create tts_history/{autoId}
```

## Request lifecycle — Stripe subscription

```
Browser
   │  click "Upgrade to Pro" on /pricing
   ▼
POST /api/stripe/create-checkout-session  (with Bearer token)
   └─► ttsAPI → createCheckoutSession
       ├─► reads subscriptions/{uid} for existing stripeCustomerId
       ├─► creates Stripe customer if needed (metadata.firebaseUID = uid)
       └─► creates Checkout Session (mode: subscription, price: STRIPE_PRO_PRICE_ID)
   ◄── { url: "https://checkout.stripe.com/..." }
Browser redirects to Stripe Checkout
User completes payment
Stripe redirects to https://simply-voice-452800.web.app/account?upgraded=true

Stripe (async)
   │  checkout.session.completed
   ▼
POST /api/stripe/webhook   (no Firebase auth — Stripe signature verification)
   └─► ttsAPI → stripeWebhook
       ├─► constructEvent(rawBody, sig, STRIPE_WEBHOOK_SECRET)
       ├─► retrieve subscription
       └─► Firestore (Admin SDK): write subscriptions/{uid}
             { tier: 'pro', status, stripeCustomerId, stripeSubscriptionId,
               currentPeriodEnd }

(client) useSubscription real-time listener fires → UI flips to Pro tier
```

## Data plane

- **Firestore** stores user profiles (`profiles/{uid}`), saved TTS clips (`tts_history/{autoId}`), and Stripe subscription state (`subscriptions/{uid}` — backend-write only). Composite index `(user_id ASC, created_at DESC)` on `tts_history`.
- **Storage** holds the WAV files at `tts-files/{uid}/<timestamp>_<cleanName>.wav`. Path prefix enforces ownership via the Storage rule.
- **Cloud Function** holds no state of its own. Cold starts read from Firestore on every request.

Document shapes are in [`features.md`](features.md#data-model) and [`../agents/simply-voice.md`](../agents/simply-voice.md#data-ownership).

## Secrets & configuration

Production secrets live in **Google Cloud Secret Manager** and are wired into the function via Firebase's `defineSecret` API:

```js
const stripeSecretKey = defineSecret("STRIPE_SECRET_KEY");
const stripeWebhookSecret = defineSecret("STRIPE_WEBHOOK_SECRET");
const stripeProPriceId = defineSecret("STRIPE_PRO_PRICE_ID");

exports.ttsAPI = onRequest(
  { secrets: [stripeSecretKey, stripeWebhookSecret, stripeProPriceId] },
  app
);
```

At runtime these appear as `process.env.STRIPE_SECRET_KEY`, etc. Set or rotate them with `firebase functions:secrets:set <NAME>`. See [`security.md`](security.md#secrets) for the full secret matrix.

## Observability

- **Logs:** `npm run logs` (tails Cloud Function logs). Cloud Function `console.log` / `console.error` output ends up in Cloud Logging.
- **Stripe webhook deliveries:** visible in the Stripe Dashboard → Developers → Webhooks → endpoint history.
- **Firestore usage:** visible in the Firebase console under Firestore → Usage.
- **No formal uptime monitoring** is configured. Health is verified manually via the live URL.

## Constraints

- **Region pinning.** Hosting backend and the function are both `us-central1`. Moving regions requires updates in `firebase.json` and a redeploy.
- **Function name `ttsAPI`** is referenced by the hosting rewrite. Renaming the export in `functions/index.js` will break routing until `firebase.json` is updated.
- **Blaze plan required.** Storage and Cloud Functions are not available on Spark.
- **No CDN caching for `/api/**`.** All requests hit the function; there is no edge caching layer.
