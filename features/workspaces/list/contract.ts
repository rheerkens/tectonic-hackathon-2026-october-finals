import { MemberRoleSchema } from "@day-one/contracts";
import { z } from "zod";
export const WorkspaceSchema = z.object({
	id: z.string(),
	name: z.string(),
	role: MemberRoleSchema,
});
export type Workspace = z.infer<typeof WorkspaceSchema>;

export const ListWorkspacesResponseSchema = z.array(WorkspaceSchema);
