// Workspace-scoped query keys start with [feature, userId, workspaceId]. Cross-feature refreshes match that prefix.
export type WorkspaceScope = { userId: string; workspaceId: string };
export const workspaceKey = <Feature extends string>(
	feature: Feature,
	{ userId, workspaceId }: WorkspaceScope,
) => [feature, userId, workspaceId] as const;
export const inWorkspace = (key: readonly unknown[], { userId, workspaceId }: WorkspaceScope) =>
	key[1] === userId && key[2] === workspaceId;
