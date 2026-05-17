---
description: Create a new feature spec from the canonical template
---

Create a new feature spec for Document-Driven Development.

Steps:
1. Read the template at `docs/templates/feature-template.md`.
2. Ask the user for:
   - The feature title (short phrase)
   - The spec ID (e.g. `SPEC-AUTH-002`) — suggest the next sequential ID if unclear by scanning `docs/specs/active/` and `docs/specs/archive/`.
3. Create a new file at `docs/specs/active/<spec-id-kebab-case>.md` using the template, with:
   - `id` set to the chosen ID
   - `title` set to the user's title
   - `status: draft`
   - `created` set to today's date in `YYYY-MM-DD` format
   - `author` set to the current git user (`git config user.name`)
4. Open the file for editing and confirm the path back to the user.

Do not pre-fill any other fields — leave the body for the user to write.
