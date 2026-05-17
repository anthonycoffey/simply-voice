---
description: Create a new bug spec from the canonical template
---

Create a new bug report spec for Document-Driven Development.

Steps:
1. Read the template at `docs/templates/bug-template.md`.
2. Ask the user for:
   - The bug title (short phrase)
   - The bug ID (e.g. `BUG-TTS-004`) — suggest the next sequential ID by scanning `docs/specs/active/` and `docs/specs/archive/`.
   - The severity: `P0` (production down), `P1` (major broken), `P2` (significant), or `P3` (minor)
3. Create a new file at `docs/specs/active/<bug-id-kebab-case>.md` using the template, with:
   - `id` set to the chosen ID
   - `title` set to the user's title
   - `status: draft`
   - `severity` set to the chosen severity
   - `created` set to today's date in `YYYY-MM-DD` format
   - `author` set to the current git user
4. Open the file for editing and confirm the path back to the user.

Do not pre-fill any other fields — leave the body for the user to write.
