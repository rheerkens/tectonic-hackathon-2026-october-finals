# HTTP transport

Keep this package browser-safe and independent of features and UI. Resolve current session headers when sending each request. Validate successful response bodies using the supplied schema and expose safe server error messages. Accept an injected fetch transport for real Hono tests. Clients use this package; visual UI code does not.

The ordinary request deadline is 15 seconds total, including credentials, the response body and the optional retry. Retry GET once on network errors or HTTP 500/502/503/504; do not retry cancellation, timeout, validation, authentication, permissions or writes. Resolve headers for each attempt. Keep query-library retries off.

`ApiError` retains HTTP status, code, field errors and request ID. Only HTTP 401 triggers the supplied session-expiry callback. Chat owns a separate 90-second deadline through stream consumption. Keep application-state capabilities such as drafts out of transport. The `DraftStore` contract lives in `packages/contracts`; the web app owns its implementation.
