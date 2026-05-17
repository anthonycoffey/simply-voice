# Local Setup

End-to-end onboarding for a new dev machine. Time required: ~15 minutes (plus account access).

## 1. Account access

You need:

- Access to the **`simply-voice-452800`** Firebase / GCP project (ask Anthony).
- A Stripe Dashboard login for the Simply Voice account (only if you'll be touching billing code).

## 2. Install prerequisites

| Tool | Install |
|---|---|
| Node 22 | https://nodejs.org/ — match the Cloud Functions runtime |
| Firebase CLI | `npm i -g firebase-tools` |
| gcloud CLI | https://cloud.google.com/sdk/docs/install |

Verify:

```bash
node --version       # v22.x
firebase --version
gcloud --version
```

## 3. Authenticate

```bash
firebase login
gcloud auth login
gcloud auth application-default login
```

- `firebase login` lets the Firebase CLI deploy on your behalf.
- `gcloud auth application-default login` writes Application Default Credentials that the local TTS server uses to call Google Cloud Text-to-Speech.

## 4. Clone & install

```bash
git clone <repo-url> simply-voice
cd simply-voice
npm run install:all
```

This installs root, `functions/`, and `server/` dependencies in sequence.

## 5. `.env`

The repo's `.env` is gitignored. Pull the current values from Firebase:

```bash
firebase apps:sdkconfig WEB
```

Copy the printed values into a new `.env` at the repo root in this shape:

```dotenv
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=simply-voice-452800.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=simply-voice-452800
VITE_FIREBASE_STORAGE_BUCKET=simply-voice-452800.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
```

These are public web-SDK keys, not secrets. See [`../deep-dives/security.md`](../deep-dives/security.md#secrets) for why.

### Optional: local Stripe webhook testing

If you're working on the webhook handler, also add to `.env`:

```dotenv
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

And forward events with the Stripe CLI:

```bash
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

## 6. Run

```bash
npm run dev
```

This starts:

- Vite SPA on http://localhost:8080
- Local Express server on http://localhost:3000 (handles `/api/**` via the Vite proxy)

Open http://localhost:8080 and sign in with a Google account that exists in the Firebase project's allowed users.

## 7. Verify

| Check | How |
|---|---|
| SPA loads | `http://localhost:8080` renders the landing page |
| Google sign-in works | Click **Sign In**, complete the popup, land on `/dashboard` |
| TTS voice list loads | `/dashboard` → "Text to Speech" tab — the voice dropdown is populated |
| Synthesis works | Type some text, click **Generate Speech**, hear playback |
| Profile loads | `/account` shows your email and (empty) usage |

If voices fail to load with a credentials error in the server console, you forgot `gcloud auth application-default login` (step 3).

## What does NOT work locally

The local dev server is intentionally permissive:

- Does **not** verify Firebase ID tokens
- Does **not** enforce the monthly character quota
- Does **not** increment `chars_this_month`
- Does **not** read `subscriptions/{uid}`

For anything that depends on auth, quota, or subscription state, deploy and test against production (or stand up a temporary preview channel).

See [`../deep-dives/development-environment.md`](../deep-dives/development-environment.md) for the full local-vs-prod parity table.

## Next steps

- Read [`../development-standards.md`](../development-standards.md) for the spec / TDD workflow.
- Read [`../agents/simply-voice.md`](../agents/simply-voice.md) for the service-level architecture overview.
- Skim [`../deep-dives/`](../deep-dives/) for the area you'll be working in.
