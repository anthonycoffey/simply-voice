# DevOps

How Simply Voice is built, deployed, monitored, and rolled back. There is currently **no CI/CD pipeline** — all deploys are manual via the Firebase CLI from a developer's machine.

## npm scripts

All scripts live in the root `package.json`.

| Script | Command | Use when |
|---|---|---|
| `dev` | `concurrently "vite" "npm --prefix server run dev"` | Local development (SPA + local TTS server) |
| `build` | `vite build` | Production build to `dist/` |
| `build:dev` | `vite build --mode development` | Sourcemap-friendly build for debugging |
| `preview` | `vite preview` | Preview the production build locally |
| `lint` | `eslint .` | Linting before commit |
| `deploy` | `firebase deploy` | Full deploy (hosting + functions + rules + indexes) |
| `deploy:hosting` | `firebase deploy --only hosting` | Frontend-only change |
| `deploy:functions` | `firebase deploy --only functions` | Backend-only change |
| `deploy:rules` | `firebase deploy --only firestore:rules,storage` | Firestore + Storage rules only |
| `logs` | `firebase functions:log` | Tail Cloud Function logs |
| `emulate` | `firebase emulators:start` | Firebase Emulator Suite (local Firestore/Auth/Storage/Functions) |
| `install:functions` | `npm install --prefix functions` | After changing `functions/package.json` |
| `install:server` | `npm install --prefix server` | After changing `server/package.json` |
| `install:all` | Installs root + functions + server | Fresh clone |

## `firebase.json` breakdown

```json
{
  "hosting": {
    "source": ".",
    "ignore": ["firebase.json", "**/.*", "**/node_modules/**"],
    "frameworksBackend": { "region": "us-central1" },
    "rewrites": [
      { "source": "/api/**",
        "function": { "functionId": "ttsAPI", "region": "us-central1" } }
    ]
  },
  "functions": [
    { "source": "functions",
      "codebase": "default",
      "ignore": ["node_modules", ".git", "firebase-debug.log",
                 "firebase-debug.*.log", "*.local"] }
  ],
  "firestore": {
    "rules": "firestore.rules",
    "indexes": "firestore.indexes.json"
  },
  "storage": {
    "rules": "storage.rules"
  }
}
```

Notes:

- **`hosting.source: "."`** + **`frameworksBackend`** triggers Firebase's framework-aware Hosting deploy. It detects Vite, runs `npm run build`, and ships `dist/` automatically — no `public:` field needed.
- **The hosting rewrite hard-codes the function name `ttsAPI` and region `us-central1`.** Renaming the export in `functions/index.js` requires updating this file.
- **`functions[].source: "functions"`** isolates the backend's `package.json` and `node_modules` — root deps do not bleed into the deployed function.

## `.firebaserc`

Aliases the default project as `simply-voice-452800`. Because of this, `firebase deploy` and friends do not need a `--project` flag.

## Secrets management

Production secrets live in **Google Cloud Secret Manager**, declared in `functions/index.js` via `defineSecret(...)`, and listed in the `onRequest({ secrets: [...] }, ...)` options so they are mounted into `process.env` at runtime.

| Secret | Used by |
|---|---|
| `STRIPE_SECRET_KEY` | All Stripe SDK calls (Checkout, Customer Portal, retrieving subscriptions) |
| `STRIPE_WEBHOOK_SECRET` | `stripe.webhooks.constructEvent(...)` signature verification |
| `STRIPE_PRO_PRICE_ID` | Stripe Price object for the Pro plan, used in `createCheckoutSession` |

Manage them via the Firebase CLI:

```bash
firebase functions:secrets:set STRIPE_SECRET_KEY
firebase functions:secrets:set STRIPE_WEBHOOK_SECRET
firebase functions:secrets:set STRIPE_PRO_PRICE_ID

firebase functions:secrets:access STRIPE_SECRET_KEY   # view current value
firebase functions:secrets:destroy STRIPE_SECRET_KEY  # remove
```

After changing a secret value, redeploy the function (`npm run deploy:functions`) for the new value to take effect on running instances.

## Standard deploy

```bash
npm run lint
npm run build
npm run deploy
```

`firebase deploy`:

1. Triggers the Vite production build (via the frameworks integration).
2. Uploads the built SPA to Firebase Hosting.
3. Packages `functions/` (excluding `node_modules`), uploads, and deploys `ttsAPI` to Cloud Run.
4. Deploys Firestore rules, Firestore indexes, and Storage rules.

For the full pre-flight checklist and rollback procedure, see [`../guides/deploy.md`](../guides/deploy.md).

## Targeted deploys

Use these to limit blast radius and shorten deploy time:

| Change | Command |
|---|---|
| Anything under `src/` only | `npm run deploy:hosting` |
| Anything under `functions/` only | `npm run deploy:functions` |
| `firestore.rules` and/or `storage.rules` only | `npm run deploy:rules` |
| `firestore.indexes.json` change | `firebase deploy --only firestore:indexes` |

## Logs & observability

```bash
npm run logs                                  # tail recent function logs
firebase functions:log --only ttsAPI          # filter to one function (here, the only one)
```

For deeper investigation, open Cloud Logging in the GCP console. Stripe webhook deliveries are also visible in the Stripe Dashboard → Developers → Webhooks → endpoint history.

## Emulators

```bash
npm run emulate
```

Starts the Firebase Emulator Suite for Firestore, Auth, Storage, and Functions. The frontend does not automatically connect to emulators today — that requires wiring in `src/lib/firebase.ts`. Useful for offline backend testing of rules and function code.

## What is missing (intentionally documented)

- **No CI/CD.** No GitHub Actions, no Cloud Build, no automated tests on push. Deploys are manual.
- **No staging environment.** There is one project, `simply-voice-452800`. Pre-production verification is via emulators and the local dev server.
- **No automated test suite.** When tests land, they should be wired into a `npm test` script and gated before `npm run deploy`.
- **No uptime monitoring or alerting.** Operational health is verified by visiting the live URL.
