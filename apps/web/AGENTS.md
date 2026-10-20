# Web

Keep pages in `src/pages` and visual components in `src/components`. Reuse visual tokens, safe Markdown (`FinnResultContent`), and the session seam. Pages compose hooks from feature `state.ts` exports or application state in `src/state`. Components receive data and actions through props.

TanStack file routes live in `src/routes`. They select IDs from the URL; application state resolves membership and injects the scope into features. `StudioPage` is a shell: it resolves membership and provides `scope` through `StudioContext`. Pages compose their own feature hooks from that scope; do not add feature state to `useStudio`. Feature hooks receive navigation callbacks and never import the router. An explicit unavailable URL shows an error, not another workspace's data. Finn state (`src/state/finn.ts`) is a client-side fixture shared across windows; see docs/architecture.md.

Use `@day-one/ui/button` and `@day-one/ui/field` for shared controls. Errors remain state-owned. Notes use document scrolling; never add fixed-height scroll regions to the panel. Keep the note form above the history. The notes view reveals ten more loaded notes per click.

`bun run routes:generate` regenerates `src/routeTree.gen.ts`; the Vite plugin also updates it during development/build. Commit the generated file. `tsconfig.browser.json` checks browser code without Bun or Node globals; the runtime config separately checks Bun code and Vite configuration.

HTTP calls, parsing, domain validation, query keys, mutations, and cache updates belong in `features/<feature>/<action>`. Do not import action clients or TanStack Query into pages/components. Presentation-only state and effects are allowed in UI code. Contracts are browser-safe; do not import database, server entry points, Node APIs, or pi runtime.

Keep loading/error states actionable and controls usable at narrow widths. Run root `bun run check` before pushing. No tests.

Auth providers share an in-memory draft store above the signed-in page. Expiry hides private data and discards its query cache, but retains drafts for the same user/workspace. Explicit signout or a different account clears drafts. Refreshing the page loses drafts. Use the session's expiry callback; do not add auth-mode branches to feature code.

The app implements the `DraftStore` capability from `packages/contracts`; HTTP transport does not own draft state. `src/config.ts` owns web configuration and is used by Vite and the launcher. Share auth validation through `packages/contracts`, never by importing the API app.

Render field errors next to inputs and action errors near their controls. Unexpected failures include a request reference. The root error boundary offers Reload after a rendering crash. Keep API calls and retry/reconciliation decisions in state.
