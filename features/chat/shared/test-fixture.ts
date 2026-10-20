import { mountListNotes } from "@day-one/notes/list/server";
import { createNoteTools } from "@day-one/notes/shared/tools.server";
import { createFeatureFixture } from "@day-one/server/testing";
import { mountCreateConversation } from "../create/server";
import { mountHistory } from "../history/server";
import { mountListConversations } from "../list/server";
import { mountSendChat } from "../send/server";
import { mountChatStatus } from "../status/server";
import type { ProductRunOptions } from "./model.server";

export { request } from "@day-one/server/testing";
export function fixture(
	runChat?: (options: ProductRunOptions) => Promise<{ reply: string }>,
	chatStatus?: () => Promise<{ available: true; model: string }>,
) {
	return createFeatureFixture((app, db) => {
		mountCreateConversation(app, db);
		mountHistory(app, db);
		mountListConversations(app, db);
		mountListNotes(app, db);
		const status = chatStatus ?? (async () => ({ available: true as const, model: "fixture" }));
		mountChatStatus(app, status);
		return mountSendChat(app, {
			db,
			status,
			tools: createNoteTools,
			runChat:
				runChat ??
				(async (options) => {
					await options.onEvent({ type: "text", text: "Ready." });
					return { reply: "Ready." };
				}),
		});
	});
}
