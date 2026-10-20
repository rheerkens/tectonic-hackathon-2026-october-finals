import { z } from "zod";
import { ConversationSchema } from "../shared/contract";
export const ListConversationsResponseSchema = z.array(ConversationSchema);
