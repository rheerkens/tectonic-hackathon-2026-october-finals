# Web

Keep pages in `src/pages` and visual components in `src/components`. Reuse visual tokens, safe Markdown, and the session seam. Pages compose hooks from feature `state.ts` exports or application state in `src/state`. Components receive data and actions through props.

TanStack file routes live in `src/routes`. They select IDs from the URL; application state resolves membership and injects the scope into features. `StudioPage` is a shell: it resolves membership and provides `scope` through `StudioContext`. Pages compose their own feature hooks from that scope; do not add feature state to `useStudio`. The chat layout route renders `ChatPage` so send state survives the new-conversation URL replace. Feature hooks receive navigation callbacks and never import the router. An explicit unavailable URL shows an error, not another workspace's data. New conversations replace the empty-chat URL after creation. Leaving chat cancels active work and retains the draft.

Use `@day-one/ui/button` and `@day-one/ui/field` for shared controls. Errors remain state-owned. Notes and chat use document scrolling; never add fixed-height scroll regions to their panels. Keep the note form and chat composer above their histories. The notes view reveals ten more loaded notes per click.

`bun run routes:generate` regenerates `src/routeTree.gen.ts`; the Vite plugin also updates it during development/build. Commit the generated file. `tsconfig.browser.json` checks browser code without Bun or Node globals; the runtime/test config separately checks Bun tests and Vite configuration.

HTTP calls, parsing, domain validation, query keys, mutations, cache updates, and chat stream handling belong in `features/<feature>/<action>`. Do not import action clients or TanStack Query into pages/components. Presentation-only state and effects are allowed in UI code. Contracts are browser-safe; do not import database, server entry points, Node APIs, or pi runtime.

Keep loading/error states actionable and controls usable at narrow widths. Run the focused component tests, Vite build, and root `bun run check`. Browser smoke is separate and records actual behavior.

Auth providers share an in-memory draft store above the signed-in page. Expiry hides private data and discards its query cache, but retains drafts for the same user/workspace. Explicit signout or a different account clears drafts. Refreshing the page loses drafts. Use the session's expiry callback; do not add auth-mode branches to feature code.

The app implements the `DraftStore` capability from `packages/contracts`; HTTP transport does not own draft state. `src/config.ts` owns web configuration and is used by Vite and the launcher. Share auth validation through `packages/contracts`, never by importing the API app.

Render field errors next to inputs and action errors near their controls. Unexpected failures include a request reference. The root error boundary offers Reload after a rendering crash. Keep API calls and retry/reconciliation decisions in state.
