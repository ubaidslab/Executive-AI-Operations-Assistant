<h1 align="center">🧭 Atlas — Executive AI Operations Assistant</h1>

<p align="center">
  A chat agent that actually calls tools — checks your schedule, manages tasks, drafts email
  replies, summarizes documents — via a hand-rolled, provider-agnostic reasoning loop.
</p>

<p align="center">
  <a href="https://github.com/ubaidslab/Executive-AI-Operations-Assistant/actions/workflows/ci.yml"><img src="https://github.com/ubaidslab/Executive-AI-Operations-Assistant/actions/workflows/ci.yml/badge.svg" alt="CI status"></a>
  <img src="https://img.shields.io/badge/Next.js-14-black?logo=next.js" alt="Next.js 14">
  <img src="https://img.shields.io/badge/TypeScript-strict-blue?logo=typescript" alt="TypeScript strict">
  <img src="https://img.shields.io/badge/license-MIT-green" alt="MIT license">
</p>

---

## Contents

- [What this is](#what-this-is)
- [Screenshot](#screenshot)
- [Why this exists (and what it's not)](#why-this-exists-and-what-its-not)
- [Architecture](#architecture)
- [Tech stack](#tech-stack)
- [Getting started](#getting-started)
- [Configuration](#configuration)
- [Testing & CI](#testing--ci)
- [Project structure](#project-structure)
- [Security & scope notes](#security--scope-notes)
- [Roadmap](#roadmap)
- [License](#license)

## What this is

Ask it "what's on my plate today," and it doesn't guess — it calls a tool, reads your actual
schedule and tasks, and answers from that. Ask it to draft a reply to an email, and it produces
a draft for you to review, never sends anything. Ask it to reschedule a meeting or log a task,
and it does — through the same tool-calling loop, with the same tool-call trace visible in the
UI so you can see exactly what it did and why.

## Screenshot

![Atlas chat interface with tool-call trace and operations sidebar](./docs/screenshots/assistant.png)

## Why this exists (and what it's not)

Most portfolio chatbots are single-turn Q&A: prompt in, text out. That's not what "AI
Operations Assistant" work actually looks like — it's an agent deciding *which action to take*,
taking it, and reasoning about the result. This project exists to demonstrate exactly that
loop, end to end, in a way that's honest about its own scope:

- **The calendar and tasks are a local, seeded dataset** — not a real Google Calendar/Outlook
  integration. Real OAuth integration is a substantial project on its own (see
  [Roadmap](#roadmap)); this focuses on getting the agent-loop mechanics right first.
- **Email drafting never sends anything.** `draft_email_reply` produces text for a human to
  review and send themselves — on purpose, not as a missing feature. An assistant that can take
  irreversible action on your behalf needs a much higher trust bar than a portfolio demo.
- **The reasoning loop is hand-rolled, not a provider's native function-calling API** — see
  [Architecture](#architecture) for why, and what that trades off.

## Architecture

```mermaid
flowchart LR
    UI["Chat UI (app/assistant/page.tsx)\nshows the tool-call trace inline"]
    Route["/api/assistant\nvalidate -> rate-limit -> run agent"]
    Loop["lib/agent/run.ts\nReAct-style loop, max 5 iterations"]
    Parse["lib/agent/parse.ts\nparses the model's JSON action"]
    Tools["lib/tools/*\nget_schedule, create_task, reschedule_event,\ndraft_email_reply, summarize_document, ..."]
    AI["lib/ai/generate.ts\nCloudflare / OpenAI"]
    DB[("SQLite / Turso\nevents, tasks, drafts")]

    UI -- "POST messages[]" --> Route
    Route --> Loop
    Loop --> AI
    AI -- "raw text" --> Parse
    Parse -- "tool call" --> Tools
    Tools --> DB
    Tools -- "result" --> Loop
    Loop -- "loop until {\"final\": ...}" --> Loop
    Loop -- "reply + step trace" --> UI
```

**Why hand-rolled instead of a provider's native `tools`/`tool_choice` API:** the system prompt
tells the model the available tools and asks it to respond with one JSON action
(`{"tool": ..., "args": ...}` or `{"final": ...}`) per turn; `lib/agent/run.ts` parses that,
executes the tool locally, feeds the result back as a plain message, and loops. This means the
exact same loop works identically regardless of which provider is behind `AI_PROVIDER` — it only
ever needs "take chat messages, return text," not a specific vendor's structured tool-calling
feature — at the cost of relying on the model reliably following the JSON-output instruction,
which `lib/agent/parse.ts` handles defensively (stripping markdown code fences, falling back to
treating unparseable output as a final answer rather than crashing).

## Tech stack

| Layer | Choice |
|---|---|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript (strict) |
| Styling | Tailwind CSS |
| Database | SQLite (local dev) via Drizzle ORM — swap to Turso for production with one env var |
| AI providers | Cloudflare Workers AI (default), OpenAI-compatible (optional) |
| Testing | Vitest |
| CI | GitHub Actions (lint/typecheck/test/build) |

## Getting started

**Prerequisites:** Node.js 18.18+ (Node 22 recommended), npm.

```bash
git clone https://github.com/ubaidslab/Executive-AI-Operations-Assistant.git
cd Executive-AI-Operations-Assistant
npm install
cp .env.example .env.local   # add an AI provider key — see Configuration below
npm run db:seed              # creates local.db and seeds a realistic day/week
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) — it redirects to `/assistant`. Try one of
the suggested prompts, or ask your own. Without an AI provider key configured, the agent loop
still runs and the tool calls still work — the first call to the LLM will just fail clearly,
same honest-error approach as the sibling projects.

## Configuration

See [`.env.example`](./.env.example) for the full list.

| Variable | Required | Purpose |
|---|---|---|
| `DATABASE_URL` | no (default `file:./local.db`) | SQLite locally, `libsql://...` for Turso in production |
| `AI_PROVIDER` | no (default `cloudflare`) | `cloudflare` or `openai` |
| `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_API_KEY` | if using Cloudflare | [Free tier](https://developers.cloudflare.com/workers-ai/) |
| `CLOUDFLARE_MODEL` | no | Pick one with solid instruction-following — the agent loop depends on the model reliably emitting JSON |
| `OPENAI_API_KEY` | if using OpenAI | — |

## Testing & CI

```bash
npm run lint       # ESLint
npm run typecheck  # tsc --noEmit
npm test           # Vitest — action parsing, date resolution, input validation, rate limiter
npm run build       # production build
```

All four run in CI on every push and pull request to `main`.

**Testing this yourself:** for a full step-by-step walkthrough — install, seed, see what works
with zero AI key configured, wire up a provider, and drive the actual tool-calling loop from the
chat UI — see [`docs/TESTING_GUIDE.md`](./docs/TESTING_GUIDE.md).

## Project structure

```
app/
  assistant/            # chat UI: messages, tool-call trace, schedule/tasks sidebar
  api/
    assistant/           # POST — validate, rate-limit, run the agent loop
    schedule/, tasks/     # GET — direct reads for the sidebar (no LLM call needed)
lib/
  agent/
    run.ts               # the ReAct-style loop
    parse.ts              # parses the model's raw output into a structured action
  tools/
    registry.ts           # tool specs (name, description, args) — feeds the system prompt
    executors.ts           # what each tool actually does against the database
    date-utils.ts           # date-keyword resolution, duration-preserving reschedule math
  ai/generate.ts          # Cloudflare/OpenAI, non-streaming (the loop needs a full response to parse)
  validate/                # input validation for the chat endpoint
  db/                      # Drizzle schema, client, migrate, seed
docs/screenshots/          # README images
```

## Security & scope notes

- **No irreversible actions are exposed as tools.** Every tool either reads data or writes to
  this app's own local database (tasks, events, drafts) — nothing calls a real email, calendar,
  or messaging API on the user's behalf. `draft_email_reply` is a text generator, not a sender.
- **Rate limiting is best-effort, not distributed** — an in-memory limiter scoped to a single
  server instance, same honest limitation as the sibling projects. Fine for a demo; put a real
  store (Upstash/Redis) in front of this for production traffic.
- **Input validation lives at the one real trust boundary** (`lib/validate/conversation.ts`):
  message count, role, and length are all checked before anything reaches the agent loop.
- **The agent loop is capped at 5 tool-call iterations** to guarantee termination — a model that
  gets stuck in a call-a-tool loop returns a clear "couldn't finish" message instead of running
  forever or burning unbounded API spend.
- **Secrets never touch the client.** Provider keys are read from `process.env` inside
  server-only routes.
- **Known upstream advisories:** `npm audit` reports high-severity issues that only resolve by
  moving from Next.js 14 to Next.js 16 (a React 19 + ESLint 9 migration, not a patch bump). This
  app doesn't use the specific features those advisories target, so exposure is low, but the
  honest status is "outstanding, tracked, mitigated by non-use," not "clean." The safe patch
  that *was* a drop-in (Next.js 14.2.35) is applied.
- **Two critical advisories in that same set, named precisely rather than lumped in above:**
  - [GHSA-2xp9-vwfh-vxw4](https://github.com/advisories/GHSA-2xp9-vwfh-vxw4) (CVSS 9.5) — a
    remote code execution issue in Next's built-in Image Optimization API when processing AVIF
    input, unpatched on the 14.2.x line. This app never renders images through `next/image`, so
    the vulnerable endpoint has no reason to be reachable — and rather than rely on "we don't
    happen to call it," `next.config.mjs` sets `images.unoptimized: true`, which disables the
    Image Optimization API outright. That's the same interim mitigation the advisory itself
    recommends for apps that can't yet move to a patched major version.
  - [CVE-2026-75604](https://github.com/advisories/GHSA-p293-qw3h-jr36) (CVSS 9.0) — a
    path-traversal RCE, also unpatched on 14.2.x, but explicitly scoped to Windows filesystem
    semantics. This project has no documented Windows deployment path (typical hosting for a
    Next.js app — Vercel, or a container built on a Linux base image — isn't exposed to it), so
    it's listed here for completeness rather than left unmentioned because it sounds
    inconvenient.

## Roadmap

- [ ] Real calendar integration (Google Calendar / Microsoft Graph OAuth) behind the same
      `get_schedule` / `reschedule_event` tool interface — the tool contract wouldn't need to
      change, only what's behind it.
- [ ] Real email sending, gated behind an explicit human confirmation step per draft — never
      silent, never automatic.
- [ ] Multi-turn tool-call streaming to the UI (show each step as it happens, not just after
      the loop finishes).
- [ ] Swap the hand-rolled loop for a provider's native function-calling API as an alternative
      mode, to compare reliability/latency against the current approach.
- [ ] End-to-end tests (Playwright) alongside the existing unit tests.

## License

MIT — see [LICENSE](./LICENSE).

---

Built by [@ubaidslab](https://github.com/ubaidslab).
