import { z } from "zod";
import { NoteSchema } from "../shared/contract";
export const ListNotesResponseSchema = z.array(NoteSchema);
