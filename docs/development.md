# Development

SDtrust with Finn, built in one day on Linux and macOS hosts. React/Vite web, Bun/Hono API, Drizzle/SQLite, an Electron shell and a server-only pi runner. Finn's answers are scripted in the web client; see [the architecture](architecture.md#finn-flow).

The API keeps the starter's synthetic sign-in, workspace membership, viewer/editor/owner roles and authorized SQLite notes. UI foundations and lifecycle code come from the previous hackathon; [the reuse record](reuse.md) names the sources and adaptations.

## Start

Install the Bun version in `.bun-version`, then run:

```sh
bun setup
bun dev
```

Setup installs the frozen lockfile and creates `.env.local` without overwriting it. It does not start an app. `bun dev` migrates/seeds the local database, starts Vite and the API, and prints a Tailscale URL. The Vite dev server accepts only loopback and tailnet clients (100.64.0.0/10, fd7a:115c:a1e0::/48); other LAN clients get 403.

`AUTH_MODE=dev` always signs in as the synthetic user Alex; there is no user switching.

## Desktop app (Mac + Windows)

`bun run desktop` builds the web app and starts Electron with a local API and SQLite under the OS user-data folder. It opens Finn and the mini chat; the main window opens from Finn's menu or a result. Voice input needs a local whisper.cpp CLI ([docs/finn-voice.md](finn-voice.md)). In a browser, use `bun dev` and open `/mini` or `/w/<workspace>` for hot reload.

Every push to `main` builds a Mac `.dmg` and Windows portable `.exe`: GitHub → Actions → Desktop → latest run → Artifacts. Builds are unsigned. On Mac, after dragging the app to Applications, run `xattr -cr "/Applications/SDtrust.app"` once. On Windows, choose "More info → Run anyway". Local build: `bun run --cwd apps/desktop dist` (output in `apps/desktop/release`).

## Commands

| Command | Purpose |
| --- | --- |
| `bun setup` | Prepare dependencies and checkout-local env |
| `bun dev --profile demo` | Start another isolated app stack |
| `bun run dev:status --profile demo` | Show environment metadata |
| `bun run dev:stop --profile demo` | Ask that environment's owner to stop its children |
| `bun run dev:env --profile demo` | Print non-secret URLs and database path as JSON |
| `bun doctor` | Inspect claims, ownership, and Tailscale |
| `bun run check` | Parallel lint, typecheck, boundaries, Vite build |
| `bun run db:generate` | Generate a committed SQLite migration |
| `bun run db:migrate` / `db:seed` | Prepare the selected `DATABASE_PATH` |
| `bun run test:isolation` | Separate two-clone/process/data isolation check |
| `bun run video:doctor` | Check optional presentation prerequisites |

Root database commands default to `.local/dev/app.sqlite`. To use a different database, set `DATABASE_PATH` explicitly. `dev:env` prints JSON, not shell commands; inspect it rather than using shell `eval`.

## Workspaces

```text
apps/web           React pages/components, Finn fixture state, session adapters
apps/desktop       Electron shell: pet, mini and main windows, local speech
apps/api           Hono middleware, authentication, action route composition
features/notes     create/list actions: contract, client, state, server
features/chat      create/list/history/send/status actions; mounted, no web UI
features/workspaces list action with membership-scoped results
packages/contracts Shared identity, roles, and persisted tool-result contracts
packages/http      Browser-safe authenticated transport and response parsing
packages/server    Server-only permissions, errors, HTTP setup, test fixtures
packages/db        SQLite client, schema, migrations, synthetic fixtures
packages/ai        Generic pi runner, provider transport
tools/dev          Worktree/profile discovery and owned app lifecycle
tools/e2e          Presentation capture for the video
tools/video        Local/ElevenLabs narration and FFmpeg editing
.agents/skills/presentation-video  Portable presentation instructions
```

Each feature is one Bun workspace. Actions are folders inside that workspace, with explicit package exports for `contract.ts`, `client.ts`, `state.ts`, and `server.ts`. Tests are not maintained; delete a broken one rather than fix it.

Pages consume feature hooks and pass data/actions into visual components. Action state owns queries, mutations, loading/errors, and cache refresh. Query keys include user/workspace scope; changing identity creates a new cache. Browser/server and UI/state import checks run in `bun run check`. See [the architecture](architecture.md) for the complete request flow and notes-create example. Shared behavior includes Zod field errors, typed API errors with request IDs, a 15-second request deadline, one transient GET retry, safe request logs and in-memory draft recovery after sign-in expires.

## Parallel agents

`t3.json` runs the setup hook after a worktree is created. Each worktree/profile has `.local/<profile>/app.sqlite`, two ports, logs, and runtime metadata. Port leases cover separate clones run by the same OS user on one host. Strict binds also detect unrelated listeners. Separate users still get bind-failure protection rather than a shared lease registry.

Everyone pushes directly to `main`: `git pull --rebase` before you start and before every push, run `bun run check`, and never push red. Push hot files (lockfile, catalog, schema/migrations, contracts, `packages/ui`, API route wiring) immediately and tell the others. See [AGENTS.md](../AGENTS.md).

Stopping uses a nonce-verified Unix control socket, then the launcher's own subprocess handles. Stale claims are retained for inspection; `bun doctor` never kills a saved PID. Confirm the owner is gone and its ports are free before removing only those stale claim files.

## Presentation video

Read [the presentation skill](../.agents/skills/presentation-video/SKILL.md). Capture uses Node 22+ and optional Playwright Chromium. Editing needs Python 3.10+, FFmpeg, and ffprobe. Local Piper is installed in an isolated optional environment; macOS can also use `say`.

```sh
bun run video:install
bun run video:install-local   # optional Piper engine and pinned voice
bun run video:sample --narration local
bun dev --profile demo       # separate terminal, synthetic presentation data
bun run video:make --profile demo --narration auto
```

Auto uses ElevenLabs when `ELEVENLABS_API_KEY` is configured, otherwise local speech. `--narration local` or `elevenlabs` overrides selection. ElevenLabs sends narration text to the service and uses account credits. The key stays out of logs and media artifacts. Only changed scene audio is synthesized.

Edit `docs/demo/story.json` to change narration, captions, chapters, actions, and expected results. Output includes a narrated MP4, caption file, transcript, screenshots, capture/timing manifest, and an offline player. The story walks Overview → Notes → Result. Give each presentation its own profile.

## Later deployment

Build the web app with the intended Clerk frontend key and `AUTH_MODE=clerk`. The Bun API can serve the built web app. Production refuses synthetic authentication. Railway preparation needs `NODE_ENV=production`, `API_HOST=0.0.0.0`, a persistent local volume, `DATABASE_PATH`, Clerk settings, and an API-key provider adapter. Run one API instance against that SQLite volume initially. Deployment is deliberately deferred.

GitHub Actions runs `check` (CI) and the desktop build on every push to `main`.
