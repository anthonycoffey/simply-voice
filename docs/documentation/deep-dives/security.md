# Security

The Simply Voice security model has four layers: **client authentication** (Firebase Auth), **transport-layer endpoint protection** (ID-token middleware), **data-layer access control** (Firestore + Storage rules), and **payment-side authenticity** (Stripe signature verification). Secrets are managed separately via Google Cloud Secret Manager.

## Authentication

| | |
|---|---|
| Provider | Firebase Auth |
| Identity providers enabled | Google OAuth only |
| Token type | Firebase ID token (JWT, ~1 hour TTL, auto-refreshed by the web SDK) |
| Client → API | `Authorization: Bearer <idToken>` header on every `/api/**` request |
| Server-side verification | `admin.auth().verifyIdToken(token)` in `functions/index.js` |

### Middleware

`functions/index.js`:

```js
const authenticate = async (req, res, next) => {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: "Unauthorized: missing token" });
  }

  try {
    req.user = await admin.auth().verifyIdToken(token);
    next();
  } catch {
    return res
      .status(403)
      .json({ error: "Unauthorized: invalid or expired token" });
  }
};

app.use(authenticate);
```

Status code semantics:

| Code | Meaning |
|---|---|
| `401` | No `Authorization` header, or no `Bearer ` prefix |
| `403` | Token present but invalid, expired, or for the wrong project |

Downstream handlers read the authenticated user as `req.user.uid` and `req.user.email`.

### Middleware ordering (critical)

The Stripe webhook route is registered **before** `app.use(authenticate)` so that Stripe's signed POST is not rejected with a 401:

```js
// 1. Body parser with raw-body capture
app.use(express.json({ verify: (req, _res, buf) => { req.rawBody = buf; } }));

// 2. Webhook FIRST — no Firebase auth, Stripe signature instead
app.post("/api/stripe/webhook", stripeWebhook);

// 3. Now apply Firebase auth to everything else
app.use(authenticate);

app.get("/api/tts/voices", getVoices);
app.post("/api/tts/synthesize", synthesizeSpeech);
app.post("/api/stripe/create-checkout-session", createCheckoutSession);
app.post("/api/stripe/create-portal-session", createPortalSession);
```

A past incident regressed this ordering and rejected Stripe webhooks with 401s. Recent commits (`cc0050b`, `1e2898e`) hardened it.

## Firestore rules

`firestore.rules`:

```firestore
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {

    // User profiles — owner read/write only
    match /profiles/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }

    // TTS history — owner read/delete/create; updates must preserve user_id
    match /tts_history/{docId} {
      allow read, delete: if request.auth != null
                          && resource.data.user_id == request.auth.uid;
      allow create: if request.auth != null
                    && request.resource.data.user_id == request.auth.uid;
      allow update: if request.auth != null
                    && resource.data.user_id == request.auth.uid
                    && request.resource.data.user_id == request.auth.uid;
    }

    // Subscriptions — owner read only; writes come exclusively from the backend
    // (Firebase Admin SDK bypasses these rules, so no write rule is needed here)
    match /subscriptions/{userId} {
      allow read: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

Key properties:

| Collection | Client read | Client write | Backend write |
|---|---|---|---|
| `profiles/{uid}` | owner only | owner only (profile edits, init) | ✓ (usage increment) |
| `tts_history/{id}` | owner only | owner can create/update/delete; `user_id` cannot be changed | — |
| `subscriptions/{uid}` | owner only | **forbidden** | ✓ (Stripe webhook only) |

The absence of a write rule on `subscriptions/{uid}` is intentional: the Firebase Admin SDK bypasses Firestore rules, so the Stripe webhook is the sole writer. Any client-side attempt to write to `subscriptions/{uid}` is rejected.

## Storage rules

`storage.rules`:

```
rules_version = '2';

service firebase.storage {
  match /b/{bucket}/o {
    match /tts-files/{userId}/{allPaths=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

The path prefix `tts-files/{userId}/` enforces ownership. A user cannot list or download another user's clips. Anything outside `tts-files/{uid}/**` is denied by default.

## Stripe webhook signature verification

```js
event = stripe.webhooks.constructEvent(
  req.rawBody,
  req.headers["stripe-signature"],
  process.env.STRIPE_WEBHOOK_SECRET
);
```

- The raw request bytes (`req.rawBody`) are required — Stripe signs the byte stream, not the parsed JSON.
- `STRIPE_WEBHOOK_SECRET` is the per-endpoint signing secret from the Stripe Dashboard, rotated independently of `STRIPE_SECRET_KEY`.
- A failed verification returns `400` and the event is **not** processed. Stripe will retry per its standard schedule.

If the secret is rotated in Stripe's Dashboard, set the new value via `firebase functions:secrets:set STRIPE_WEBHOOK_SECRET` and redeploy.

## Secrets

| Where | What lives there | Public? |
|---|---|---|
| `.env` (root, gitignored) | `VITE_FIREBASE_*` web SDK config | **Yes** — shipped to the browser. Not a secret. |
| Google Cloud Secret Manager (via `firebase functions:secrets`) | `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRO_PRICE_ID` | **No** — server-side only, mounted as `process.env` inside the Cloud Function |
| Developer machine | `gcloud` ADC credentials (`~/.config/gcloud/...`) | **No** — local only, used for Google TTS calls in dev |

### What is and isn't a secret

- **`VITE_FIREBASE_API_KEY` is not a secret.** Firebase web-SDK keys identify the project; they do not grant data access. Protection comes from Firestore/Storage rules + ID-token auth.
- **`STRIPE_SECRET_KEY` is a secret.** Never commit it. If exposed, rotate immediately in the Stripe Dashboard and update the Secret Manager value.
- **`STRIPE_WEBHOOK_SECRET` is a secret.** If exposed, rotate via the Stripe Dashboard (which generates a new signing secret) and update Secret Manager.

### Rotation

```bash
firebase functions:secrets:set STRIPE_SECRET_KEY
firebase functions:secrets:set STRIPE_WEBHOOK_SECRET
firebase functions:secrets:set STRIPE_PRO_PRICE_ID
npm run deploy:functions   # required for new values to be mounted
```

## Quota as a security control

Beyond payments, the monthly character quota is a **denial-of-wallet** control: it caps the amount of Google TTS spend any one user (or compromised account) can incur in a calendar month. Enforcement lives in `functions/routes/synthesizeSpeech.js`:

- Per-request cap: 4,800 characters (`MAX_CHARS_PER_REQUEST`).
- Monthly cap: 10,000 (Free) or 100,000 (Pro) characters.
- Both caps are evaluated server-side using `req.user.uid` from the verified ID token — there is no way for the client to bypass them.

## CORS

The SPA and the API live on the same origin (`simply-voice-452800.web.app`), so there are no cross-origin requests in production. The function does not set CORS headers, and none are needed for browser traffic. Direct external API consumers are not currently supported.

## What is not yet in place

- **Input sanitisation of synthesised text** — text is passed straight to Google TTS. Google's API ignores SSML unless wrapped in `<speak>`, but we should still consider stripping control characters for defence in depth.
- **Rate limiting beyond the quota** — there is no per-IP, per-second throttle. The quota system is the only spend control.
- **Automated rotation schedule** for Stripe secrets — rotation is manual and undocumented in the playbook.
- **Audit logging** of subscription state changes — Cloud Function `console.log` lines exist (`Upgraded user X to Pro`) but there is no structured audit collection.
- **PII / GDPR policy documentation** — user email and name are stored in `profiles/{uid}`; there is no documented retention or deletion policy.

These are tracked as future work; new specs should reference them when relevant.
