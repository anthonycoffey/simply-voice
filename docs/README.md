# Simply Voice — Documentation

This folder is the single source of truth for Simply Voice's specifications and documentation. It follows the Document-Driven Development (DDD) workflow defined in [SPEC-DDD-001](../README.md).

If you are looking for a quick orientation, start with the [SUMMARY](SUMMARY.md). For everything else, read on.

## How this folder is organised

```
docs/
├── README.md                       this file
├── SUMMARY.md                      table of contents
│
├── templates/                      canonical document templates — do not modify
│   ├── feature-template.md
│   ├── bug-template.md
│   ├── adr-template.md
│   └── agent-brief-template.md
│
├── specs/                          specifications (the "what")
│   ├── plans/                      multi-phase project plans and roadmaps
│   ├── active/                     features and bugs currently being worked on
│   ├── adrs/                       Architecture Decision Records — permanent
│   └── archive/                    completed or deprecated specs
│
├── documentation/                  reference material (the "how")
│   ├── README.md                   documentation index
│   ├── development-standards.md    workflow, TDD, spec lifecycle, git conventions
│   ├── agents/                     AI-agent service briefs
│   ├── guides/                     procedural how-to documents
│   ├── deep-dives/                 narrow technical reference (production, security, …)
│   └── repos/                      comprehensive per-repo technical reference
│
└── archive/                        deprecated non-spec documents
```

## Folder rules

| Folder | Rule |
|---|---|
| `templates/` | Canonical. Never modify without an ADR. |
| `specs/plans/` | Multi-phase plans. One file per plan. |
| `specs/active/` | Specs whose status is `draft`, `ready`, `in-progress`, or `review-pending`. |
| `specs/adrs/` | Permanent. Never delete or move. Supersede by creating a new ADR that references the old one. |
| `specs/archive/` | Specs whose status is `complete` or `deprecated`. Move from `active/` on transition. |
| `documentation/` | Reference docs. Update alongside the code they describe. |
| `archive/` | Deprecated non-spec documents. Add a "migrated to" or "deprecated by" note when moving. |

## Spec lifecycle

```
draft ── ready ── in-progress ── review-pending ── complete
                                                       │
                                                       └── (moved to specs/archive/)

(any status) ── deprecated ── (moved to specs/archive/)
```

The status field lives in the spec's YAML frontmatter. ADRs follow a different lifecycle (`draft → proposed → accepted → superseded`) and never move out of `specs/adrs/`.

## Workflow

1. **Plan** — for non-trivial work, write a plan in `specs/plans/`.
2. **Spec** — open a feature, bug, or ADR using the appropriate slash command (`/new-spec`, `/new-bug`, `/new-adr`). The spec is reviewed before any code is written.
3. **Test** — write failing tests against the spec's acceptance criteria (RED).
4. **Implement** — write the minimum code to pass the tests (GREEN), then refactor.
5. **Review** — transition the spec to `review-pending`. After approval, transition to `complete` and move to `specs/archive/`.

See [`documentation/development-standards.md`](documentation/development-standards.md) for the full process.

## Slash commands

| Command | Creates | Destination |
|---|---|---|
| `/new-spec` | Feature spec | `docs/specs/active/` |
| `/new-bug` | Bug spec (with severity) | `docs/specs/active/` |
| `/new-adr` | Architecture Decision Record | `docs/specs/adrs/` |
| `/new-agent-brief` | Agent brief | `docs/documentation/agents/` |

Each command reads the canonical template, prompts for the title and ID, fills in today's date and the current git user, and opens the file for editing.

## When you change code, also update the docs

| If you change … | Update … |
|---|---|
| A Cloud Function route | [`documentation/deep-dives/api-integrations.md`](documentation/deep-dives/api-integrations.md) and [`documentation/agents/simply-voice.md`](documentation/agents/simply-voice.md) |
| Firestore or Storage rules | [`documentation/deep-dives/security.md`](documentation/deep-dives/security.md) |
| The deploy scripts in `package.json` | [`documentation/deep-dives/devops.md`](documentation/deep-dives/devops.md) and [`documentation/guides/deploy.md`](documentation/guides/deploy.md) |
| The dev server, Vite config, or `.env` shape | [`documentation/deep-dives/development-environment.md`](documentation/deep-dives/development-environment.md) and [`documentation/guides/local-setup.md`](documentation/guides/local-setup.md) |
| The TTS quota, voice list, or pricing tiers | [`documentation/deep-dives/features.md`](documentation/deep-dives/features.md) |
| Firebase project ID, region, or hosting setup | [`documentation/deep-dives/production.md`](documentation/deep-dives/production.md) |

The root [`README.md`](../README.md) is intentionally minimal — keep deep content here.
