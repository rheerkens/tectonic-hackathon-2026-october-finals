import { expect, test } from "bun:test";
import { createApiClient } from "@day-one/http";
import { consumeChat, sendChat } from "./client";
import type { ChatEvent } from "./contract";

const turn = {
	id: "turn",
	conversationId: "conversation",
	message: "Hi",
	reply: "Hello 🌍",
	status: "completed",
	tools: [],
	createdAt: "2026-01-01T00:00:00.000Z",
};
test("stream parser handles split UTF-8 bytes and a final event without newline", async () => {
	const bytes = new TextEncoder().encode(
		JSON.stringify({ type: "text", text: "Hello 🌍" }) +
			"\n" +
			JSON.stringify({ type: "done", turn }),
	);
	const response = new Response(
		new ReadableStream({
			start(controller) {
				for (const byte of bytes) controller.enqueue(Uint8Array.of(byte));
				controller.close();
			},
		}),
	);
	const events: ChatEvent[] = [];
	await consumeChat(response, (event) => events.push(event), new AbortController().signal);
	expect(events[0]).toEqual({ type: "text", text: "Hello 🌍" });
	expect(events[1]?.type).toBe("done");
});
test("a truncated stream cannot be mistaken for a completed chat", async () => {
	await expect(
		consumeChat(
			new Response('{"type":"text","text":"Partial"}\n'),
			() => {},
			new AbortController().signal,
		),
	).rejects.toThrow("before chat completed");
});
test("cancellation releases the response reader", async () => {
	const abort = new AbortController();
	abort.abort();
	let cancelled = false;
	const response = new Response(
		new ReadableStream({
			cancel() {
				cancelled = true;
			},
		}),
	);
	await expect(consumeChat(response, () => {}, abort.signal)).rejects.toThrow();
	expect(cancelled).toBe(true);
});

test("chat POST does not retry and streamed failure retains correlation", async () => {
	let calls = 0;
	const client = createApiClient({
		headers: async () => ({}),
		fetch: async () => {
			calls++;
			return Response.json({ code: "UNAVAILABLE", message: "Offline" }, { status: 503 });
		},
	});
	await expect(
		sendChat({
			client,
			conversationId: "c",
			message: "Hello",
			signal: new AbortController().signal,
			onEvent: () => {},
		}),
	).rejects.toMatchObject({ status: 503 });
	expect(calls).toBe(1);
	await expect(
		consumeChat(
			new Response(
				JSON.stringify({
					type: "error",
					code: "INTERNAL",
					message: "Chat failed.",
					requestId: "turn-1",
				}) + "\n",
			),
			() => {},
			new AbortController().signal,
		),
	).rejects.toMatchObject({ requestId: "turn-1", code: "INTERNAL" });
});
test("cancellation interrupts a reader waiting for the next chunk", async () => {
	const controller = new AbortController();
	let cancelled = false;
	const run = consumeChat(
		new Response(
			new ReadableStream({
				cancel() {
					cancelled = true;
				},
			}),
		),
		() => {},
		controller.signal,
	);
	controller.abort();
	await expect(run).rejects.toThrow();
	expect(cancelled).toBe(true);
});
