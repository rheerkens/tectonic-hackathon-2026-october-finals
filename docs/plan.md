# FINN: SDtrust knowledge companion

Built for the SD Worx challenge at the Tectonic hackathon finals, 20 October 2026.

> **Status at finals.** Answers are scripted in the web client (`apps/web/src/state/finn-scenarios.ts`, replayed by `finn.ts`); see [the architecture](architecture.md#finn-flow). The planned backend agent, its tools, the seeded Teams/mail/CRM tables and the `FINN_AGENT` switch were not built. The desktop app starts with Finn and the mini window only; the main window opens on demand. The rest of this page is the original plan.

FINN is a small mascot that lives in the bottom-right corner of your desktop, like the ChatGPT desktop companion. You ask FINN a question. FINN searches the signals your company already produces (Teams, mail, CRM) and comes back with **the answer or the next step**, plus **how much you can trust it** and **where it came from**. If FINN can't be sure, it says so and contacts the right colleague for you.

**Design principle:** zero unnecessary effort. FINN shows the answer and the next step, not the process. The user only gets involved when they actually need to act.

Developer setup, commands and repo conventions: [docs/development.md](development.md) and [AGENTS.md](../AGENTS.md).
Design concepts and the FINN mascot: [docs/design](design).

---

## Decisions

| Topic | Decision |
|---|---|
| Platform | **Electron desktop app** (`apps/desktop`, already on `main`) for the demo. Every push to `main` builds a Mac `.dmg` and a Windows `.exe` in CI. The jury device runs Windows or macOS; which one is unknown. During development we use the web variant (`bun dev`) or `bun run desktop`. If Electron blocks us, the web variant is the fallback. |
| Language | **English** UI copy. The design concepts use Dutch; translate their labels. |
| Data | **Fake.** Synthetic Teams messages, mails and CRM records live in SQLite and are seeded in dev mode (`seedDatabase`). The packaged app runs the same seed on start. The first version may mock search results completely. Real connectors only if time is left. |
| AI | **The demo uses a scripted agent, not a live model.** For each demo question, a scripted model replays the right tool calls in the right order. The tools themselves are real and query the seeded SQLite. The demo therefore works offline and on the jury device, with no login. Live Codex through pi (already in the starter) stays available for development and is a stretch goal for the demo. |
| Users | **One user in the demo.** "Contacting a colleague" is simulated: FINN shows that it sent a Teams message and the conversation waits for a reply. |
| Score | **Trust in the result.** Not "how well does a person match". Low trust means FINN tells the user and proposes, or takes, a next step. |
| Process vs result | FINN shows the answer or next step. The result page shows provenance so the user can check *why*. |
| Agent and UI | The agent can drive the whole UI: navigate, open pages, change FINN's state, ask follow-up questions. |
| Privacy | The user chooses in Settings which sources FINN may use. For the demo, everything is on by default. |
| Model | Scripted agent for the demo, Codex for live runs. Switched by one setting, for example `FINN_AGENT=scripted\|codex`. |

## Product surfaces

```text
┌──────────────────────────────┐
│ SDtrust app window           │   ┌─────────────┐
│  Result / trust page         │   │ mini window │  ← ask + short result,
│  History                     │   │             │    next to FINN
│  Active threads (waiting)    │   └─────────────┘ 🧑 FINN  ← transparent, always on top,
│  Settings                    │                            draggable, bottom-right
└──────────────────────────────┘
```

1. **FINN (pet window, exists).** A small, transparent, always-on-top window (`/pet`) that can be dragged. It has sprite animations: `idle`, `waving`, `waiting`, `running`, `jumping`, `failed`, `review` (`apps/web/src/state/pet.ts`). FINN states map onto them: asking, thinking, needs input, done, waiting (FINN contacted someone).
2. **Mini window (exists as a chat).** A floating window next to FINN (`/mini`), opened by clicking FINN. It becomes the place to ask a question and to see the short answer, trust level and next step. Clicking the result opens the full result page.
3. **SDtrust app window (exists as the main window).** Today it opens at launch. For the demo it should open on demand. It has the result/trust page, history, active threads and settings. See concepts [01](design/desktop_concepts/01.png), [02](design/desktop_concepts/02.png) and [03](design/desktop_concepts/03.png).

## Architecture

```text
Electron (apps/desktop)
  ├─ mascot window  ─┐
  └─ app window     ─┴─ load Vite web app routes (apps/web)
                            │  HTTP + chat stream
                            ▼
                     Hono API (apps/api) ── pi runner ── StreamFn
                                                         ├─ scripted (demo, offline)
                                                         └─ Codex (live, optional)
                            │
                       tools │ search_sources, find_people, contact_person, ui.*
                            ▼
                     SQLite (seeded synthetic Teams / mail / CRM)
```

- Electron is a thin shell. All three windows load routes from the web app served by the local API, so the web fallback is the same code. The API and agent stay server-side, as in the starter. Windows share one origin, so FINN's mood travels over a `BroadcastChannel` instead of IPC.
- **Scripted agent.** pi's runner already accepts an injected `StreamFn` (`createRunner({ streamFn })` in `packages/ai`; the tests use the same seam). The scripted `StreamFn` matches the demo question and emits a fixed sequence of tool calls and a final text. pi executes the real tools. The UI, tools and stream are identical to the live path; only the model is replaced.
  - Add small delays between steps so the thinking state is visible.
  - Script the follow-up question as well: the scripted agent asks the user, waits for the answer, then continues.
  - An unknown question gets a polite fixed reply ("I can only answer the demo questions right now"), not a crash.
- **Packaged app runs fully offline (already wired).** Electron main starts a compiled API binary on a free local port with `NODE_ENV=development` and `AUTH_MODE=dev`. That binary serves the built web app, migrates and seeds SQLite in the user-data folder. The demo seed and the scripted agent must therefore live in the API and `seedDatabase`, not in a dev-only script. Never set `NODE_ENV=production` there: the API rejects synthetic users in production mode.
- **How the agent drives the UI.** The agent calls UI tools, the commands arrive in the client through the chat stream, and the renderer executes them. Realtime messages stay change signals only, as AGENTS.md requires.
  - **v1:** a few fixed commands (`navigate`, `open_result`, `set_finn_state`, `ask_user`) executed by plain client JavaScript.
  - **Target:** one `execute_codesdk` tool. The agent writes a short script against a small typed FINN SDK, and the renderer runs it in a sandbox.
  - Never `eval` agent code in a renderer with Node access. Keep `contextIsolation` on.

### Result contract (proposal: fix this first, everyone builds against it)

```ts
type FinnResult = {
  question: string;
  answer: string | null;            // null when FINN cannot answer yet
  trust: {
    score: number;                  // 0..1, shown as high / medium / low
    reasons: string[];              // e.g. "2 recent sources agree", "newest source is 8 months old"
  };
  sources: Array<{
    kind: "teams" | "mail" | "crm";
    title: string;
    author: string;
    date: string;                   // ISO
    excerpt: string;
  }>;
  people: Array<{ name: string; role: string; why: string }>;
  nextStep:
    | { kind: "none" }
    | { kind: "clarify"; question: string }                   // FINN asks the user
    | { kind: "contact_person"; person: string; message: string; threadId: string };
};
```

Proposal for the score: the agent returns the trust *factors* (agreement between sources, recency, whether the source is authoritative, conflicts). The code turns those factors into a score, so every number on screen has visible reasons.

---

## Work breakdown

We build **UI first, against mocks**. The real backend follows once the demo scripts are clear. Detailed scope and acceptance criteria live in the GitHub issues; pick one up and assign yourself.

**Phase 1: UI against a mock flow** (label `phase:1-ui-mock`)

| Issue | Area | Cut line |
|---|---|---|
| [#1 Script the two demo scenarios and plan the phase 2 tasks](https://github.com/rheerkens/tectonic-hackathon-2026-october-finals/issues/1) | planning | must |
| [#2 Mock FINN flow: types, fixtures and a shared `useFinn()` hook](https://github.com/rheerkens/tectonic-hackathon-2026-october-finals/issues/2) | ui | must, do it first |
| [#3 Desktop: start with only FINN visible, open the main window on demand](https://github.com/rheerkens/tectonic-hackathon-2026-october-finals/issues/3) | desktop | must |
| [#4 FINN pet states and thinking animation](https://github.com/rheerkens/tectonic-hackathon-2026-october-finals/issues/4) | desktop | must |
| [#5 Mini window: ask, follow-ups, short result](https://github.com/rheerkens/tectonic-hackathon-2026-october-finals/issues/5) | ui | must |
| [#6 Result and trust page](https://github.com/rheerkens/tectonic-hackathon-2026-october-finals/issues/6) | ui | must |
| [#7 Result delivery: mocks and proposal](https://github.com/rheerkens/tectonic-hackathon-2026-october-finals/issues/7) | ui | should |
| [#8 History, active threads and settings](https://github.com/rheerkens/tectonic-hackathon-2026-october-finals/issues/8) | ui | should |
| [#9 Agent-driven UI v1: UI command executor](https://github.com/rheerkens/tectonic-hackathon-2026-october-finals/issues/9) | ui | should |
| [#10 Test the packaged app on Windows / macOS, offline](https://github.com/rheerkens/tectonic-hackathon-2026-october-finals/issues/10) | desktop | must |
| [#11 Pitch, rehearsal and backup recording](https://github.com/rheerkens/tectonic-hackathon-2026-october-finals/issues/11) | pitch | must |

**Phase 2: the real app.** #1 produces these issues once the scenario scripts settle which tools and methods we need. Expected: shared contracts, knowledge schema and seed, search tools, the scripted agent `StreamFn`, the FINN ask flow and trust score, `contact_person`, swapping the UI from mock to real. Stretch: live Codex, `execute_codesdk`.

The mock in #2 sits behind the same `useFinn()` hook the real flow will use, so the phase 1 UI survives phase 2 unchanged.

Team: Sebastian, Roy, Wanne. We push directly to `main` and write no tests (see [AGENTS.md](../AGENTS.md)). Run `bun run check` before every push.

## Cut line

When we're behind, cut from the bottom of this list:

1. Both demo flows working end to end: mock flow first (#2), scripted agent in phase 2. *(must have)*
2. FINN starts alone on screen in the packaged app. *(fallback: web route)*
3. Result page with trust reasons and source provenance.
4. Low-trust → contact person → active thread flow.
5. Thinking animation with source icons.
6. Agent-driven UI beyond opening the result.
7. `execute_codesdk`, history page polish, live Codex, real connectors. *(stretch)*

Keep a recorded backup of the demo in case the jury device misbehaves.

---

## Challenge coverage (SD Worx, finals guide p.10)

The challenge: turn fragmented organisational knowledge into a trusted shared resource that stays useful, reliable and up to date, without people having to document or maintain it. "The goal is not zero human involvement. The goal is zero unnecessary effort."

| Challenge ask | How FINN answers it | Status |
|---|---|---|
| Invisible UI, calm technology | Mascot only; the answer, not the process; the user acts only when needed | Built: pet, mini window, answer not process |
| Fit existing ways of working | Reads Teams, mail and CRM; contacts people via Teams | Simulated: scripted sources, faked Teams heads-up |
| Beyond documents: who knows this? | Results list relevant people; low trust routes to a person | Built: results and Experts page name people |
| Understandable when people decide or act | Trust score with reasons, and every claim linked to a source | Built: result page with trust reasons and sources |
| Learn from everyday work signals | Knowledge comes from messages, mails and CRM, not from written docs | Partly: we search at question time, we don't build a profile in the background |
| Stay up to date as people and roles change | Recency and conflicting sources lower trust ([concept 01](design/desktop_concepts/01.png)) | Scripted: stale/conflicting sources lower trust in the fixtures |
| Verify when human judgement adds value | Low trust → FINN asks the colleague who knows | Built: scripted expert call confirms the answer |

### "Show us how" (draft answers for the pitch)

1. **What happens automatically?** Searching every source, weighing how recent and consistent the sources are, picking the right person, and drafting the message to them.
2. **When is human verification valuable?** Only when sources conflict or are stale, so trust is low. Then FINN asks the one person who can confirm.
3. **How is maintenance avoided?** Nobody writes documentation. FINN reads what people already write in Teams, mail and CRM. A colleague's reply becomes a new source.
4. **How does it fit the workflow?** It lives on the desktop and reaches people through Teams. The user never has to open another tool unless they want the details.
5. **How does it stay understandable?** Every answer shows its trust score, the reasons for it, and the sources it came from.

## Open questions

- **Naming.** Is the app window "SDtrust", as in the concepts? Is the mascot "FINN" or "Finn"?
- **Demo time and pitch length.** These decide where the cut line falls.
