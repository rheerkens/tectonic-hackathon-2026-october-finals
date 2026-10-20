# API

The API app composes middleware and mounts action handlers from `features/<feature>/<action>/server.ts`. Keep feature logic and its tests beside the action. Shared permission/error primitives live in `packages/server`; features never import app composition.

Feature handlers and pi tools share authorization rules. Validate external inputs. Require current workspace membership and the needed role on routes and again inside tools. Private chat history needs both user and workspace scope.

Use actual SQLite/Hono tests. Inject external model streams; never require a live login in merge tests. Check cancellation after awaited readiness. Persist tool outcomes, mark interrupted runs, and never automatically replay writes.

Validate startup configuration before opening SQLite or binding a port. `src/config.ts` owns API settings; `apps/web/src/config.ts` owns web settings. Both use the auth contract in `packages/contracts`, and the launcher validates both. Require AUTH_MODE; production API startup and Railway refuse synthetic users. Clerk token verification errors map to 401, while user-record database failures remain server failures.

Keep `createApp` and route registration free of database recovery side effects. `src/index.ts` calls the chat feature's `recoverInterruptedChat` once for the profile's database, after opening it and before accepting requests. Never run restart recovery during an active request or when constructing another app instance.
