# Shared server infrastructure

Own errors, HTTP error handling, workspace permission checks, and real SQLite/Hono test fixtures. Do not import features or app composition. Never expose these exports to browser code. Test fixtures use synthetic identities and temporary migrated SQLite files and close only their own handles.

`createHttpApp` assigns a fresh request ID and returns it in the response header and error body. Use `AppError` for expected failures. Zod input failures map to field errors; unexpected errors become safe HTTP 500 responses. Body-limit and unknown-route failures use the same contract.

Logging uses an allowlist. Include route templates, request ID, status, duration and known internal identities. Omit exception messages/causes and every request or provider payload. Development stack output contains source file/line locations only. HTTP duration measures handler dispatch to the response, not the lifetime of a chat stream. Stream failures reuse that request's ID.
