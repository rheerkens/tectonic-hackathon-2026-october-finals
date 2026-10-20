import { z } from "zod";
import { ConversationSchema, TurnSchema } from "../shared/contract";
export const HistoryResponseSchema = z.object({
	conversation: ConversationSchema,
	turns: z.array(TurnSchema),
});
export type History = z.infer<typeof HistoryResponseSchema>;
