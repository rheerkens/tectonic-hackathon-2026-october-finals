# FINN: SDtrust knowledge companion

Built for the SD Worx challenge at the Tectonic hackathon finals, 20 October 2026.

FINN is a small mascot that lives in the bottom-right corner of your desktop, like the ChatGPT desktop companion. You ask FINN a question. FINN searches the signals your company already produces (Teams, mail, CRM) and comes back with **the answer or the next step**, plus **how much you can trust it** and **where it came from**. If FINN can't be sure, it says so and contacts the right colleague for you.

**Design principle:** zero unnecessary effort. FINN shows the answer and the next step, not the process. The user only gets involved when they actually need to act.

Developer setup, commands and repo conventions: [docs/development.md](docs/development.md) and [AGENTS.md](AGENTS.md).
Design concepts and the FINN mascot: [docs/design](docs/design).

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
3. **SDtrust app window (exists as the main window).** Today it opens at launch. For the demo it should open on demand. It has the result/trust page, history, active threads and settings. See concepts [01](docs/design/desktop_concepts/01.png), [02](docs/design/desktop_concepts/02.png) and [03](docs/design/desktop_concepts/03.png).

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

Each item can become one GitHub issue. Paths follow the feature layout in [AGENTS.md](AGENTS.md).

### 1. Demo scenarios and seed data (do this first)

Write two demo flows. For each one, describe:
- the question the user asks
- any follow-up question FINN asks
- which seeded records FINN finds
- what the mini bubble shows
- what the result page shows: answer, trust score and reasons, sources, people
- whether a next step is needed
- the exact tool calls the scripted agent makes, in order, with their arguments

Then write the seed data that makes the flow true.

- One scenario should end with a **high-trust answer**. The other should end with **low trust → FINN contacts a colleague** (this exercises the waiting/active-thread flow).
- Suggested starting points, taken from the challenge guide so the jury recognises them:
  - **A:** a new developer asks how the build/release pipeline works here.
  - **B:** a marketer asks who has run a campaign like this before and what worked. The seed data must include campaign outcomes (CRM fields or a retro thread), or FINN can only say who was involved.
  - [Concept 01](docs/design/desktop_concepts/01.png) also suggests a stale-knowledge case: Atlas onboarding moved from Team HR to Team Operations.
- **Paths:** `docs/demo/scenarios.md`, seed fixtures in `packages/db` or `features/knowledge`.
- **Done when:** both flows are written step by step, including the tool-call script, and the seed data contains every record they rely on.

### 2. Knowledge sources and search tools

- `features/knowledge`: the schema for people and source items (kind, author, date, channel, content), the seed, and the chat tools `search_sources` and `find_people` in `shared/tools.server.ts`.
- The tools query SQLite for real. The scripted agent decides *which* tool to call, but the results come from the seed, so the result page shows real provenance.
- **Done when:** the agent can call both tools and gets results for the demo scenarios.

### 3. FINN agent flow

- `features/finn`: ask a question, stream progress, return and store a `FinnResult`, and ask a follow-up question when the request is unclear.
- Includes the system prompt, the trust factors → score logic, and `contact_person`. `contact_person` creates a simulated Teams message and an active thread in the "waiting" state.
- Builds on the existing pi chat wiring.
- Includes the scripted `StreamFn` for both demo flows, selected with `FINN_AGENT=scripted`. This is the default for the demo.
- Stretch: the same flows through live Codex with a real system prompt.
- **Done when:** both demo questions produce a valid `FinnResult` through the scripted agent with real tool calls, without network access.

### 4. Electron shell: remaining work

Already on `main`: the pet window, the mini window, the main window, the compiled API binary, and CI builds.

- Start with only FINN visible. The main (SDtrust) window opens on demand: from the mini window, from the menu, or by the agent. Today it opens at launch, and closing it quits the app.
- IPC to open the main window on a given route, for example `/results/<id>`.
- Web fallback: FINN and the mini window also work in a normal browser for development.
- **Done when:** the app starts with only FINN on screen, and the result opens in the main window without a manual window switch.

### 5. Mascot states and animation

- Map FINN states to the existing sprite animations ([docs/design/finn_pet](docs/design/finn_pet)), and drive them from the FINN ask flow instead of the starter chat.
- Thinking state: icons for the sources being searched (Teams, mail, CRM) circle FINN's head. The pet window is only 96 × 104, so this needs a bigger window or icons inside that space.
- Turn the mini window into the FINN question and short-result view.
- **Done when:** every FINN state is visible and is driven by the ask flow, not by local clicks only.

### 6. Result and trust page

- The full page in the app window shows:
  - the answer, or "I'm not sure yet"
  - the trust score with its reasons
  - sources with their origin, kind icon and date
  - relevant people
  - the next step
- Calm, minimal look. Follow the concepts' palette: navy `#192D46`, ivory `#F8F6F1`, coral `#EE6558`, amber `#F3BA55`.
- **Done when:** both demo results render, and every claim on the page links back to a source.

### 7. Result delivery (to be designed: proposal only)

- Proposal: when FINN finishes, it shows the mini bubble. A setting "open result automatically" lets the agent open the full page itself.
- Make mocks first, then decide.
- **Done when:** the team has agreed on mocks and the chosen behaviour works.

### 8. Agent-driven UI

- v1: the UI tools from *Architecture* are executed by the client from the chat stream.
- Target: `execute_codesdk` with a small FINN SDK.
- **Done when:** the agent can change FINN's state and open the result page without a user click.

### 9. History, active threads, settings

- **History:** past questions and their results.
- **Active threads:** questions waiting on a colleague. In the demo, the reply can be triggered by a seeded or dev action.
- **Settings:**
  - which sources FINN may use (default: all)
  - open results automatically
  - FINN on the desktop
- These support the waiting flow. They are not the main experience, so keep them simple.
- **Done when:** a low-trust scenario shows up as an active thread and later resolves.

### 10. Pitch

- Answer the five "Show us how" questions below in one slide each, or fewer.
- Rehearse both demo flows end to end on the demo machine.
- Record a backup run in case the live run fails (`docs/demo/story.json`, video tooling).
- Be upfront that the demo agent is scripted, and explain that the tools, data flow and UI are the real path. If live Codex works, show one flow live as a bonus.

### 11. Jury-device build and test

- The demo runs on a jury device, Windows or macOS. CI already builds both (GitHub → Actions → Desktop → Artifacts).
- Test the CI `.exe` on the Windows laptop: transparency, always on top, dragging FINN, position with the taskbar and display scaling.
- Test on a Mac too if anyone has one; otherwise list macOS as untested.
- Test with networking disabled: both flows must run from the seed and the scripted agent.
- Builds are unsigned. Windows: "More info → Run anyway". Mac: `xattr -cr "/Applications/Day One.app"`. Rehearse this on a fresh machine, because the jury device will hit it.
- **Done when:** a packaged build runs both demo flows on the Windows laptop with networking off, and the macOS status is known.

### Suggested split (Sebastian, Roy, Wanne)

| Role | Owns |
|---|---|
| A: data and agent | 1 (lead, together with the team), 2, 3 |
| B: desktop and FINN | 4, 5, 8, 11 |
| C: app window | 6, 7, 9 |

We push directly to `main` and write no tests (see [AGENTS.md](AGENTS.md)). Run `bun run check` before every push.
| Everyone | 10 |

Fix the contract early: agree on `FinnResult` and the UI command list before splitting up, because B and C build against mocks of them.

## Cut line

When we're behind, cut from the bottom of this list:

1. Both demo flows working end to end through the scripted agent. *(must have)*
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
| Invisible UI, calm technology | Mascot only; the answer, not the process; the user acts only when needed | Planned (4, 5) |
| Fit existing ways of working | Reads Teams, mail and CRM; contacts people via Teams | Planned, data simulated (2) |
| Beyond documents: who knows this? | Results list relevant people; low trust routes to a person | Planned (3, 6) |
| Understandable when people decide or act | Trust score with reasons, and every claim linked to a source | Planned (6) |
| Learn from everyday work signals | Knowledge comes from messages, mails and CRM, not from written docs | Partly: we search at question time, we don't build a profile in the background |
| Stay up to date as people and roles change | Recency and conflicting sources lower trust ([concept 01](docs/design/desktop_concepts/01.png)) | Planned in trust factors (3) |
| Verify when human judgement adds value | Low trust → FINN asks the colleague who knows | Planned (3, 9) |

### "Show us how" (draft answers for the pitch)

1. **What happens automatically?** Searching every source, weighing how recent and consistent the sources are, picking the right person, and drafting the message to them.
2. **When is human verification valuable?** Only when sources conflict or are stale, so trust is low. Then FINN asks the one person who can confirm.
3. **How is maintenance avoided?** Nobody writes documentation. FINN reads what people already write in Teams, mail and CRM. A colleague's reply becomes a new source.
4. **How does it fit the workflow?** It lives on the desktop and reaches people through Teams. The user never has to open another tool unless they want the details.
5. **How does it stay understandable?** Every answer shows its trust score, the reasons for it, and the sources it came from.

## Open questions

- **Naming.** Is the app window "SDtrust", as in the concepts? Is the mascot "FINN" or "Finn"?
- **Demo time and pitch length.** These decide where the cut line falls.
