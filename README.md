# Simply Voice

Text-to-speech SaaS powered by Google Cloud TTS. Authenticated users convert text to WAV audio, save clips to personal history, and manage a monthly character quota. Paid subscribers unlock 10× the free limit via Stripe.

**Live:** https://simply-voice-452800.web.app

## Stack at a glance

Vite + React 18 (TS) on Firebase Hosting · Express on Firebase Cloud Functions v2 (Node 22) · Cloud Firestore · Firebase Storage · Google Cloud TTS · Stripe · GCP project `simply-voice-452800`.

## Quick start

```bash
npm run install:all     # root + functions/ + server/
npm run dev             # SPA on :8080, local TTS server on :3000
```

Prereqs: Node 22, `firebase-tools` (`firebase login`), `gcloud auth application-default login` for local Google TTS.

Pull the public Firebase web SDK config into `.env`:

```bash
firebase apps:sdkconfig WEB
```

Full onboarding: [`docs/documentation/guides/local-setup.md`](docs/documentation/guides/local-setup.md).

## Deploy

```bash
npm run deploy             # everything
npm run deploy:hosting     # frontend only
npm run deploy:functions   # backend only
npm run deploy:rules       # Firestore + Storage rules
npm run logs               # tail Cloud Function logs
```

Pre-flight checklist and rollback: [`docs/documentation/guides/deploy.md`](docs/documentation/guides/deploy.md).

## Documentation

This project uses Document-Driven Development. The root of all documentation is [`docs/`](docs/).

- **Start here:** [`docs/SUMMARY.md`](docs/SUMMARY.md)
- **Deep dives:** [production](docs/documentation/deep-dives/production.md) · [dev environment](docs/documentation/deep-dives/development-environment.md) · [features](docs/documentation/deep-dives/features.md) · [devops](docs/documentation/deep-dives/devops.md) · [API integrations](docs/documentation/deep-dives/api-integrations.md) · [security](docs/documentation/deep-dives/security.md)
- **Reference:** [repo doc](docs/documentation/repos/simply-voice.md) · [agent brief](docs/documentation/agents/simply-voice.md)
- **Specs:** [active](docs/specs/active/) · [ADRs](docs/specs/adrs/) · [archive](docs/specs/archive/)
- **Workflow:** [`docs/documentation/development-standards.md`](docs/documentation/development-standards.md)

New specs are created via slash commands: `/new-spec`, `/new-bug`, `/new-adr`, `/new-agent-brief`.
