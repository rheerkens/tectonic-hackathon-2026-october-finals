import type { AgentTool } from "@day-one/ai";
import { type AppDatabase, conversations, turns } from "@day-one/db";
import { type ApiEnvironment, AppError, type WriteContext } from "@day-one/server";
import { and, desc, eq } from "drizzle-orm";
import type { Hono } from "hono";
import { conversationAccess } from "../shared/access.server";
import { conversationsFamily, historyFamily } from "../shared/keys";
import type { ProductRunOptions } from "../shared/model.server";
import type { ChatStatus } from "../status/contract";
import { type ChatEvent, SendChatInputSchema } from "./contract";
export type SendChatOptions = {
	db: AppDatabase;
	runChat: (options: ProductRunOptions) => Promise<{ reply: string }>;
	status: () => Promise<ChatStatus>;
	// App composition supplies each feature's authorized tools; chat imports no other feature.
	tools: (context: WriteContext) => AgentTool[];
};
export function mountSendChat(
	app: Hono<ApiEnvironment>,
	{ db, runChat, status, tools }: SendChatOptions,
) {
	const active = new Map<string, AbortController>();
	app.post("/api/conversations/:id/turns", async (c) => {
		const userId = c.get("user").id,
			publish = c.get("publish"),
			conversation = conversationAccess({ db, id: c.req.param("id"), userId });
		c.set("workspaceId", conversation.workspaceId);
		const input = SendChatInputSchema.parse(await c.req.json());
		if (active.has(conversation.id))
			throw new AppError(409, "This conversation already has a running request.");
		const available = await status();
		if (!available.available) throw new AppError(503, available.message);
		// Recheck access and cancellation after asynchronous provider readiness.
		conversationAccess({ db, id: conversation.id, userId });
		if (c.req.raw.signal.aborted) throw new AppError(400, "Chat request cancelled.");
		if (active.has(conversation.id))
			throw new AppError(409, "This conversation already has a running request.");
		const abort = new AbortController();
		active.set(conversation.id, abort);
		const requestAbort = () => abort.abort();
		c.req.raw.signal.addEventListener("abort", requestAbort, { once: true });
		if (c.req.raw.signal.aborted) abort.abort();
		const timeout = setTimeout(() => abort.abort(), 90000);
		const history = db
			.select()
			.from(turns)
			.where(and(eq(turns.conversationId, conversation.id), eq(turns.status, "completed")))
			.orderBy(desc(turns.createdAt))
			.limit(20)
			.all()
			.reverse();
		const turn = {
			id: crypto.randomUUID(),
			conversationId: conversation.id,
			message: input.message,
			reply: "",
			status: "pending" as const,
			tools: [],
			createdAt: new Date().toISOString(),
		};
		db.insert(turns).values(turn).run();
		// The first message names the conversation; later messages keep that title.
		db.update(conversations)
			.set({ title: input.message.slice(0, 60) })
			.where(
				and(eq(conversations.id, conversation.id), eq(conversations.title, "New conversation")),
			)
			.run();
		let closed = false;
		const encoder = new TextEncoder();
		const stream = new ReadableStream<Uint8Array>({
			start(controller) {
				const emit = async (event: ChatEvent) => {
					if (abort.signal.aborted || closed) throw new Error("Chat cancelled.");
					controller.enqueue(encoder.encode(JSON.stringify(event) + "\n"));
				};
				void (async () => {
					try {
						await runChat({
							message: input.message,
							history,
							tools: tools({ db, workspaceId: conversation.workspaceId, userId, publish }),
							signal: abort.signal,
							onEvent: async (event) => {
								if (event.type === "text")
									db.update(turns).set({ reply: event.text }).where(eq(turns.id, turn.id)).run();
								else {
									const current = db.select().from(turns).where(eq(turns.id, turn.id)).get();
									const tools = (current?.tools ?? []).filter((tool) => tool.id !== event.tool.id);
									tools.push(event.tool);
									db.update(turns).set({ tools }).where(eq(turns.id, turn.id)).run();
								}
								await emit(event);
							},
						});
						db.update(turns).set({ status: "completed" }).where(eq(turns.id, turn.id)).run();
						const completed = db.select().from(turns).where(eq(turns.id, turn.id)).get();
						if (!completed) throw new Error("Turn missing.");
						await emit({ type: "done", turn: completed });
					} catch (error) {
						// A Stop or closed tab is not a failure worth logging.
						if (!abort.signal.aborted) c.get("logError")("chat_failed", error);
						// Only a pending turn changes: a reply already saved as completed stays completed.
						db.update(turns)
							.set({ status: abort.signal.aborted ? "interrupted" : "failed" })
							.where(and(eq(turns.id, turn.id), eq(turns.status, "pending")))
							.run();
						if (!abort.signal.aborted && !closed)
							await emit({
								type: "error",
								code: "INTERNAL",
								requestId: c.get("requestId"),
								message: "Chat could not complete. Check your local sign-in and try again.",
							}).catch(() => {});
					} finally {
						clearTimeout(timeout);
						active.delete(conversation.id);
						c.req.raw.signal.removeEventListener("abort", requestAbort);
						if (!closed) {
							closed = true;
							controller.close();
						}
						// After the stream ends, so this tab's own done event lands before the refetch.
						publish({
							audience: "user",
							userId,
							workspaceId: conversation.workspaceId,
							actorId: userId,
							targets: [
								{ family: conversationsFamily },
								{ family: historyFamily, id: conversation.id },
							],
						});
					}
				})();
			},
			cancel() {
				closed = true;
				abort.abort();
			},
		});
		return new Response(stream, {
			headers: {
				"Content-Type": "application/x-ndjson",
				"Cache-Control": "no-store",
				"X-Content-Type-Options": "nosniff",
			},
		});
	});
	return () => {
		for (const controller of active.values()) controller.abort();
	};
}
