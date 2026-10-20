# One-day hackathon starter

React/Vite web, Bun/Hono API, Drizzle/SQLite, and a server-only pi runner in Bun workspaces. T3 owns agent tasks, host selection, and worktree creation. Repository tooling prepares and runs each app environment.

## Start and verify

- Run `bun setup`, then `bun dev` when an app is needed. Setup installs frozen dependencies and creates checkout-local env; it does not start processes.
- Run focused tests while editing. Required merge gate is `bun run check`: lint, typecheck, real API/SQLite tests, and Vite build.
- `bun run typecheck` regenerates route types with the official TanStack CLI, then checks browser and runtime/test programs in parallel. Keep Bun and Node globals out of the browser program. Commit `apps/web/src/routeTree.gen.ts`; never edit it by hand.
- Browser smoke is separate: `bun run test:e2e`. Video tooling is optional and outside merge checks.
- Present app and artifact results with Tailscale URLs. Public research references retain their original URLs.

## Parallel work

- T3 briefs carry owner, allowed paths, acceptance criteria, and an optional GitHub issue link. Use `docs/task-brief.md`.
- Feature agents may merge their own PRs after required checks pass. The merging agent owns resulting integration failures.
- Coordinate shared contracts, schema/migrations, manifests, lockfile, and root wiring in the task brief before concurrent edits. A preview owner refreshes the integrated app.
- Put each feature in a Bun workspace at `features/<feature>` and each action in `features/<feature>/<action>`. Use `contract.ts`, `client.ts`, `state.ts`, `server.ts`, and colocated tests. Keep reusable action code in the feature's `shared` folder.
- Pages and components in `apps/web` render feature state and call its actions. Keep HTTP calls, request validation, cache updates, mutations, and stream handling in feature clients/state. Presentation-only effects such as scrolling belong in UI code.
- Routes under `apps/web/src/routes` select workspace/conversation context and compose pages. Feature state remains independent of the router. Use `packages/ui` for buttons, labelled fields, avatars, dialogs, toasts and loading/empty/error states. Keep vertical scrolling on the document, not inside notes/chat panels.
- Shared dependency versions live in the root Bun workspace catalog. Use `catalog:` in consuming manifests. Coordinate catalog, lockfile, route-tree and shared UI changes before parallel edits.
- Export action contracts, clients, state, and server entry points explicitly; do not add a catch-all barrel. Browser code cannot import server files, database, credentials, or pi execution. Feature production code cannot import app composition. `bun run boundaries` checks these rules transitively.
- Build workspace query keys with `workspaceKey(feature, scope)` so they start with `[feature, userId, workspaceId]`. Successful writes invalidate the affected data; chat refreshes the whole user/workspace scope after tool writes. An identity change gets a new query cache.
- A feature exposes chat tools from `shared/tools.server.ts`; `apps/api` composes them into chat. Features do not import each other's production code.
- After a committed write, call `publish` from the `WriteContext` with the affected query-key families. Use `audience: "user"` for private data. Realtime messages carry change signals and presence only; browsers refetch through HTTP. See "Live updates" in `docs/architecture.md`.
- Each worktree/profile owns `.local/<profile>`, two ports, logs, and a SQLite file. Exchange code through Git; retain local credentials and databases on each host.
- Stop only processes owned by your environment. Never reset another stack or change host services to fix a test.
- Synthetic users are for development; Clerk is the production adapter. Tools enforce workspace membership and viewer/editor/owner permissions in the API.
- Validate boundary input. Prefer schema-derived types, explicit variants, and unknown over any. Test real SQLite and Hono requests; inject external model streams in tests.
- Commit generated migrations. Do not regenerate applied migrations or use schema push in CI.

## Android emulator memory budget

- Run at most one Android emulator per machine. Reuse an existing device; never start a second for parallel agents.
- Run device tests sequentially. One agent owns the device at a time. Test Pixel and Fold in separate runs. Include these rules in delegated briefs.
- Before emulator startup or Gradle builds, inspect `free -h`, `/proc/meminfo`, and emulator process RSS. Use `MemAvailable` and expected launch/build growth.
- Keep at least the larger of 4 GiB or 20% of host RAM available. Budget total emulator host RSS, not just Android RAM. On pve-dev2 on 2026-10-11, 3 GiB Pixel/Fold AVDs used about 10.8/18.3 GiB host RSS.
- Recheck after startup and between batches. If the reserve is unavailable, pause new memory-heavy work, report usage, and coordinate with the workload owner.
- Do not stop another thread's device, increase VM RAM, add swap, change service limits, or restart T3 without user authorization.
- To switch owned devices, save evidence, close the current emulator gracefully, then open the next. Leave a device running only for needed inspection.

## Shared request and recovery behavior

- Read the complete notes-create example in `docs/architecture.md` before adding an action. Extend existing contracts, HTTP and server packages.
- Parse action input with the same Zod schema in state and on the API. Return field errors through state; UI renders them beside fields.
- Use `AppError` for expected server failures and `ApiError` on the client. Preserve code, HTTP status and request ID. Never parse error messages to choose behavior.
- Use the shared HTTP client. It owns a total 15-second ordinary-request deadline and at most one GET retry for network errors or HTTP 500/502/503/504. Keep TanStack retries off. Never automatically replay writes or chat.
- After an uncertain write, refresh affected server state before offering another attempt. If refresh fails, block submission until manual refresh succeeds. Refresh cannot prove that a write did not commit; keep the warning and the input.
- Keep drafts in the app-owned memory store, keyed by user, workspace and action. Preserve them through reauthentication, clear them on account changes or explicit signout, and never persist them to browser storage. Cancel old work when its scope unmounts.
- Use request context logging. Log route templates, internal IDs, status, duration and request IDs. Never log request bodies, prompts, tool contents, tokens, emails, exception messages or exception causes. Development stacks retain source locations only.
- Set AUTH_MODE explicitly. Launcher and Vite validate it; the API rejects synthetic identities when NODE_ENV=production or Railway is detected. Optimized local Vite builds may use synthetic auth because build optimization is not deployment.
