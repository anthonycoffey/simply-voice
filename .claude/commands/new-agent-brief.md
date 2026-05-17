---
description: Create a new AI agent brief from the canonical template
---

Create a new agent brief — a service/repo interface document written for AI agents.

Steps:
1. Read the template at `docs/templates/agent-brief-template.md`.
2. Ask the user for:
   - The service/repo name (short, e.g. "tts-api", "frontend")
   - The brief ID (e.g. `AGENT-TTS-001`) — suggest the next sequential ID by scanning `docs/documentation/agents/`.
3. Create a new file at `docs/documentation/agents/<service-name-kebab-case>.md` using the template, with:
   - `id` set to the chosen ID
   - `title` set to the service name
   - `status: draft`
   - `created` set to today's date in `YYYY-MM-DD` format
   - `author` set to the current git user
4. Open the file for editing and confirm the path back to the user.

An agent brief should give an AI agent everything it needs to safely make changes inside this service: stack, entry points, public interface, dependencies, data ownership, configuration, and known gotchas.
