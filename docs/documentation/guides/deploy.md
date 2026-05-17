# Deploy

How to ship Simply Voice to production. All deploys are manual, run from a developer's machine, against the single production project `simply-voice-452800`.

## Pre-deploy checklist

- [ ] On the branch you want to deploy (typically `main`), with no uncommitted changes.
- [ ] `npm run lint` is clean.
- [ ] `npm run build` succeeds — catches type/build errors before Firebase tries to build during deploy.
- [ ] Tested locally with `npm run dev` end-to-end (sign in → synthesize → save to history).
- [ ] If touching the Stripe webhook, tested with `stripe listen --forward-to localhost:3000/api/stripe/webhook`.
- [ ] If touching Firestore or Storage rules, mentally verified that they don't loosen access for an unintended caller. See [`../deep-dives/security.md`](../deep-dives/security.md).
- [ ] If touching secrets, set the new value first: `firebase functions:secrets:set <NAME>`.
- [ ] Docs updated in the same change (deep-dives, agent brief, API catalog as relevant).

## Standard deploy

```bash
npm run deploy
```

What this does:

1. Vite production build (`vite build` via the Hosting frameworks integration) → `dist/`
2. Upload `dist/` to Firebase Hosting
3. Package `functions/` → upload → deploy `ttsAPI` to Cloud Run (us-central1)
4. Deploy Firestore rules + indexes
5. Deploy Storage rules

`.firebaserc` aliases `simply-voice-452800` as the default project, so no `--project` flag is required.

## Targeted deploys (preferred for small changes)

| Change scope | Command | Why |
|---|---|---|
| `src/**` only (frontend) | `npm run deploy:hosting` | Skips function build, faster |
| `functions/**` only (backend) | `npm run deploy:functions` | Skips Hosting build, faster |
| `firestore.rules` or `storage.rules` only | `npm run deploy:rules` | Fastest; no build at all |
| `firestore.indexes.json` only | `firebase deploy --only firestore:indexes` | Index changes can take time to build server-side |

## Verify

After the deploy completes:

| Check | URL / command |
|---|---|
| SPA loads | https://simply-voice-452800.web.app |
| Sign-in flow | Sign out, sign back in |
| TTS works | Generate a clip end-to-end |
| Stripe checkout (test) | `/pricing` → **Upgrade to Pro** — Stripe page loads (don't complete unless intentional) |
| No new errors | `npm run logs` and tail for ~30 seconds |
| Webhook delivery (if Stripe touched) | Stripe Dashboard → Developers → Webhooks → endpoint history shows 200s |

## Rollback

### Frontend / Hosting

```bash
firebase hosting:rollback
```

Reverts to the previously deployed Hosting version. Instant; no rebuild required.

### Backend / Cloud Functions

There is no `functions:rollback` analogue. To revert:

```bash
git checkout <prior-commit-or-tag>
npm run deploy:functions
```

If the issue is a bad secret rotation, set the old value back with `firebase functions:secrets:set <NAME>` and redeploy.

### Firestore / Storage rules

Same pattern as functions — check out the prior commit and `npm run deploy:rules`.

### Firestore indexes

Indexes are additive and not easily rolled back. Avoid deleting a composite index used by production queries; instead, leave the old one in place while you migrate.

## After-the-fact

- If the deploy fixed an incident or shipped a notable feature, update the relevant spec's status to `complete` and move it from `docs/specs/active/` to `docs/specs/archive/`.
- If you discovered a new constraint or gotcha during deploy, capture it in the agent brief (`docs/documentation/agents/simply-voice.md` → Known gotchas) or in the relevant deep-dive.

## See also

- [DevOps deep dive](../deep-dives/devops.md) — full breakdown of `firebase.json`, secrets, and the script catalog
- [Production architecture](../deep-dives/production.md) — what actually runs after `firebase deploy`
- [Security](../deep-dives/security.md) — secret rotation procedure
