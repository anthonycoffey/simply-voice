# Development Environment

How to run Simply Voice locally. For a step-by-step onboarding checklist, see [`../guides/local-setup.md`](../guides/local-setup.md).

## Stack overview

| Component | Port | Process | Role |
|---|---|---|---|
| Vite dev server | `8080` | `vite` | Serves the React SPA with HMR |
| Local Express server | `3000` | `node server/index.js` (via nodemon in `server/` package) | Mirrors `ttsAPI` — handles `/api/tts/**` and the Stripe webhook locally |

`npm run dev` starts both in parallel via `concurrently`. The Vite config proxies all `/api/**` requests from `:8080` to `:3000`, so the frontend uses the same fetch URLs in dev and prod.

```ts
// vite.config.ts
server: {
  host: "::",
  port: 8080,
  proxy: mode === 'development' ? {
    '/api': {
      target: 'http://localhost:3000',
      changeOrigin: true,
      rewrite: (path) => path.replace(/^\/api/, '/api'),
    },
  } : undefined
}
```

## Prerequisites

| Tool | Why |
|---|---|
| Node 22 | Matches the Cloud Functions runtime |
| npm | Package manager (workspaces handled manually via `install:all`) |
| `firebase-tools` (global) | Deploy + emulators + `apps:sdkconfig` |
| `gcloud` CLI | Application Default Credentials for Google Cloud TTS |
| `firebase login` | Authenticates the CLI against the GCP project |
| `gcloud auth application-default login` | Lets local code call Google TTS without a key file |

## Install

```bash
npm run install:all
```

This runs three installs in sequence:

1. `npm install` (root — frontend deps)
2. `npm install --prefix functions` (Cloud Function deps)
3. `npm install --prefix server` (local dev server deps)

## Environment variables — `.env` (root, gitignored)

Populated either by hand or via `firebase apps:sdkconfig WEB`. These are **public** Firebase web SDK credentials — they appear in the bundled JavaScript and are not secrets.

```dotenv
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=simply-voice-452800.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=simply-voice-452800
VITE_FIREBASE_STORAGE_BUCKET=simply-voice-452800.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
```

The local dev server (`server/index.js`) also reads `VITE_FIREBASE_PROJECT_ID` so the Admin SDK knows which project to talk to.

### Optional local Stripe webhook testing

To test Stripe webhooks against the local server, set `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` in `.env` and forward events with the Stripe CLI:

```bash
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

The local server registers the webhook route with the same `express.json({ verify })` raw-body capture as production, so signature verification behaves identically.

## Running

```bash
npm run dev
```

Open http://localhost:8080. The SPA hot-reloads on edit. The local server auto-restarts via nodemon when files under `server/` or `functions/` change.

## What the local server does NOT do

| Behavior | Local | Production |
|---|---|---|
| Verify Firebase ID tokens on `/api/**` | ❌ skipped | ✅ required |
| Enforce monthly character quotas | ❌ skipped | ✅ enforced |
| Increment `profiles/{uid}.chars_this_month` | ❌ skipped | ✅ on every synthesis |
| Read/write Firestore for subscription tier | ❌ skipped | ✅ checked per request |

The local server's purpose is to make TTS work for UI development without paying the round-trip to the deployed function. **Anything that depends on auth, quota, or subscription state must be tested against the deployed function before shipping.**

The Stripe webhook is the exception: the local server registers the same webhook handler as production (it requires the Admin SDK because it writes Firestore directly).

## Google Cloud TTS authentication

The TTS SDK uses **Application Default Credentials (ADC)**. Run once on your machine:

```bash
gcloud auth application-default login
```

This writes a credential file to your home directory that `@google-cloud/text-to-speech` picks up automatically. No service-account JSON file is needed for local development.

If you see `Could not load the default credentials` errors from the local server, this is the fix.

## Firebase emulators (optional)

```bash
npm run emulate
```

Starts the Firebase Emulator Suite (Firestore, Auth, Storage, Functions) for fully offline development. The frontend will not automatically connect to emulators — that requires extra wiring in `src/lib/firebase.ts` and is not currently configured.

## Reference: local API surface

The local server exposes the subset of `/api/**` that doesn't require auth. See [`../../../server/README.md`](../../../server/README.md) for raw request/response examples, and [`api-integrations.md`](api-integrations.md) for the production endpoint catalog.
