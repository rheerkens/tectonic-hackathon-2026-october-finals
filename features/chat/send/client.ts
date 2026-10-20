import { ErrorBodySchema } from "@day-one/contracts";
import { type ApiClient, ApiError, inputError } from "@day-one/http";
import { type ChatEvent, ChatEventSchema, SendChatInputSchema } from "./contract";
export async function sendChat({
	client,
	conversationId,
	message,
	signal,
	onEvent,
}: {
	client: ApiClient;
	conversationId: string;
	message: string;
	signal: AbortSignal;
	onEvent: (event: ChatEvent) => void;
}) {
	const input = SendChatInputSchema.safeParse({ message });
	if (!input.success) throw inputError(input.error);
	const deadline = new AbortController();
	const timer = setTimeout(() => deadline.abort(), 90000);
	const combined = AbortSignal.any([signal, deadline.signal]);
	try {
		const response = await client.response(
			`/api/conversations/${encodeURIComponent(conversationId)}/turns`,
			{ method: "POST", body: JSON.stringify(input.data), signal: combined },
			{ timeoutMs: 90000 },
		);
		await consumeChat(response, onEvent, combined);
	} catch (error) {
		if (deadline.signal.aborted && !signal.aborted)
			throw new ApiError(0, {
				code: "TIMEOUT",
				message: "Chat reached its 90-second limit. Check saved history before sending again.",
			});
		throw error;
	} finally {
		clearTimeout(timer);
	}
}

// Split-chunk NDJSON parsing adapted from the previous web chat transport.
export async function consumeChat(
	response: Response,
	onEvent: (event: ChatEvent) => void,
	signal: AbortSignal,
) {
	const failure = (message: string) =>
		new ApiError(response.status, {
			code: "INVALID_RESPONSE",
			message,
			...(response.headers.get("x-request-id")
				? { requestId: response.headers.get("x-request-id") ?? "" }
				: {}),
		});
	if (!response.ok) {
		const data: unknown = await response.json().catch(() => null);
		const parsed = ErrorBodySchema.safeParse(data);
		throw parsed.success
			? new ApiError(response.status, parsed.data)
			: failure("Chat could not start.");
	}
	if (!response.body) throw failure("Chat stream is missing.");

	const reader = response.body.getReader(),
		decoder = new TextDecoder();
	const cancel = () => {
		void reader.cancel().catch(() => {});
	};
	signal.addEventListener("abort", cancel, { once: true });
	let buffer = "",
		done = false;
	const parse = (line: string) => {
		if (!line.trim()) return;
		let event: ChatEvent;
		try {
			event = ChatEventSchema.parse(JSON.parse(line));
		} catch {
			throw failure("The server returned an invalid chat event.");
		}
		if (event.type === "error") throw new ApiError(500, event);
		if (event.type === "done") done = true;
		onEvent(event);
	};
	try {
		while (true) {
			signal.throwIfAborted();
			const chunk = await reader.read();
			signal.throwIfAborted();
			if (chunk.done) break;
			buffer += decoder.decode(chunk.value, { stream: true });
			if (buffer.length > 1000000) throw failure("Chat event is too large.");
			let newline = buffer.indexOf("\n");
			while (newline >= 0) {
				parse(buffer.slice(0, newline));
				buffer = buffer.slice(newline + 1);
				newline = buffer.indexOf("\n");
			}
		}
		buffer += decoder.decode();
		if (buffer.trim()) parse(buffer);
		if (!done)
			throw failure(
				"The connection ended before chat completed. Check saved history before sending again.",
			);
	} finally {
		signal.removeEventListener("abort", cancel);
		await reader.cancel().catch(() => {});
		reader.releaseLock();
	}
}
