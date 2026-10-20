# Chat

Actions are create, list, history, send, and status. Keep conversation/turn schemas and query keys in `shared`. The top-level `state.ts` composes action hooks; it renders no UI. Local model/login adapters are explicitly server-only shared files. Tools are injected through `mountSendChat({ tools })`; chat imports no other feature.

Chat is private to the authenticated user inside an authorized workspace. Recheck access and cancellation after provider readiness. Preserve persisted text, tool outcomes, and interrupted history. Never replay writes on restart. Inject model streams in server tests.

`shared/recovery.server.ts` owns interrupted-turn recovery. API startup calls it once before accepting requests. Mounting routes must not modify existing turns. Test recovery separately from route registration against real SQLite.

The send client validates NDJSON events across split chunks. Send state owns streaming, cancellation, pending/errors, history updates, and refreshing the whole user/workspace query scope after tools. Pages/components receive data and actions and must never interpret stream events.

Conversation selection is supplied by the app's URL state. `useChat` receives `conversationId` and `onConversationCreated`; it does not import the router. A creation callback must not cancel its own first send. Leaving chat unmounts `ChatPage`, and selecting another conversation stops the old send; both cancel prior work. Validate that loaded history belongs to the selected workspace before displaying it or allowing a send.
