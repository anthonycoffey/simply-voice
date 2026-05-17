# Product Features

What Simply Voice does, from a user's perspective and from a data perspective.

## Authentication

- Sign-in via Google OAuth popup (`signInWithPopup` on the Firebase Auth `googleProvider`).
- No email/password, no other providers — Google only.
- The `AuthProvider` (`src/lib/auth.tsx`) exposes the `User` to the React tree; `useAuth()` is the consumer hook.
- `ProtectedRoute` redirects unauthenticated users to `/login`.

## Text-to-Speech conversion (the core feature)

Page: `/dashboard` → "Text to Speech" tab (`src/components/TextToSpeech.tsx`).

| Parameter | Range | Default | Notes |
|---|---|---|---|
| `text` | 1 – 4,800 characters | — | Hard limit per request, enforced in `functions/routes/synthesizeSpeech.js` |
| `voiceId` | any from `GET /api/tts/voices` | — | en-US only, top 30 voices |
| `speakingRate` | 0.25 – 4.0 | 1.0 | Clamped server-side |
| `pitch` | -20 – +20 semitones | 0 | Clamped server-side |
| `lang` | string | `en-US` | Passed through to Google TTS |

Output: `audio/wav` (LINEAR16, mono).

### Voice ranking

`GET /api/tts/voices` returns the top 30 en-US voices, sorted by quality tier:

| Tier | Voice family |
|---|---|
| 5 | Neural2 |
| 4 | Chirp3-HD |
| 3 | Chirp-HD |
| 2.5 | Studio |
| 2 | Wavenet |
| 1 | everything else (Standard, News, Casual, Polyglot, Other) |

Within a tier, FEMALE voices come first, then alphabetical. Logic lives in `functions/routes/getVoices.js`.

## Subscription tiers

| | Free | Pro |
|---|---|---|
| Monthly character limit | **10,000** | **100,000** |
| Price | $0 | $9.99 / month |
| All AI voices | ✓ | ✓ |
| Audio history | ✓ | ✓ |
| Download as WAV | ✓ | ✓ |
| Priority support | — | ✓ |

Quota is per calendar month (`YYYY-MM`). At month rollover, the next synthesis call sees `period_month !== currentMonth` and resets `chars_used` to `0` before the quota check.

A `429` response from `/api/tts/synthesize` carries the usage payload so the UI can prompt for upgrade:

```json
{
  "error": "Monthly character limit exceeded. Upgrade to Pro for more.",
  "chars_used": 10000,
  "chars_requested": 500,
  "limit": 10000,
  "tier": "free"
}
```

Constants live at the top of `functions/routes/synthesizeSpeech.js`:

```js
const FREE_CHAR_LIMIT = 10_000;
const PRO_CHAR_LIMIT = 100_000;
const MAX_CHARS_PER_REQUEST = 4_800;
```

## Audio history

Page: `/dashboard` → "History" tab (`src/components/TTSHistory.tsx`).

- After a successful synthesis, the user can click **Save to History**.
- The WAV blob is uploaded to Firebase Storage at `tts-files/{uid}/<timestamp>_<cleanName>.wav`.
- A `tts_history/{autoId}` document is created with `audio_url` (long-lived download URL) and `audio_path` (canonical path used for delete/refresh).
- The history list uses a Firestore real-time listener (`useTTSHistory`) — new clips appear immediately.
- Per-row actions: play (single-active player), download as WAV, delete (removes Storage file and Firestore doc).

## Usage bar

`src/components/UsageBar.tsx` reads the current month's `chars_this_month` and subscription tier and renders a progress bar against the tier limit. Two modes:

- **Compact** — sits in the dashboard header.
- **Full** — shown on `/account`.

Updates in real time via the `useSubscription` and `useProfile` listeners.

## Account management

Page: `/account` (`src/pages/Account.tsx`).

- Edit first/last name (writes to `profiles/{uid}` via the Firestore web SDK).
- Plan badge (Free or Pro).
- Full usage summary.
- "Manage subscription" button → `POST /api/stripe/create-portal-session` → redirect to Stripe Customer Portal (Pro users only).

## Pricing & upgrade flow

Page: `/pricing` (`src/pages/Pricing.tsx`).

- Two cards: Free vs Pro.
- "Upgrade to Pro" → `POST /api/stripe/create-checkout-session` → redirect to Stripe Checkout.
- On success, Stripe redirects to `/account?upgraded=true`.
- The webhook flips `subscriptions/{uid}.tier` to `pro`, and the `useSubscription` listener updates the UI without a refresh.

## Theming

- Dark / light toggle in the header (`src/components/DarkModeToggle.tsx`), powered by `next-themes`.
- Tailwind's `darkMode: 'class'` strategy; tokens defined in `tailwind.config.ts`.

## Error handling

- `src/components/ErrorBoundary.tsx` catches render errors and shows a reload screen.
- API failures throw `ApiError` (`src/lib/speechUtils.ts`), which carries `status` and `data`. `TextToSpeech.tsx` reads `error.data` on `429` to render the upgrade prompt with usage numbers.
- Toast notifications via `sonner` for success/error feedback.

## Data model

### Firestore

**`profiles/{uid}`** — created on first sign-in, updated after each synthesis.

```ts
{
  id:               string          // == auth uid
  email:            string
  first_name:       string | null
  last_name:        string | null
  chars_this_month: number          // running total for current period
  period_month:     string          // "YYYY-MM" — resets on new month
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

Composite index: `(user_id ASC, created_at DESC)` (`firestore.indexes.json`).

**`subscriptions/{uid}`** — written exclusively by the backend (Stripe webhook, Admin SDK).

```ts
{
  tier:                 'free' | 'pro'
  status:               string        // 'active' | 'canceled' | ...
  stripeCustomerId:     string
  stripeSubscriptionId: string
  currentPeriodEnd:     string        // ISO 8601
  updatedAt:            string        // ISO 8601
}
```

### Storage

```
gs://simply-voice-452800.firebasestorage.app/
└── tts-files/
    └── {uid}/
        └── {timestamp}_{cleanName}.wav
```
