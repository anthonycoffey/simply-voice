---
description: Create a new Architecture Decision Record from the canonical template
---

Create a new Architecture Decision Record (ADR).

Steps:
1. Read the template at `docs/templates/adr-template.md`.
2. Ask the user for:
   - The decision title (short phrase, e.g. "Use Firestore over Postgres")
   - The ADR ID (e.g. `ADR-DATA-003`) — suggest the next sequential ID by scanning `docs/specs/adrs/`.
3. Create a new file at `docs/specs/adrs/<adr-id-kebab-case>.md` using the template, with:
   - `id` set to the chosen ID
   - `title` set to the user's title
   - `status: draft`
   - `created` set to today's date in `YYYY-MM-DD` format
   - `author` set to the current git user
4. Open the file for editing and confirm the path back to the user.

Reminder: ADRs are permanent records. Once accepted, they are never deleted or moved to the archive — supersede them by creating a new ADR that references the old one.
