# Action slices

Each feature is one Bun workspace; each action is a folder containing `contract.ts`, `client.ts`, `state.ts`, `server.ts`. Keep files flat inside actions. Add only files the action needs. Put code shared by actions in `shared`; mark server-only helpers with `.server.ts`.

Contracts validate boundary data and derive types from schemas. Clients own HTTP methods, URLs, request serialization, and response/stream validation. State owns queries, mutations, loading/errors, cache updates, and React hooks. Servers own authorization, application rules, and Drizzle calls. UI pages/components remain in `apps/web` and consume state rather than clients.

Declare explicit action exports in the feature manifest. No root barrel may combine browser and server modules. Browser files cannot import server code; production feature code cannot import app composition. Run `bun run boundaries` when changing imports or exports.

Scope caches to the current user/workspace with `workspaceKey` from `@day-one/contracts`. Successful mutations refresh only affected scopes. Stream state belongs in the send action, including cancellation and refresh after tool writes. Presentation-only effects belong in UI code.

Do not import another feature's production code. Expose chat tools from `shared/tools.server.ts`; `apps/api` composes them.

An agent may own one action. Coordinate shared contracts, query keys, permissions, schema/migrations, manifests, and lockfile edits. Use `docs/task-brief.md` and name any UI paths the task also owns.


Validate form input in state with the action contract and expose field errors to UI. Clients validate again at their boundary and throw typed `ApiError` values. Servers use `AppError` for expected failures. Unknown server errors are mapped centrally; never expose an exception message.

Use the injected draft store in interactive actions. Keep input after a failed submission. Check user/workspace ownership before applying late results. Do not enable TanStack retries: the HTTP package owns the single GET retry. Uncertain writes refresh server state and never resubmit themselves.

For logs, use `c.get("logError")` and set `workspaceId` only from an authorized workspace. Stream error events carry the same code/message/requestId contract as HTTP errors.
