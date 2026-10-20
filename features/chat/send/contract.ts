import { ErrorBodySchema, ToolCallSchema } from "@day-one/contracts";
import { z } from "zod";
import { TurnSchema } from "../shared/contract";
export const SendChatInputSchema = z.object({
	message: z.string().trim().min(1, "Enter a message.").max(8000, "Use at most 8,000 characters."),
});
export const ChatEventSchema = z.discriminatedUnion("type", [
	z.object({ type: z.literal("text"), text: z.string() }),
	z.object({ type: z.literal("tool"), tool: ToolCallSchema }),
	z.object({ type: z.literal("done"), turn: TurnSchema }),
	ErrorBodySchema.extend({ type: z.literal("error") }),
]);
export type ChatEvent = z.infer<typeof ChatEventSchema>;
