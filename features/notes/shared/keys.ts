import { type WorkspaceScope, workspaceKey } from "@day-one/contracts";
// Realtime change targets name this family so open browsers refetch the same keys.
export const notesFamily = "notes";
export const notesKey = (scope: WorkspaceScope) => workspaceKey(notesFamily, scope);
