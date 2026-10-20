// The app owns the store. Feature state receives this capability through its context.
export type DraftStore = {
	activate: (userId: string) => void;
	clear: () => void;
	get: (userId: string, workspaceId: string, action: string) => string;
	set: (userId: string, workspaceId: string, action: string, value: string) => void;
	workspace: (userId: string) => string;
	select: (userId: string, workspaceId: string) => void;
	subscribe: (listener: () => void) => () => void;
};
