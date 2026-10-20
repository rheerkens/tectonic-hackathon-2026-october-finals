import { ToolCallSchema } from "@day-one/contracts";
import { z } from "zod";
export const ConversationSchema = z.object({
	id: z.string(),
	workspaceId: z.string(),
	userId: z.string(),
	title: z.string(),
	createdAt: z.string(),
});
export type Conversation = z.infer<typeof ConversationSchema>;
export const TurnSchema = z.object({
	id: z.string(),
	conversationId: z.string(),
	message: z.string(),
	reply: z.string(),
	status: z.enum(["pending", "completed", "failed", "interrupted"]),
	tools: z.array(ToolCallSchema),
	createdAt: z.string(),
});
export type Turn = z.infer<typeof TurnSchema>;
