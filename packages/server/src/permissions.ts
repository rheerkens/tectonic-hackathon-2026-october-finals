// Adapted from Tectonic permissions.ts; payroll/source rules excluded.
import { type MemberRole, roleAtLeast } from "@day-one/contracts";
import { type AppDatabase, memberships, workspaces } from "@day-one/db";
import { and, eq } from "drizzle-orm";
import { AppError } from "./errors";
export function requireWorkspaceAccess({
	db,
	workspaceId,
	userId,
	required,
}: {
	db: AppDatabase;
	workspaceId: string;
	userId: string;
	required: MemberRole;
}) {
	const workspace = db.select().from(workspaces).where(eq(workspaces.id, workspaceId)).get();
	if (!workspace) throw new AppError(404, "Workspace not found.");
	const member = db
		.select()
		.from(memberships)
		.where(and(eq(memberships.workspaceId, workspaceId), eq(memberships.userId, userId)))
		.get();
	// Outsiders get the same answer as for a missing workspace, so IDs cannot be probed.
	if (!member) throw new AppError(404, "Workspace not found.");
	if (!roleAtLeast(member.role, required))
		throw new AppError(403, "Your workspace role does not allow this action.");
	return { ...workspace, role: member.role };
}
