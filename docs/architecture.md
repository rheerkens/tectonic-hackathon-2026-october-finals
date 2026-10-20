# Architecture

T3 chooses the task, development host, and worktree. Repository tooling prepares and runs each local app environment.

## One workspace per feature, one folder per action

```text
apps/web/src/pages/StudioPage.tsx      Workspace shell: header, navigation, membership errors
apps/web/src/routes/                  Typed URLs and page composition
apps/web/src/pages/{NotesPage,ChatPage}.tsx  Compose one feature's state and render its view
apps/web/src/components/{chat,notes}  Render data and emit actions
apps/web/src/state/studio.ts           Resolve workspace membership and the feature scope
apps/web/src/state/realtime.tsx        Live updates: socket lifecycle, presence, cache refreshes
apps/api/src/realtime.ts              Realtime ticket route, Origin policy, WebSocket upgrade
apps/api/src/app.ts                    Authenticate, configure middleware, mount actions
features/notes/{create,list}           Notes actions with their own tests
features/chat/{create,list,history,send,status}  Chat actions
features/workspaces/list              Current-user memberships
packages/http                        Browser-safe transport, including the realtime client
packages/ui                          Shared web controls, dialogs, toasts and states
packages/server                      Server-only permissions, errors and the realtime hub
packages/db                          Drizzle schema, connection, migrations, fixtures
packages/ai                          Generic server-only pi runner
```

Each action uses `contract.ts`, `client.ts`, `state.ts`, `server.ts`, and tests beside the code they verify. Feature `shared` folders contain schemas/query keys used by several actions. Server-only shared helpers use `.server.ts`. A feature manifest exports each entry explicitly and has no catch-all barrel.

## Navigation and shared controls

TanStack Router owns `/w/$workspaceId/notes`, `/w/$workspaceId/chat` for a new conversation, and `/w/$workspaceId/chat/$conversationId` for saved conversations. `/` selects the current user's first or remembered workspace. Direct links survive sign-in and refresh. Back/Forward navigation restores page selection and document scroll position. An unavailable workspace or private conversation produces an error instead of silently selecting another one.

The workspace route keeps `StudioPage` mounted while child pages change. It resolves membership and provides a `scope` (client, user, workspace and drafts) through `StudioContext`; it holds no feature state. Each page composes its own feature hooks from that scope, so adding a feature adds a route, a page and a navigation link without editing the shell. Routes pass IDs and navigation callbacks to pages. Feature state still validates requests, manages drafts and streams, and updates TanStack Query. The chat layout route renders `ChatPage`, so creating a conversation replaces the empty-chat URL without remounting its send state. Leaving chat unmounts it, which cancels active chat work and retains unfinished input. Leaving notes does not cancel a save, because aborting cannot undo a commit. Account changes clear drafts and private caches.

`packages/ui` contains native web buttons, labelled textarea/select fields, avatars, a modal dialog, toasts and loading/empty/error states. Controls render supplied values and errors and use the app's CSS tokens. They have no HTTP, query, authentication or routing dependencies. Pages own layouts. Notes and Chat have separate views, their input controls precede history, and panels use document scrolling. The notes view initially shows ten loaded notes and can reveal more; the API still returns at most its existing fifty-note limit. These DOM controls are not React Native components.

## Request and state flow

A user action calls a feature state hook. The hook invokes its typed action client, which validates input and sends HTTP through the shared transport. The server handler independently validates input, checks current membership/roles, and calls Drizzle or an injected service. The client validates the response. Feature state updates or invalidates the affected query. React renders the resulting data.

UI pages/components do not own endpoint URLs, network calls, domain validation, cache mutation, or stream interpretation. Presentation-only effects such as scrolling remain in UI files. The import gate follows relative imports, workspace exports, re-exports, literal dynamic imports, and require calls. Browser code may import only files under the web app, `contracts`, `http`, `ui` and non-server feature files, plus an explicit npm allow-list in `scripts/boundaries.ts`; anything else fails. It checks browser/server isolation, the UI/state boundary, AI independence, and feature independence from app composition and from other features.

TanStack Query holds server data. Workspace data uses `workspaceKey(feature, scope)` from `packages/contracts`, which produces `[feature, userId, workspaceId, ...]`; private history uses user/conversation scope. Changing identity creates a new cache. Notes creation invalidates the current notes list after success; denied writes preserve cached data. Chat send state refreshes its history and every query matching the user/workspace prefix after completion, failure, or cancellation, so completed tool writes from any feature remain visible without chat naming that feature's keys.

## Live updates

A WebSocket at `/api/realtime` carries change signals and presence, never feature data. Browsers refetch through the normal HTTP API, so permissions, validation and caching stay in one place. Chat replies keep streaming over HTTP.

- **Sign-in.** The browser asks `POST /api/realtime/ticket` for a single-use ticket through the shared HTTP client, using normal authentication. It sends the ticket as a WebSocket subprotocol, so it never appears in a URL or log. The upgrade route is mounted before header authentication. It checks the Origin against the exact web origins (`WEB_ORIGINS`, set by the launcher) or, when the API serves the built app, against its own host. Tickets expire after 30 seconds. Sockets reconnect with a fresh ticket every 15 minutes without showing "Reconnecting".
- **Publishing.** After a committed write, server code calls `publish` from its `WriteContext` (HTTP handlers read it with `c.get("publish")`). A change names query-key families: `{ family: "notes" }` refreshes `[family, userId, workspaceId]`, and `{ family: "history", id }` refreshes `[family, userId, id]`. Use `audience: "user"` for private data such as conversations. Publish inside the shared write function, so HTTP and chat tools notify once. `publish` never throws.
- **Access.** Every delivery and every presence update rechecks membership in SQLite. Rooms are also rechecked every 30 seconds. A revoked member is evicted. Their browser drops that workspace's presence and clears its cached results, including the workspace list, so the workspace shows as unavailable even if the refetch fails.
- **Recovery.** The browser refetches loaded queries when the server acknowledges a subscription, including after reconnecting. A change that arrives while a matching read is in flight refetches once that read finishes, because the earlier answer may predate the change. Failed queries keep their manual retry. The header shows "Live" only after that acknowledgement. Browser tests that mock reads wait for it, so the refetch cannot consume a mocked response. A new identity gets a new socket and a new cache.
- **Limits.** Frames are capped at 4 KB, 40 messages per 10 seconds and 20 subscriptions per socket. Slow consumers are closed and recover by reconnecting. The hub runs in one process; more than one API replica would need a shared channel such as Postgres LISTEN/NOTIFY.

## AI and persistence

The chat send action injects authorized tools, complete persisted history, model, credentials, and cancellation into `packages/ai`. Generic pi code imports neither features nor the database. Each feature owns its tools in `shared/tools.server.ts`; `apps/api/src/app.ts` passes them to `mountSendChat`, so chat imports no other feature. Notes tools call the same authorized notes server functions as HTTP handlers. Chat persists streamed text and tool outcomes; private conversations require both user and workspace access.

API startup in `apps/api/src/index.ts` calls `recoverInterruptedChat` from `features/chat/shared/recovery.server.ts` once after opening the profile's database, before accepting requests. Recovery changes only pending turns to interrupted and preserves saved text and tool results. It never replays a tool. Constructing an app or mounting routes does not run recovery or modify existing turns. Each running profile owns a separate database; recovery assumes the previous process for that profile has stopped.

No migration changed during the action refactor. Existing local databases and chat history continue to use the committed migration path.

## Parallel development and checks

An agent can own `features/notes/create` while another owns `features/notes/list`, with named UI paths added to each brief. Coordinate shared contracts, query keys, permissions, schema/migrations, manifests, and the lockfile before concurrent edits.

Run focused tests with `bun test features/notes/create` or `bun test features/chat/send`. Required checks still include lint, typecheck, import boundaries, real SQLite/Hono tests, injected pi streams, and Vite build. Browser smoke, live model calls, environment isolation, and video capture are separate commands.

`bun run typecheck` first invokes the official `tsr generate` command, then checks `tsconfig.browser.json` and the Bun runtime/test `tsconfig.json` in parallel. Both extend `tsconfig.base.json` and cache incremental results under `node_modules/.cache`. Browser code gets DOM types without Bun/Node globals. `typechecks/browser-environment.ts` fails compilation if either `Bun` or `process` leaks into that program. Runtime tests may import browser modules, so their program also includes DOM types; browser safety is enforced by the separate check and transitive import gate. The generated route tree is committed and excluded from formatting.

Shared dependency versions live in the root `workspaces.catalog`. Workspace manifests use `catalog:` for those dependencies; app-specific dependencies remain in their own manifests. Frozen Bun installs validate the lockfile. Route generation and typechecking do not run a Vite build; the merge gate builds once in its separate build task.

Every worktree/profile owns its database and processes. Host port leases serialize claims for the same OS user across clones. Vite uses strict binds. The control socket verifies an owner nonce and asks the launcher to terminate its own subprocess handles.

## Cross-cutting behavior

Shared mechanics live in the existing packages. `packages/contracts/src/errors.ts` defines `ErrorBodySchema` and Zod field-error conversion. `packages/server` maps failures to HTTP and assigns request IDs. `packages/http` preserves those errors and owns ordinary request deadlines and retries. Each app owns its configuration parser: `apps/api/src/config.ts` for the API and `apps/web/src/config.ts` for Vite. Both use `readAuthMode` from `packages/contracts`; the launcher validates both parsers before starting the apps. The web app does not import API configuration.

The error body is `{ code, message, fieldErrors?, requestId? }`. HTTP status stays in `ApiError.status`. Field paths use dot notation. Expected failures use `AppError`; unexpected server errors return a safe message with a request reference. NDJSON chat error events add `type: "error"` to this same body.

Ordinary requests have a total 15-second deadline, including credentials, response parsing and any retry. GET retries once for a network error or HTTP 500, 502, 503 or 504. Cancellation, deadline expiry and other statuses do not retry. Writes never retry automatically. Chat has its own 90-second deadline that includes the response stream. TanStack retries remain disabled to prevent multiplying attempts.

Note and chat state retain input after failure. An uncertain note write refreshes the list before another submission is available. If refresh fails, submission waits for a successful manual refresh. This is not idempotency: a response can be lost after SQLite commits, and a manual repeat can still duplicate a write. The UI tells the user to inspect saved results. Chat refreshes notes, conversations and history after completion, failure or cancellation.

The app-owned draft store lives above auth providers and stores text in memory by user, workspace and action. Its shared capability type lives in `packages/contracts/src/drafts.ts`; its implementation stays in `apps/web/src/state/drafts.ts`. Feature state receives the store alongside its HTTP context. Transport does not depend on draft state. The store survives signed-in page unmounting during reauthentication. New identities and explicit signout clear it. Reauthentication restores only the same identity's drafts, and synthetic sign-in preselects the expired identity. A reload loses drafts. Query caches are separate from drafts and are discarded when the authenticated page goes away.

API request logs contain generated request IDs, route templates, method, status, dispatch duration and available internal user/workspace IDs. Unexpected API and chat failures share those request IDs. Error details exclude exception messages and causes; development stacks include source locations only. Bodies, chat text, tool contents, emails and credentials are excluded.

## Complete action example: create a note

The implementation under `features/notes/create` is the example for new form actions.

1. `contract.ts` defines `CreateNoteInputSchema` with trimming and a 1-to-2,000-character limit. Request types derive from that schema.
2. `state.ts` reads the user/workspace draft, validates it and exposes `fieldError`, `busy`, `error` and action functions. It keeps the input until a confirmed success.
3. `client.ts` validates the input boundary, serializes the POST and asks `packages/http` to parse the response schema.
4. `apps/api/src/app.ts` authenticates the request. Shared middleware assigns a request ID and handles body limits.
5. `server.ts` checks editor-or-owner membership, validates the same schema, inserts with Drizzle and returns the saved note. Pi tools call this same authorized function.
6. Shared server handling converts Zod failures into field errors and preserves expected HTTP failures. Logs correlate unexpected failures without recording note text.
7. Feature state refreshes the scoped list on success. After a transport failure that might hide a committed write, it refreshes the list and retains a warning plus the draft.
8. `NotesPanel.tsx` displays the state and invokes its actions. It has no HTTP, validation or cache logic.

The action's colocated tests use real SQLite and Hono. Transport tests cover error preservation, bounded retries, deadlines and cancellation. Separate browser smoke injects failed responses, including a lost response after a real SQLite commit, and checks recovery without Clerk credentials or model calls.

## Auth configuration and deployment boundary

Set `AUTH_MODE=dev` or `AUTH_MODE=clerk` explicitly. The launcher reads checkout-local `.env.local`, with shell variables taking precedence, and passes the mode to both apps. Clerk also requires its server secret and frontend publishable key. Changing the mode requires restarting local processes; deployed frontend mode changes require rebuilding.

Vite sets NODE_ENV=production when optimizing a local build. That build may still use synthetic identities. The API independently refuses synthetic identities when NODE_ENV=production or Railway is detected; Railway builds also reject synthetic auth. Deploy with AUTH_MODE=clerk at both build and runtime. Clerk workspace onboarding, deployment credentials, backups and public AI quotas remain deferred.
