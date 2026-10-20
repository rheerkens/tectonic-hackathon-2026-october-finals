import { z } from "zod";
export const NoteSchema = z.object({
	id: z.string(),
	workspaceId: z.string(),
	text: z.string(),
	createdBy: z.string(),
	createdAt: z.string(),
});
export type Note = z.infer<typeof NoteSchema>;
