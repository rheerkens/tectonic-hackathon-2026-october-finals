# One-day hackathon

React/Vite web, Bun/Hono API, Drizzle/SQLite, Electron desktop shell (`apps/desktop`) and a server-only pi runner in Bun workspaces.

## Hackathon rules

- One day, three developers: Sebastian, Roy and Wanne. Speed beats polish. Ship the smallest thing that demos.
- No tests. Don't write, update or run unit/e2e tests. Delete a broken test rather than fix it.
- Everyone pushes directly to `main`. Pull (`git pull --rebase`) before you start and before every push. Commit small and push often so conflicts stay small.
- Before pushing, run `bun run check` (lint, typecheck, build). Never push a red check: main must always run.
- If you broke main, fixing it is your top priority. Don't force-push or rewrite `main` history.
- Hot files (merge-conflict risk): `bun.lock`, root `package.json` catalog, `packages/db` schema/migrations, `packages/contracts`, `packages/ui`, `apps/api` route wiring. Push changes there immediately and tell the others.
- Generated migrations are committed. Never edit or regenerate a migration someone already pushed; add a new one.
- Commit `apps/web/src/routeTree.gen.ts`; never edit it by hand.
- Present app results with Tailscale URLs.

## Start

- `bun setup`, then `bun dev`. Setup installs frozen deps and creates checkout-local env; it does not start processes.
- Each worktree owns `.local/<profile>`, two ports, logs and a SQLite file. Stop only your own processes.
- Set `AUTH_MODE` explicitly. Synthetic users are for development; Clerk is the production adapter.

## Structure

- Each feature is a Bun workspace at `features/<feature>`, each action at `features/<feature>/<action>` with `contract.ts`, `client.ts`, `state.ts`, `server.ts`. Reusable action code goes in the feature's `shared` folder. Read the notes-create example in `docs/architecture.md` before adding an action.
- Pages and components in `apps/web` render feature state and call its actions. HTTP calls, validation, cache updates and mutations live in feature clients/state.
- Routes under `apps/web/src/routes` compose pages. Use `packages/ui` for shared components.
- Shared dependency versions live in the root catalog; use `catalog:` in workspace manifests.
- Browser code cannot import server files, database, credentials or pi execution. Features don't import each other's production code.
- Build query keys with `workspaceKey(feature, scope)`. Successful writes invalidate the affected data.
- A feature exposes chat tools from `shared/tools.server.ts`; `apps/api` composes them into chat.
- After a committed write, call `publish` from the `WriteContext` with the affected query-key families (`audience: "user"` for private data).
- Use the shared HTTP client, `AppError` on the server and `ApiError` on the client. Parse input with the action's Zod schema.
- Tools enforce workspace membership and permissions in the API. Don't log request bodies, prompts or tokens.
