---
id: REPO-SV-001
title: simply-voice
status: ready
created: 2026-05-17
author: Anthony Coffey
reviewers: []
affected_repos: [simply-voice]
---

# Repo: simply-voice

Comprehensive technical reference for the single repository that contains the entire Simply Voice product (frontend, backend, dev mirror, infra config). For narrow topics, see the deep-dives in [`../deep-dives/`](../deep-dives/).

## Directory map

```
.
├── firebase.json              Hosting + Functions + Firestore + Storage config
├── .firebaserc                Default project: simply-voice-452800
├── firestore.rules            Per-uid access; subscriptions read-only for owner
├── firestore.indexes.json     Composite index: tts_history (user_id, created_at)
├── storage.rules              Per-uid Storage access under tts-files/{uid}/**
├── vite.config.ts             Dev proxy: /api → http://localhost:3000
├── package.json               Frontend deps + workspace scripts
├── tsconfig.json              + tsconfig.app.json + tsconfig.node.json
├── tailwind.config.ts         Tailwind + shadcn config
├── components.json            shadcn/ui setup
├── eslint.config.js
├── postcss.config.js
├── index.html                 Vite entry HTML
├── .env                       Firebase web SDK config (gitignored)
│
├── src/                       React SPA
│   ├── main.tsx
│   ├── App.tsx
│   ├── lib/
│   │   ├── firebase.ts
│   │   ├── auth.tsx
│   │   ├── speechUtils.ts
│   │   ├── utils.ts
│   │   └── hooks/
│   │       ├── useFirebase.ts
│   │       ├── use-mobile.tsx
│   │       └── use-toast.ts
│   ├── pages/
│   │   ├── Index.tsx
│   │   ├── Login.tsx
│   │   ├── Dashboard.tsx
│   │   ├── Pricing.tsx
│   │   ├── Account.tsx
│   │   └── NotFound.tsx
│   └── components/
│       ├── TextToSpeech.tsx
│       ├── TTSHistory.tsx
│       ├── VoiceSelector.tsx
│       ├── AudioPlayer.tsx
│       ├── AudioWaveform.tsx
│       ├── UsageBar.tsx
│       ├── DarkModeToggle.tsx
│       ├── ProtectedRoute.tsx
│       ├── ErrorBoundary.tsx
│       └── ui/                shadcn/ui primitives
│
├── functions/                 Firebase Cloud Functions (production backend)
│   ├── index.js
│   ├── package.json
│   └── routes/
│       ├── getVoices.js
│       ├── synthesizeSpeech.js
│       └── stripe/
│           ├── createCheckoutSession.js
│           ├── createPortalSession.js
│           └── stripeWebhook.js
│
├── server/                    Local dev mirror (not deployed)
│   ├── index.js
│   ├── package.json
│   ├── README.md
│   └── services/tts-service.js
│
├── .claude/
│   └── commands/              DDD slash commands
│
└── docs/                      DDD documentation tree (this folder's parent)
```

## Tech stack

See [`../agents/simply-voice.md`](../agents/simply-voice.md#tech-stack) for the canonical list.

## Configuration files

| File | Purpose | Key contents |
|---|---|---|
| `firebase.json` | Firebase project config | Hosting rewrites `/api/**` → `ttsAPI` function (us-central1); Functions source = `functions/`; Firestore + Storage rule paths |
| `.firebaserc` | Default project alias | `simply-voice-452800` — no `--project` flag needed for CLI commands |
| `firestore.rules` | Firestore access | Owner-only for `profiles`, `tts_history`, `subscriptions` (read-only) |
| `firestore.indexes.json` | Composite indexes | `tts_history(user_id ASC, created_at DESC)` |
| `storage.rules` | Storage access | `tts-files/{uid}/**` — owner only |
| `vite.config.ts` | Vite dev server | Port 8080, proxies `/api` → `localhost:3000` in dev mode only; `@` → `src/` alias |
| `tailwind.config.ts` | Tailwind | shadcn token setup, dark mode class |
| `components.json` | shadcn/ui | Alias resolution for component generation |
| `eslint.config.js` | ESLint flat config | React + TypeScript rules |
| `tsconfig*.json` | TypeScript projects | `app` (src), `node` (vite.config), root references both |

## npm scripts (root `package.json`)

| Script | What it does |
|---|---|
| `npm run dev` | `concurrently "vite" "npm --prefix server run dev"` — starts SPA on :8080 and dev server on :3000 |
| `npm run build` | `vite build` — production build to `dist/` |
| `npm run build:dev` | `vite build --mode development` — sourcemap-friendly build |
| `npm run preview` | `vite preview` — preview production build |
| `npm run lint` | `eslint .` |
| `npm run deploy` | `firebase deploy` — everything |
| `npm run deploy:hosting` | `firebase deploy --only hosting` |
| `npm run deploy:functions` | `firebase deploy --only functions` |
| `npm run deploy:rules` | `firebase deploy --only firestore:rules,storage` |
| `npm run logs` | `firebase functions:log` |
| `npm run emulate` | `firebase emulators:start` |
| `npm run install:functions` | `npm install --prefix functions` |
| `npm run install:server` | `npm install --prefix server` |
| `npm run install:all` | Installs root + functions + server |

## Entry points

| Layer | File | What it does |
|---|---|---|
| SPA mount | `src/main.tsx` | `ReactDOM.createRoot(...).render(<App/>)` |
| SPA shell | `src/App.tsx` | `ThemeProvider` → `ErrorBoundary` → `AuthProvider` → `BrowserRouter` with all routes |
| Cloud Function | `functions/index.js` | Builds Express app, registers the Stripe webhook **before** the `authenticate` middleware, exports `ttsAPI = onRequest({ secrets: [...] }, app)` |
| Local dev server | `server/index.js` | Loads `.env`, initialises `firebase-admin`, mounts Stripe webhook + TTS routes on Express, listens on port 3000 |
| Local TTS service | `server/services/tts-service.js` | Implements `GET /voices` and `POST /synthesize` against `@google-cloud/text-to-speech` without auth/quota |

## Build & test

- **Build:** `npm run build` produces `dist/`. Firebase Hosting's Vite frameworks integration picks this up automatically on deploy.
- **Lint:** `npm run lint` runs ESLint over the whole tree.
- **Tests:** there is no test framework configured yet. When tests are added, they belong alongside the code (`src/**/*.test.ts`, `functions/**/*.test.js`) and should be wired into a `npm test` script.

## Deploy

See [`../guides/deploy.md`](../guides/deploy.md) for the pre-flight checklist and rollback procedure, and [`../deep-dives/devops.md`](../deep-dives/devops.md) for the full deploy machinery.

## Related docs

- Production architecture: [`../deep-dives/production.md`](../deep-dives/production.md)
- Local development: [`../deep-dives/development-environment.md`](../deep-dives/development-environment.md)
- API endpoint catalog: [`../deep-dives/api-integrations.md`](../deep-dives/api-integrations.md)
- Security model: [`../deep-dives/security.md`](../deep-dives/security.md)
- Features: [`../deep-dives/features.md`](../deep-dives/features.md)
- Agent brief: [`../agents/simply-voice.md`](../agents/simply-voice.md)
