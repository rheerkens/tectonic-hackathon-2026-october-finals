import type { AgentTool } from "@day-one/ai";
import type { WriteContext } from "@day-one/server";
import { Type } from "typebox";
import { CreateNoteInputSchema } from "../create/contract";
import { createNote } from "../create/server";
import { listNotes } from "../list/server";
export function createNoteTools(context: WriteContext): AgentTool[] {
	return [
		{
			name: "list_notes",
			label: "Read workspace notes",
			description: "Read the current workspace notes. Requires viewer access.",
			parameters: Type.Object({}),
			execute: async (_id, _args, signal) => {
				signal?.throwIfAborted();
				const result = listNotes(context);
				return { content: [{ type: "text", text: JSON.stringify(result) }], details: result };
			},
		},
		{
			name: "add_note",
			label: "Save a workspace note",
			description: "Save a note when the user asks. Requires editor access.",
			parameters: Type.Object({ text: Type.String({ minLength: 1, maxLength: 2000 }) }),
			execute: async (_id, args, signal) => {
				signal?.throwIfAborted();
				const note = createNote(context, CreateNoteInputSchema.parse(args));
				return { content: [{ type: "text", text: JSON.stringify(note) }], details: note };
			},
		},
	];
}
