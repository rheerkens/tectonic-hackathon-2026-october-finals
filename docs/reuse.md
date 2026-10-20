# Source reuse record

Previous project: `Tectonic-hackathon2026`, commit `6433fdad51bd8a595d3677d03feea7081e4111b6`. Source was audited before implementation. The previous stack was React/Vite + Bun/Hono with Bun workspaces and Drizzle/Postgres.

| Current code | Source and change |
| --- | --- |
| `tools/dev/src/procs.ts`, `shutdown.ts` | Copied process/shutdown mechanics; fixed line-pump typing and timeout cleanup |
| `tools/dev/src/worktree.ts` | Copied discovery/confinement; absolute Git paths support calls from nested directories |
| `tools/dev/src/ports.ts` | Adapted three ports to web/API pair |
| `tools/dev/src/launcher.ts`, `runtime.ts`, `cli.ts` | Adapted lifecycle/interface; Postgres removed, SQLite profiles retained, Tailscale URLs, verified control socket stop |
| `tools/dev/src/lock.ts`, `leases.ts`, `lifecycle.ts` | Replaced non-exclusive claims; host leases across clones and startup/shutdown ordering are new glue |
| `packages/ai/src/runner.ts` | Extracted `apps/api/src/project-chat/runner.ts`; model/token/tools/history/events injected; product context removed |
| `packages/ai/src/provider.ts` | Copied the small OpenAI/Codex pi transport adapter |
| `features/chat/shared/login.server.ts` | Adapted `project-chat/codex.ts`; preserves host local-login path and production refusal |
| `apps/api/src/auth.ts`, `packages/server/src/permissions.ts` | Adapted auth seam and generic membership checks; excludes payroll/source audience rules |
| `packages/contracts`, feature `contract.ts` files | Extracted role hierarchy and identity/chat contract patterns; neutral data and one protocol |
| `apps/web/src/auth` | Adapted synthetic/Clerk session seam and lazy provider loading |
| `apps/web/src/components/FinnResultContent.tsx` | Safe Markdown idea from the old chat: `react-markdown` with `skipHtml` |
| `apps/web/src/styles.css` | Adapted token/reset/focus foundations and Manrope; replaced branding and layout |
| `tools/e2e/capture.mjs` | Adapted old capture readiness/action/manifest mechanics; story-driven scenes replace old selectors |
| `tools/video/video.py` | Copied/adapted run/probe/encoding/validation helpers from `render-demo.py`; narration, cache, story editing, and offline player are new glue |
| `t3.json`, setup hook | T3 project-hook lifecycle reference; fresh Bun/env implementation |
| CI | New composition; the audited old commit had no Actions workflow |
| `features/*/<action>`, action `state.ts`, `packages/http`, import boundaries | New action-based organization, typed clients, TanStack Query state, and UI/state enforcement; these were not copied from T3 |

A source-level architecture discussion with pinned snapshots existed on a private tailnet host (local only, not reachable). It was a review artifact, not a dependency.

Primary references: [T3 hooks](https://github.com/pingdotgg/t3code/blob/main/t3.json), [T3 setup source](https://github.com/pingdotgg/t3code/blob/main/scripts/setup-worktree.ts), [pi SDK](https://github.com/earendil-works/pi), [Bun workspaces](https://bun.sh/docs/pm/workspaces), [Drizzle/Bun SQLite](https://orm.drizzle.team/docs/get-started/bun-sqlite-new), [official Bun CI action](https://github.com/oven-sh/setup-bun), [Piper CLI](https://github.com/OHF-Voice/piper1-gpl/blob/main/docs/CLI.md), [ElevenLabs speech API](https://elevenlabs.io/docs/api-reference/text-to-speech/convert).

Manrope is distributed with its original `apps/web/public/fonts/OFL.txt`. pi is consumed as its published MIT-licensed SDK. The optional Piper engine is GPL-3.0-or-later and installed separately. Its LJSpeech voice model card describes dataset provenance; the template does not grant additional model rights. The model revision/hash are recorded by the local installer.

Workflow action majors were verified against the official repositories: [checkout](https://github.com/actions/checkout), [setup-node](https://github.com/actions/setup-node), [cache](https://github.com/actions/cache), and [upload-artifact](https://github.com/actions/upload-artifact). Hosted GitHub execution is not yet tested because no remote repository is attached.

## Better-T-Stack comparison, 2026-10-15

We generated and inspected a separate sample with `create-better-t-stack@3.46.1` and real Bun 1.4.2. The sample selects a React/Vite SPA with TanStack Router, Hono, Bun, Drizzle and SQLite. Dependencies were not installed and the generated sample was not built or tested. No generated source or scripts were copied into this repository.

Run this from an empty temporary directory with Bun on `PATH` to reproduce the comparison:

```sh
npx --yes create-better-t-stack@3.46.1 create bts-comparison \
	--frontend tanstack-router --backend hono --runtime bun --api none \
	--database sqlite --orm drizzle --auth none --payments none \
	--addons none --examples none --db-setup none --package-manager bun \
	--no-install --no-git --disable-analytics --manual-db \
	--web-deploy none --server-deploy none --directory-conflict error
```

The inspected files were the root and workspace manifests, `apps/web/vite.config.ts`, `apps/web/src/main.tsx`, the web routes, app `.env.schema` files, `apps/server/src/index.ts`, and the database client, schema and Drizzle configuration.

- The generated web app uses TanStack Router's Vite plugin, generated route types, intent preloading and scroll restoration. These were references for the workspace and result URLs. Our feature state remains responsible for requests and cache updates.
- Each app owns its environment schema through Varlock. Our existing Zod auth contract and app-owned parsers provide validation without introducing environment code generation. The ownership cleanup here is project-specific, not copied from Varlock or Better-T-Stack.
- Root scripts fan out with Bun workspace filters. Turbo is absent when addons are disabled. Their plain development commands do not replace our profile-specific ports, process ownership and database isolation.
- The generated database client uses `@libsql/client` and `drizzle-orm/libsql`; the Drizzle dialect is `turso`. A `db:local` script runs `turso dev`, and the example environment points at a local file. Our embedded `bun:sqlite` client and committed migrations stay in place. We do not copy `db:push` into CI.
- With `--api none --examples none`, the sample has no feature actions, TanStack Query layer or tests. Its web typecheck script also runs `vite build`; our merge gate already builds once. Those defaults do not replace our action slices or focused tests.

The official [CLI reference](https://www.better-t-stack.dev/docs/cli) documents the available selections. The [project structure reference](https://www.better-t-stack.dev/docs/project-structure) describes optional `apps/native` and Turbo additions. Mobile support was not generated or verified in this web-only comparison.

## Patterns adopted after the comparison

- The TanStack Router/Vite integration follows the generated sample and the [official Vite setup](https://tanstack.com/router/latest/docs/framework/react/installation/with-vite). Our workspace/result routes, auth handling and state callbacks are project-specific. Route types are produced by the official `tsr generate` command and the Vite plugin.
- The `packages/ui` ownership pattern comes from Better-T-Stack. Its buttons, fields and CSS here are original native React controls based on the existing app styles. We did not copy shadcn source or add Tailwind. Panels remain in the web app, and validation remains in feature state.
- The sample's per-app TypeScript configuration informed the separate browser and runtime/test programs. Our include rules, incremental checks and server-global assertions are project-specific.
- The root [Bun catalog](https://bun.sh/docs/pm/catalogs) follows the sample's central-version pattern. Existing dependency versions were preserved; TanStack Router and its build tools are new dependencies.
- The presentation capture now carries the current route between scene contexts, alongside browser storage.

The SQLite client, migrations, auth adapters, environment isolation and fast-check orchestrator remain the implementations recorded above. No Turbo, Varlock, libSQL or RPC framework was introduced by this adoption.
