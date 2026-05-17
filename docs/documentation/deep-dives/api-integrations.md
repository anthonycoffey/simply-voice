# API Integrations

Simply Voice integrates with two external providers — **Google Cloud Text-to-Speech** for synthesis and **Stripe** for subscription billing — plus Firebase Auth/Firestore/Storage as core infrastructure. This document covers the integration shape, the endpoint catalog, and the contract between the SPA and the backend.

## Endpoint catalog

All routes are mounted under `/api/**` on the `ttsAPI` Cloud Function. The Firebase Hosting rewrite maps the public origin to the function. Every endpoint requires `Authorization: Bearer <Firebase ID token>` **except** `/api/stripe/webhook`, which uses Stripe signature verification instead.

| Method | Path | Auth | Source file |
|---|---|---|---|
| `GET` | `/api/tts/voices` | Firebase ID token | `functions/routes/getVoices.js` |
| `POST` | `/api/tts/synthesize` | Firebase ID token | `functions/routes/synthesizeSpeech.js` |
| `POST` | `/api/stripe/create-checkout-session` | Firebase ID token | `functions/routes/stripe/createCheckoutSession.js` |
| `POST` | `/api/stripe/create-portal-session` | Firebase ID token | `functions/routes/stripe/createPortalSession.js` |
| `POST` | `/api/stripe/webhook` | Stripe signature | `functions/routes/stripe/stripeWebhook.js` |

Client-side wrappers for the first four endpoints live in `src/lib/speechUtils.ts`.

---

### `GET /api/tts/voices`

Returns the top 30 en-US voices ranked by quality tier (Neural2 > Chirp3-HD > Chirp-HD > Studio > Wavenet > Standard).

**Response 200**

```json
[
  {
    "id": "en-US-Neural2-D",
    "name": "Neural2-D",
    "lang": "en-US",
    "ssmlGender": "MALE",
    "naturalSampleRateHertz": 24000,
    "type": "Neural2",
    "tier": 5
  }
]
```

**Response 500** — `{ "error": "Failed to fetch voices" }`

---

### `POST /api/tts/synthesize`

Synthesises text into a WAV file.

**Request body**

```json
{
  "text": "Hello world",
  "voiceId": "en-US-Neural2-D",
  "lang": "en-US",
  "speakingRate": 1.0,
  "pitch": 0.0
}
```

- `text` — required, max 4,800 characters (per-request hard limit).
- `voiceId` — required.
- `lang` — required; the same `lang` value from `getVoices` for the chosen voice.
- `speakingRate` — optional, clamped to `[0.25, 4.0]`, default `1.0`.
- `pitch` — optional, clamped to `[-20, 20]`, default `0.0`.

**Response 200** — `Content-Type: audio/wav` (LINEAR16, mono). A `Content-Disposition: attachment; filename="speech.wav"` header is set.

**Response 400 — missing parameters**
```json
{ "error": "Missing required parameters" }
```

**Response 400 — exceeds per-request limit**
```json
{
  "error": "Text exceeds the 4,800 character limit per request",
  "max": 4800
}
```

**Response 429 — monthly quota exceeded**
```json
{
  "error": "Monthly character limit exceeded. Upgrade to Pro for more.",
  "chars_used": 10000,
  "chars_requested": 500,
  "limit": 10000,
  "tier": "free"
}
```

**Response 500** — `{ "error": "Failed to synthesize speech" }`

#### Server-side behavior

1. Reads `subscriptions/{uid}` and `profiles/{uid}` in parallel.
2. Resolves tier: `pro` iff `sub.status === 'active' && sub.tier === 'pro'`, otherwise `free`.
3. Resolves current-month usage: `0` if `profile.period_month !== currentMonth`, else `profile.chars_this_month`.
4. If `charsUsed + text.length > limit`, returns 429.
5. Calls `TextToSpeechClient.synthesizeSpeech(...)` with clamped `speakingRate` / `pitch`.
6. Writes back `{ chars_this_month: charsUsed + text.length, period_month: currentMonth }` to `profiles/{uid}`.

---

### `POST /api/stripe/create-checkout-session`

Creates a Stripe Checkout session for the Pro plan.

- Looks up `subscriptions/{uid}.stripeCustomerId`.
- If absent, creates a Stripe customer with `metadata: { firebaseUID: uid }`.
- Creates a `mode: "subscription"` Checkout session for `STRIPE_PRO_PRICE_ID`.
- `success_url`: `{FRONTEND_URL}/account?upgraded=true`
- `cancel_url`: `{FRONTEND_URL}/pricing`
- Both session and subscription metadata include `firebaseUID` for webhook correlation.

`FRONTEND_URL` defaults to `https://simply-voice-452800.web.app`; override via the `FRONTEND_URL` env var.

**Response 200** — `{ "url": "https://checkout.stripe.com/..." }`

---

### `POST /api/stripe/create-portal-session`

Creates a Stripe Customer Portal session for the authenticated user.

- Requires `subscriptions/{uid}.stripeCustomerId` to exist.
- `return_url`: `{FRONTEND_URL}/account`

**Response 200** — `{ "url": "https://billing.stripe.com/..." }`
**Response 400** — `{ "error": "No active subscription found" }` (no `stripeCustomerId` on file)

---

### `POST /api/stripe/webhook`

Stripe-to-server callback. **No Firebase auth**; verified by Stripe signature.

```js
event = stripe.webhooks.constructEvent(
  req.rawBody, req.headers['stripe-signature'], STRIPE_WEBHOOK_SECRET
);
```

The raw request body is captured by the `express.json({ verify })` callback in `functions/index.js`. See [Raw-body capture](#raw-body-capture) below.

| Event | Effect on `subscriptions/{uid}` |
|---|---|
| `checkout.session.completed` | Sets `{ tier: 'pro', status, stripeCustomerId, stripeSubscriptionId, currentPeriodEnd, updatedAt }`. Retrieves the subscription to read `current_period_end`. |
| `customer.subscription.updated` | Updates `{ status, currentPeriodEnd, updatedAt }`. |
| `customer.subscription.deleted` | Sets `{ tier: 'free', status: 'cancelled', updatedAt }`. |
| anything else | Ignored. |

`uid` is read from `session.metadata.firebaseUID` (for `checkout.session.completed`) or `subscription.metadata.firebaseUID` (for the two subscription events).

**Response 200** — `{ "received": true }`
**Response 400** — signature verification failed
**Response 500** — `{ "error": "Webhook processing failed" }`

---

## Google Cloud Text-to-Speech

| | |
|---|---|
| SDK | `@google-cloud/text-to-speech` (in `functions/` and `server/`) |
| Auth (production) | The Cloud Function inherits the project's default service account |
| Auth (local) | Application Default Credentials — `gcloud auth application-default login` |
| Endpoints used | `listVoices`, `synthesizeSpeech` |
| Audio encoding | `LINEAR16` (WAV) |
| Language | `en-US` only (voices are filtered server-side) |
| Per-request cap | 4,800 characters (Simply Voice limit, not Google's) |
| Rate limiting | Relies on Firestore quota check; Google's own quotas apply at the project level |

The voice ranking and filtering logic in `getVoices.js` is the only place that knows about voice tiers — it's a server-side concern, the client just consumes the sorted list.

## Stripe

| | |
|---|---|
| SDK | `stripe` (in `functions/`) |
| Account mode | Test in development, Live in production (toggle via `STRIPE_SECRET_KEY`) |
| Products | One — the Pro plan, identified by `STRIPE_PRO_PRICE_ID` |
| Customer creation | Lazy — on first checkout attempt, in `createCheckoutSession.js` |
| Customer ↔ Firebase user link | `customer.metadata.firebaseUID` + `subscription.metadata.firebaseUID` |
| Webhook events handled | `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted` |
| Webhook authentication | Stripe signature (HMAC SHA-256 with `STRIPE_WEBHOOK_SECRET`) |

### Webhook delivery flow

```
Stripe → POST /api/stripe/webhook → ttsAPI Cloud Function
   │
   ├─ stripe.webhooks.constructEvent(rawBody, sig, secret)
   │     └─ verifies HMAC; throws on mismatch (returns 400)
   │
   ├─ switch (event.type)
   │     ├─ checkout.session.completed → Firestore write (Admin SDK)
   │     ├─ customer.subscription.updated → Firestore write
   │     └─ customer.subscription.deleted → Firestore write
   │
   └─ res.json({ received: true })
```

### Raw-body capture

Cloud Functions Gen 2 (Cloud Run) consumes the request body before `express.raw()` can buffer it on a per-route basis. The reliable workaround is to capture the buffer in the JSON parser's `verify` hook:

```js
// functions/index.js
app.use(express.json({
  verify: (req, _res, buf) => { req.rawBody = buf; },
}));

// register webhook BEFORE the authenticate middleware
app.post("/api/stripe/webhook", stripeWebhook);

// only now apply auth to the rest
app.use(authenticate);
```

This pattern is mirrored in the local dev server (`server/index.js`) so signature verification behaves identically in both environments.

### Testing the webhook locally

```bash
stripe listen --forward-to localhost:3000/api/stripe/webhook
stripe trigger checkout.session.completed
```

For this to work, `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` must be present in `.env` (the local server reads them from there via `dotenv`). The webhook handler will write to real Firestore — point at a test customer.

## Firebase (core infrastructure)

| Service | SDK | Used in |
|---|---|---|
| Auth | `firebase` web SDK | `src/lib/firebase.ts`, `src/lib/auth.tsx` |
| Auth | `firebase-admin` | `functions/index.js` (token verification middleware) |
| Firestore | `firebase` web SDK | `src/lib/hooks/useFirebase.ts` (profile, history, subscription listeners) |
| Firestore | `firebase-admin` | `functions/routes/synthesizeSpeech.js`, `functions/routes/stripe/*.js`, `server/index.js` |
| Storage | `firebase` web SDK | `src/lib/hooks/useFirebase.ts` (`useFirebaseStorage`) |

The client never writes to `subscriptions/{uid}` — only the Stripe webhook does, via the Admin SDK (which bypasses Firestore rules). See [`security.md`](security.md) for the full access matrix.
