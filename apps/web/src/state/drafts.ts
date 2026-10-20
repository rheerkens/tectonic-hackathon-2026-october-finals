import type { DraftStore } from "@day-one/contracts";
// One owner at a time. Null auth during reauthentication retains the owner's drafts.
export function createDraftStore(): DraftStore {
	let owner: string | null = null,
		selected = "";
	const values = new Map<string, string>(),
		listeners = new Set<() => void>();
	const emit = () => {
		for (const listener of listeners) listener();
	};
	const key = (workspace: string, action: string) => JSON.stringify([workspace, action]);
	return {
		activate(userId) {
			if (owner !== userId) {
				values.clear();
				selected = "";
				owner = userId;
				emit();
			}
		},
		clear() {
			owner = null;
			values.clear();
			selected = "";
			emit();
		},
		get(userId, workspace, action) {
			return owner === userId ? (values.get(key(workspace, action)) ?? "") : "";
		},
		set(userId, workspace, action, value) {
			if (owner !== userId || !workspace) return;
			values.set(key(workspace, action), value);
			emit();
		},
		workspace(userId) {
			return owner === userId ? selected : "";
		},
		select(userId, workspace) {
			if (owner === userId) selected = workspace;
		},
		subscribe(listener) {
			listeners.add(listener);
			return () => listeners.delete(listener);
		},
	};
}
