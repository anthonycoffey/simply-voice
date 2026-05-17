# Development Standards

How we work. This document is project-agnostic: it describes the DDD/TDD process and version-control conventions, not the specifics of any single feature.

## The process

```
plan ── spec ── test ── implement ── review ── archive
```

1. **Plan.** For any non-trivial change, write a short plan in `docs/specs/plans/` describing the problem, the approach, and the files that will change. A plan is not yet a spec — it's a sketch of intent.
2. **Spec.** Open a feature, bug, or ADR using the appropriate slash command. The spec lives in `docs/specs/active/` and is reviewed before code is written. The spec defines acceptance criteria.
3. **Test.** Write failing tests against the acceptance criteria (RED).
4. **Implement.** Write the minimum code to pass the tests (GREEN), then refactor with the test suite as a safety net (REFACTOR).
5. **Review.** Transition the spec to `review-pending`. Reviewer adds notes to the **Reviewer Notes** section at the top of the spec. After approval, transition to `complete` and move the file to `docs/specs/archive/`.

## Spec lifecycle

The `status` field in the YAML frontmatter follows this state machine:

```
draft ──► ready ──► in-progress ──► review-pending ──► complete
   │        │            │                  │              │
   │        │            │                  │              └─► move to specs/archive/
   │        │            │                  │
   └────────┴────────────┴──────────────────┴─► deprecated ─► move to specs/archive/
```

| Status | Meaning |
|---|---|
| `draft` | Being written. Not yet reviewed. Subject to change. |
| `ready` | Reviewed and approved for implementation. No code yet. |
| `in-progress` | Code is being written. Tests exist. |
| `review-pending` | Implementation complete, awaiting code review. |
| `complete` | Reviewed, merged, deployed. Move to `specs/archive/`. |
| `deprecated` | No longer relevant. Add a note explaining why. Move to `specs/archive/`. |

ADRs follow a separate lifecycle (`draft → proposed → accepted → superseded`) and never move out of `specs/adrs/`.

## Test-Driven Development

We follow RED → GREEN → REFACTOR:

1. **RED** — write a test that captures one acceptance criterion. Run it. Confirm it fails for the expected reason.
2. **GREEN** — write the simplest code that makes the test pass. Resist the urge to generalise.
3. **REFACTOR** — with the test as a safety net, improve the design. Extract functions, rename, remove duplication.

Repeat for each acceptance criterion. The spec's **Acceptance criteria** section is the test-writing checklist.

Frameworks are unopinionated — pick what fits the layer being tested. The methodology matters more than the tool.

## Version control conventions

### Branch naming

```
<type>/<short-kebab-case-summary>

types: feat, fix, chore, docs, refactor, test, perf
```

Examples: `feat/stripe-portal-button`, `fix/webhook-signature-race`, `docs/initial-ddd-scaffold`.

### Commit messages

Conventional Commits, short imperative subject, optional body:

```
<type>: <subject>

<optional body explaining why, not what>
```

Examples:

```
feat: add Stripe customer portal redirect
fix: capture Stripe raw body for signature verification
docs: scaffold DDD documentation tree
```

### Linking specs and commits

Reference the spec ID in the commit body when relevant:

```
feat: enforce monthly character quota

Implements SPEC-TTS-004. Reads subscriptions/{uid} and profiles/{uid}
in parallel, returns 429 with usage payload when over limit.
```

### Pull requests

- Title mirrors the commit subject.
- Body links the spec(s) being implemented.
- Reviewer adds review notes to the spec's **Reviewer Notes** section (not just the PR), so the record survives after the PR is merged.

## Documentation and code stay in sync

If a code change makes a doc inaccurate, update the doc in the same PR. The cross-reference table in [`../README.md`](../README.md) lists the most common code → doc mappings.
