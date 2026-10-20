import { z } from "zod";
export const ChatStatusSchema = z.discriminatedUnion("available", [
	z.object({ available: z.literal(true), model: z.string() }),
	z.object({ available: z.literal(false), message: z.string() }),
]);
export type ChatStatus = z.infer<typeof ChatStatusSchema>;
