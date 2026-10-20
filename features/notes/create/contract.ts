import { z } from "zod";

export { NoteSchema as CreateNoteResponseSchema } from "../shared/contract";
export const CreateNoteInputSchema = z.object({
	text: z.string().trim().min(1, "Enter a note.").max(2000, "Use at most 2,000 characters."),
});
export type CreateNoteInput = z.infer<typeof CreateNoteInputSchema>;
