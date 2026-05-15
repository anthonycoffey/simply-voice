# Simply Voice

Text-to-speech web app powered by Google Cloud TTS. Authenticated users generate WAV audio from text, save clips to a personal history, and play them back later.

**Live:** https://simply-voice-452800.web.app

---

## Tech stack

| Layer        | Tech                                                            |
| ------------ | --------------------------------------------------------------- |
| Frontend     | Vite, React 18, TypeScript, Tailwind, shadcn/ui, React Router 6 |
| Auth         | Firebase Auth (Google provider)                                 |
| Database     | Cloud Firestore                                                 |
| File storage | Firebase Storage                                                |
| TTS API      | Express on Firebase Cloud Functions v2 (Node 22)                |
| TTS engine   | Google Cloud Text-to-Speech                                     |
| Hosting      | Firebase Hosting (Vite frameworks integration)                  |

GCP / Firebase project: **`simply-voice-452800`**

---

## Architecture

```
                  Browser (Vite SPA)
                         |
                         |  signInWithPopup (Google)
                         v
                  Firebase Auth  -----------------+
                         |                        |
                         |  ID token used         |
                         |  by Firestore +        |
                         v  Storage SDKs          |
            +---------------------+               |
            |   Cloud Firestore   |  rules enforce ownership by uid
            |                     |
            |  profiles/{uid}     |  - id, email, first_name, last_name
            |  tts_history/{id}   |  - user_id, text, voice_id, created_at,
            +---------------------+    audio_url, audio_path
                         ^
                         |  add / list / delete docs
                         |
                  Browser (Vite SPA)
                         |
                         |  upload / download / delete blobs
                         v
            +---------------------+
            |  Firebase Storage   |  rules enforce {uid} path prefix
            |                     |
            |  tts-files/{uid}/   |
            |     {ts}_{name}.wav |
            +---------------------+

                  Browser (Vite SPA)
                         |
                         |  fetch /api/tts/voices
                         |  fetch /api/tts/synthesize
                         v
            +---------------------+
            |  Firebase Hosting   |  rewrites /api/** -> ttsAPI function
            +---------------------+
                         |
                         v
            +---------------------+
            |  Cloud Function     |  Express app, region us-central1
            |  ttsAPI             |  - GET  /api/tts/voices
            |                     |  - POST /api/tts/synthesize
            +---------------------+
                         |
                         |  @google-cloud/text-to-speech (ADC)
                         v
            +---------------------+
            |  Google Cloud TTS   |
            +---------------------+
```

### Request flow: "generate and save a clip"

1. User signs in via Google popup → `AuthProvider` exposes the `User` to the tree.
2. `VoiceSelector` calls `GET /api/tts/voices` → `ttsAPI` → Google Cloud TTS `listVoices` → top 30 English voices.
3. User enters text + picks voice → `TextToSpeech` calls `POST /api/tts/synthesize` → returns a WAV blob.
4. User clicks **Save to History**:
   - Blob uploaded to `tts-files/{uid}/{timestamp}_{name}.wav` in Firebase Storage.
   - `getDownloadURL` produces a long-lived URL.
   - A row is added to `tts_history` with both `audio_url` and `audio_path`.
5. `TTSHistory` reads the user's rows via a `where('user_id','==',uid).orderBy('created_at','desc')` query and renders them through `AudioPlayer`.

---

## Project structure

```
.
├── firebase.json              Hosting + Functions + Firestore + Storage config
├── .firebaserc                Project ID alias
├── firestore.rules            Per-uid Firestore access
├── firestore.indexes.json     Composite index for tts_history queries
├── storage.rules              Per-uid Storage access
├── vite.config.ts             Dev proxy: /api -> http://localhost:3000
├── .env                       Firebase web SDK config (gitignored)
│
├── src/
│   ├── main.tsx               React entry
│   ├── App.tsx                AuthProvider + QueryClient + Router shell
│   │
│   ├── lib/
│   │   ├── firebase.ts        SDK init: auth, db, storage, googleProvider
│   │   ├── auth.tsx           <AuthProvider /> + useAuth()
│   │   ├── speechUtils.ts     fetch wrappers for /api/tts/{voices,synthesize}
│   │   ├── utils.ts           cn() helper
│   │   └── hooks/
│   │       └── useFirebase.ts useProfile, useTTSHistory, useFirebaseStorage
│   │
│   ├── pages/
│   │   ├── Index.tsx          Landing page
│   │   ├── Login.tsx          "Continue with Google" button
│   │   ├── Dashboard.tsx      Authenticated tabs: convert / history
│   │   └── NotFound.tsx
│   │
│   └── components/
│       ├── ProtectedRoute.tsx Gates /dashboard on useAuth()
│       ├── TextToSpeech.tsx   Generate + Save-to-History UI
│       ├── TTSHistory.tsx     Paginated history list
│       ├── VoiceSelector.tsx  Voice dropdown (calls /api/tts/voices)
│       ├── AudioPlayer.tsx    Single-active-player audio control
│       ├── AudioWaveform.tsx  Decorative waveform
│       └── ui/                shadcn/ui primitives
│
├── functions/                 Firebase Cloud Functions (deployed backend)
│   ├── index.js               Mounts Express, exports ttsAPI onRequest
│   └── routes/
│       ├── getVoices.js
│       └── synthesizeSpeech.js
│
└── server/                    Local-only Express server (dev mirror of ttsAPI)
    ├── index.js
    └── services/
        └── tts-service.js
```

---

## Data model

### Firestore

**`profiles/{uid}`** — auto-created on first sign-in.

```ts
{
  id: string,            // == auth uid
  email: string,
  first_name: string | null,
  last_name:  string | null,
}
```

**`tts_history/{autoId}`** — one row per saved clip.

```ts
{
  user_id:      string,  // owner uid (used by rules + index)
  text_content: string,
  voice_id:     string,
  created_at:   string,  // ISO 8601
  audio_url:    string | null,  // long-lived download URL
  audio_path:   string | null,  // canonical storage path for delete/refresh
}
```

Composite index: `(user_id ASC, created_at DESC)`.

### Storage

```
gs://simply-voice-452800.firebasestorage.app/
└── tts-files/
    └── {uid}/
        └── {timestamp}_{cleanName}.wav
```

---

## Security rules

**Firestore** (`firestore.rules`) — a user can only read or write their own `profile` doc, and can only create / read / mutate `tts_history` rows where `user_id == request.auth.uid`.

**Storage** (`storage.rules`) — read/write under `tts-files/{userId}/**` requires `request.auth.uid == userId`. Anything outside that prefix is denied.

The `VITE_FIREBASE_*` values in `.env` are public web-client credentials by design; the rules above are what actually protect the data.

---

## Local development

### Prerequisites

- Node 22, npm (or bun)
- `firebase-tools` (`npm i -g firebase-tools`), logged in via `firebase login`
- `gcloud` CLI authenticated for Application Default Credentials so the local Express server can call Google Cloud TTS: `gcloud auth application-default login`

### Setup

```bash
npm install                        # root deps (Vite + React + Firebase SDK)
cd functions && npm install        # Cloud Functions deps
cd ../server && npm install        # Local TTS server deps
```

### Run

```bash
npm run dev
```

This script runs **two processes in parallel** (Linux/macOS / Git Bash on Windows):

- `vite` on **port 8080** — the SPA
- `node server/index.js` on **port 3000** — local Express mirror of the TTS API

The Vite dev server proxies `/api/**` → `http://localhost:3000`, so the frontend talks to the local server in dev and to the deployed Cloud Function in production with zero code change.

### Environment

`.env` (gitignored — already populated by `firebase apps:sdkconfig`):

```
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=simply-voice-452800.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=simply-voice-452800
VITE_FIREBASE_STORAGE_BUCKET=simply-voice-452800.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
```

To re-fetch: `firebase apps:sdkconfig WEB --project simply-voice-452800`.

---

## Deployment

```bash
# Everything
firebase deploy --project simply-voice-452800

# Pieces
firebase deploy --only hosting               --project simply-voice-452800
firebase deploy --only functions             --project simply-voice-452800
firebase deploy --only firestore:rules       --project simply-voice-452800
firebase deploy --only firestore:indexes     --project simply-voice-452800
firebase deploy --only storage               --project simply-voice-452800
```

Hosting uses Firebase's experimental Vite frameworks integration — it runs `vite build` inside the deploy and ships `dist/`. `firebase.json` rewrites `/api/**` to the `ttsAPI` Cloud Function in `us-central1`.

The project must be on the **Blaze** plan (Firebase Storage is no longer available on Spark).

---

## Backend API

Both the deployed Cloud Function and the local dev server expose the same surface:

### `GET /api/tts/voices`

Returns up to 30 English (`en-US`) voices, ranked by quality tier (Neural2 > Chirp3-HD > Chirp-HD > Studio > Wavenet > Standard).

```json
[
  {
    "id": "en-US-Neural2-D",
    "name": "Neural2-D",
    "lang": "en-US",
    "ssmlGender": "MALE",
    "naturalSampleRateHertz": 24000
  }
]
```

### `POST /api/tts/synthesize`

Body:

```json
{
  "text": "Hello world",
  "voiceId": "en-US-Neural2-D",
  "lang": "en-US",
  "speakingRate": 1.0,
  "pitch": 0.0
}
```

Returns `audio/wav` (LINEAR16) directly in the response body.

Both endpoints authenticate to Google Cloud TTS via Application Default Credentials (Cloud Functions' runtime service account in prod, local user ADC in dev).

---

## Known limitations

- **"Audio unavailable / Retry" UI in `TTSHistory.tsx`** is vestigial from the Supabase signed-URL era. Firebase Storage download URLs are token-embedded and don't expire under normal use; the UI only triggers on genuine audio errors (deleted file, network failure). Harmless.
