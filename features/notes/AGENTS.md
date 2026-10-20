# Notes

Create and list are independent action slices. Use the shared note schema and user/workspace cache key. Create accepts trimmed text from 1 to 2,000 characters and refreshes the active list after success and after uncertain transport failures. UI errors and draft/pending state belong in `create/state.ts`.

Both HTTP handlers and the pi tools in `shared/tools.server.ts` call the same authorized server functions. Recheck membership and role on each call. Viewers can list; editors and owners can create. Test real SQLite persistence and denied writes without replacing the database with mocks.
