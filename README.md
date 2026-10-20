# Day One

A one-day hackathon starter for parallel agents on Linux and macOS development hosts. React/Vite web, Bun/Hono API, Drizzle/SQLite, and an isolated pi workspace. T3 manages tasks, hosts, and worktrees.

The working example includes synthetic sign-in, workspace membership, viewer/editor/owner roles, private persistent chat, and authorized SQLite notes tools. UI foundations and lifecycle code come from the previous hackathon; [the reuse record](docs/reuse.md) names the sources and adaptations.

## Start

Install the Bun version in `.bun-version`, then run:

```sh
bun setup
bun dev
```

Setup installs the frozen lockfile and creates `.env.local` without overwriting it. It does not start an app. `bun dev` migrates/seeds the local database, starts Vite and the API, and prints a Tailscale URL.

For a ZIP download, run `git init -b main` before starting the app. Commit the baseline before creating T3 worktrees. A Git clone already has this metadata.

Choose Alex to edit notes, Sam to read, Jordan as workspace owner, or Casey for a separate workspace. Sign out to switch. These are synthetic development identities.

Chat uses the existing Codex login on the API host. No login is copied into worktrees. The UI shows an actionable message when login is missing or expired. `CHAT_MODEL` defaults to the previous project's `gpt-6-luna`; the pinned pi catalog resolves it. Chat calls use your signed-in account. No live model call runs in the required check.

## Commands

| Command | Purpose |
| --- | --- |
| `bun setup` | Prepare dependencies and checkout-local env |
| `bun dev --profile demo` | Start another isolated app stack |
| `bun run dev:status --profile demo` | Show environment metadata |
| `bun run dev:stop --profile demo` | Ask that environment's owner to stop its children |
| `bun run dev:env --profile demo` | Print non-secret URLs and database path as JSON |
| `bun doctor` | Inspect claims, ownership, and Tailscale |
| `bun run check` | Parallel lint, typecheck, boundaries, real tests, Vite build |
| `bun run db:generate` | Generate a committed SQLite migration |
| `bun run db:migrate` / `db:seed` | Prepare the selected `DATABASE_PATH` |
| `bun run test:e2e` | Separate browser smoke against the ready dev profile |
| `LIVE_CHAT_SMOKE=1 bun run test:e2e` | Explicit smoke with the host's live model login |
| `bun run test:isolation` | Separate two-clone/process/data isolation check |
| `bun run video:doctor` | Check optional presentation prerequisites |

Root database commands default to `.local/dev/app.sqlite`. To use a different database, set `DATABASE_PATH` explicitly. `dev:env` prints JSON, not shell commands; inspect it rather than using shell `eval`.

## Workspaces

```text
apps/web           React pages/components, session adapters, app state composition
apps/api           Hono middleware, authentication, action route composition
features/notes     create/list actions: contract, client, state, server, tests
features/chat      create/list/history/send/status actions and shared pi adapters
features/workspaces list action with membership-scoped results
packages/contracts Shared identity, roles, and persisted tool-result contracts
packages/http      Browser-safe authenticated transport and response parsing
packages/server    Server-only permissions, errors, HTTP setup, test fixtures
packages/db        SQLite client, schema, migrations, synthetic fixtures
packages/ai        Generic pi runner, provider transport, offline tests
tools/dev          Worktree/profile discovery and owned app lifecycle
tools/e2e          Separate browser smoke and real presentation capture
tools/video        Local/ElevenLabs narration and FFmpeg editing
.agents/skills/presentation-video  Portable presentation instructions
```

Add `apps/mobile` when a mobile requirement arrives. Reuse the feature contracts, typed clients, and compatible state hooks. Mobile calls the API; it does not import the server database or pi runtime.

Each feature is one Bun workspace. Actions are folders inside that workspace, with explicit package exports for `contract.ts`, `client.ts`, `state.ts`, and `server.ts`. Run focused action tests with `bun test features/notes/create` or `bun test features/chat/send`.

Pages consume feature hooks and pass data/actions into visual components. Action state owns queries, mutations, loading/errors, and cache refresh. Query keys include user/workspace scope; changing identity creates a new cache. Browser/server and UI/state import checks run in the merge gate. See [the architecture](docs/architecture.md) for the complete request flow and notes-create example. Shared behavior includes Zod field errors, typed API errors with request IDs, a 15-second request deadline, one transient GET retry, safe request logs and in-memory draft recovery after sign-in expires.

## Parallel agents

T3 runs the `t3.json` setup hook after creating a worktree. Each worktree/profile has `.local/<profile>/app.sqlite`, two ports, logs, and runtime metadata. Port leases cover separate clones run by the same OS user on one host. Strict binds also detect unrelated listeners. Separate users still get bind-failure protection rather than a shared lease registry.

Feature agents can merge their PRs after required checks pass. Coordinate shared contracts, migrations, manifests, and lockfile changes in the task brief. Read [AGENTS.md](AGENTS.md) and [the task brief](docs/task-brief.md). No second task scheduler or worktree creator lives in this repo.

Stopping uses a nonce-verified Unix control socket, then the launcher's own subprocess handles. Stale claims are retained for inspection; `bun doctor` never kills a saved PID. Confirm the owner is gone and its ports are free before removing only those stale claim files.

## Presentation video

Read [the presentation skill](.agents/skills/presentation-video/SKILL.md). Capture uses Node 22+ and optional Playwright Chromium. Editing needs Python 3.10+, FFmpeg, and ffprobe. Local Piper is installed in an isolated optional environment; macOS can also use `say`.

```sh
bun run video:install
bun run video:install-local   # optional Piper engine and pinned voice
bun run video:sample --narration local
bun dev --profile demo       # separate terminal, synthetic presentation data
bun run video:make --profile demo --narration auto
```

Auto uses ElevenLabs when `ELEVENLABS_API_KEY` is configured, otherwise local speech. `--narration local` or `elevenlabs` overrides selection. ElevenLabs sends narration text to the service and uses account credits. The key stays out of logs and media artifacts. Only changed scene audio is synthesized.

Edit `docs/demo/story.json` to change narration, captions, chapters, actions, and expected results. Output includes a narrated MP4, caption file, transcript, screenshots, capture/timing manifest, and an offline player. The example requires an available host login for its pi scene. Give each presentation its own profile; reruns create a fresh conversation without deleting existing data.

## Later deployment

Build the web app with the intended Clerk frontend key and `AUTH_MODE=clerk`. The Bun API can serve the built web app. Production refuses synthetic authentication and local model login. Railway preparation needs `NODE_ENV=production`, `API_HOST=0.0.0.0`, a persistent local volume, `DATABASE_PATH`, Clerk settings, and an API-key provider adapter. Run one API instance against that SQLite volume initially. Deployment is deliberately deferred.

GitHub Actions has a required-check candidate named `check` and a manually run browser workflow. Configure branch protection to require `check` when a GitHub repository is attached; the workflow alone does not enforce merge policy.
