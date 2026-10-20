import { mountCreateConversation } from "@day-one/chat/create/server";
import { mountHistory } from "@day-one/chat/history/server";
import { mountListConversations } from "@day-one/chat/list/server";
import { mountSendChat } from "@day-one/chat/send/server";
import {
	localChatStatus,
	type ProductRunOptions,
	runLocalChat,
} from "@day-one/chat/shared/model.server";
import type { ChatStatus } from "@day-one/chat/status/contract";
import { mountChatStatus } from "@day-one/chat/status/server";
import { REALTIME_PATH } from "@day-one/contracts/realtime";
import type { AppDatabase } from "@day-one/db";
import { mountCreateNote } from "@day-one/notes/create/server";
import { mountListNotes } from "@day-one/notes/list/server";
import { createNoteTools } from "@day-one/notes/shared/tools.server";
import { AppError, createHttpApp, type LogSink, safeError, writeLog } from "@day-one/server";
import { createRealtimeHub, type RealtimeHubOptions } from "@day-one/server/realtime";
import { mountListWorkspaces } from "@day-one/workspaces/list/server";
import { bodyLimit } from "hono/body-limit";
import { type AuthConfig, authConfig, authenticate } from "./auth";
import { mountRealtimeTicket, mountRealtimeUpgrade, type OriginPolicy } from "./realtime";

type Options = {
	db: AppDatabase;
	log?: LogSink;
	development?: boolean;
	auth?: AuthConfig;
	runChat?: (options: ProductRunOptions) => Promise<{ reply: string }>;
	chatStatus?: () => Promise<ChatStatus>;
	origins?: OriginPolicy;
	realtime?: Omit<RealtimeHubOptions, "db">;
};
export function createApp(options: Options) {
	const db = options.db,
		auth = options.auth ?? authConfig();
	const app = createHttpApp({
		...(options.log ? { log: options.log } : {}),
		development: options.development ?? false,
	});
	app.get("/api/health", (c) => c.json({ ok: true }));
	const realtime = createRealtimeHub({
		db,
		// Socket failures have no HTTP request; log the route and source location only.
		onError: (error) =>
			(options.log ?? writeLog)({
				event: "realtime_error",
				requestId: "realtime",
				method: "WS",
				route: REALTIME_PATH,
				...safeError(error, options.development ?? false),
			}),
		...options.realtime,
	});
	mountRealtimeUpgrade(app, {
		hub: realtime,
		policy: options.origins ?? { origins: [], sameOrigin: false },
	});
	app.use(
		"/api/*",
		bodyLimit({
			maxSize: 32000,
			onError: () => {
				throw new AppError(413, "Request is too large.");
			},
		}),
	);
	app.use("/api/*", async (c, next) => {
		c.set("user", await authenticate(c.req.raw, db, auth));
		c.set("publish", realtime.publish);
		await next();
	});
	mountRealtimeTicket(app, realtime);
	app.get("/api/session", (c) => c.json({ user: c.get("user"), mode: auth.mode }));
	mountListWorkspaces(app, db);
	mountCreateNote(app, db);
	mountListNotes(app, db);
	mountCreateConversation(app, db);
	mountListConversations(app, db);
	mountHistory(app, db);
	const status = options.chatStatus ?? localChatStatus;
	mountChatStatus(app, status);
	const abortActive = mountSendChat(app, {
		db,
		status,
		runChat: options.runChat ?? runLocalChat,
		// Add each feature's chat tools here.
		tools: (context) => [...createNoteTools(context)],
	});
	return { app, abortActive, realtime };
}
