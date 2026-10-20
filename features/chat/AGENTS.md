# Chat

No web UI uses chat right now; `apps/api` still mounts these actions and the notes tools.

Actions are create, list, history, send, and status. Keep conversation/turn schemas and query keys in `shared`. The top-level `state.ts` composes action hooks; it renders no UI. Local model/login adapters are explicitly server-only shared files. Tools are injected through `mountSendChat({ tools })`; chat imports no other feature.

Chat is private to the authenticated user inside an authorized workspace. Recheck access and cancellation after provider readiness. Preserve persisted text, tool outcomes, and interrupted history. Never replay writes on restart.

`shared/recovery.server.ts` owns interrupted-turn recovery. API startup calls it once before accepting requests. Mounting routes must not modify existing turns.

The send client validates NDJSON events across split chunks. Send state owns streaming, cancellation, pending/errors, history updates, and refreshing the whole user/workspace query scope after tools. Pages/components receive data and actions and must never interpret stream events.

`useChat` receives `conversationId` and `onConversationCreated`; it does not import the router. A creation callback must not cancel its own first send. Selecting another conversation stops the old send. Validate that loaded history belongs to the selected workspace before displaying it or allowing a send.
