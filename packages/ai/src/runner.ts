// Extracted from Tectonic apps/api/src/project-chat/runner.ts at 6433fda.
import {
	Agent,
	type AgentMessage,
	type AgentTool,
	type StreamFn,
} from "@earendil-works/pi-agent-core";
import type { Api, Model } from "@earendil-works/pi-ai";
export type ToolProgress =
	| { id: string; name: string; status: "running" }
	| { id: string; name: string; status: "completed" | "failed"; result: string };
export type RunEvent = { type: "text"; text: string } | { type: "tool"; tool: ToolProgress };
export type HistoryTurn = { message: string; reply: string; createdAt: string };
export type RunOptions = {
	model: Model<Api>;
	token: string;
	systemPrompt: string;
	history: HistoryTurn[];
	tools: AgentTool[];
	message: string;
	signal: AbortSignal;
	onEvent: (event: RunEvent) => Promise<void>;
};
function toolResultText(result: unknown) {
	if (
		!result ||
		typeof result !== "object" ||
		!("content" in result) ||
		!Array.isArray(result.content)
	)
		return "";
	return result.content
		.flatMap((part: unknown) =>
			part &&
			typeof part === "object" &&
			"type" in part &&
			part.type === "text" &&
			"text" in part &&
			typeof part.text === "string"
				? [part.text]
				: [],
		)
		.join("\n");
}
function assistantText(message: AgentMessage) {
	return message.role === "assistant"
		? message.content
				.filter((part) => part.type === "text")
				.map((part) => part.text)
				.join("")
		: "";
}
function historyMessages(history: HistoryTurn[], model: Model<Api>): AgentMessage[] {
	const recent: HistoryTurn[] = [];
	let chars = 0;
	for (const turn of history.slice(-20).reverse()) {
		chars += turn.message.length + turn.reply.length;
		if (chars > 32000) break;
		recent.unshift(turn);
	}
	return recent.flatMap((turn): AgentMessage[] => [
		{ role: "user", content: turn.message, timestamp: Date.parse(turn.createdAt) || Date.now() },
		{
			role: "assistant",
			content: [{ type: "text", text: turn.reply }],
			api: model.api,
			provider: model.provider,
			model: model.id,
			stopReason: "stop",
			timestamp: Date.parse(turn.createdAt) || Date.now(),
			usage: {
				input: 0,
				output: 0,
				cacheRead: 0,
				cacheWrite: 0,
				totalTokens: 0,
				cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 },
			},
		},
	]);
}
export function createRunner({ streamFn }: { streamFn: StreamFn }) {
	return async function run(options: RunOptions) {
		if (options.signal.aborted) throw new Error("Chat cancelled.");
		let providerTurns = 0;
		let limitReached = false;
		let deliveryFailure: unknown;
		let reply = "";
		let accumulated = "";
		const calls = new Map<string, ToolProgress>();
		const agent = new Agent({
			streamFn,
			getApiKey: () => options.token,
			toolExecution: "sequential",
			initialState: {
				model: options.model,
				systemPrompt: options.systemPrompt,
				tools: options.tools,
				messages: historyMessages(options.history, options.model),
			},
			finishTurn: (turn) => {
				providerTurns++;
				if (turn.toolResults.length === 0) return { action: "end" };
				if (providerTurns >= 8) {
					limitReached = true;
					return { action: "end" };
				}
				return { action: "continue" };
			},
		});
		const emit = async (event: RunEvent) => {
			try {
				await options.onEvent(event);
			} catch (error) {
				deliveryFailure = error;
				agent.abort();
				throw error;
			}
		};
		const unsubscribe = agent.subscribe(async (event) => {
			if (event.type === "message_update" || event.type === "message_end") {
				if (event.message.role !== "assistant") return;
				const text = assistantText(event.message);
				reply = accumulated + (accumulated && text ? "\n\n" : "") + text;
				if (reply.length > 24000) {
					limitReached = true;
					agent.abort();
					return;
				}
				if (event.type === "message_end") accumulated = reply;
				if (reply) await emit({ type: "text", text: reply });
			} else if (event.type === "tool_execution_start") {
				if (calls.size >= 12) {
					limitReached = true;
					agent.abort();
					return;
				}
				const tool: ToolProgress = {
					id: event.toolCallId,
					name: event.toolName,
					status: "running",
				};
				calls.set(tool.id, tool);
				await emit({ type: "tool", tool });
			} else if (event.type === "tool_execution_end") {
				const previous = calls.get(event.toolCallId);
				if (!previous) return;
				const result = event.isError
					? "Tool failed. Check workspace access and input."
					: toolResultText(event.result);
				const tool: ToolProgress = {
					id: previous.id,
					name: previous.name,
					status: event.isError ? "failed" : "completed",
					result: result.slice(0, 8000),
				};
				calls.set(tool.id, tool);
				await emit({ type: "tool", tool });
			}
		});
		const abort = () => agent.abort();
		options.signal.addEventListener("abort", abort, { once: true });
		try {
			await agent.prompt(options.message);
			if (deliveryFailure) throw deliveryFailure;
			if (options.signal.aborted) throw new Error("Chat cancelled.");
			if (limitReached) throw new Error("Chat reached its output or tool limit.");
			const last = agent.state.messages.findLast((message) => message.role === "assistant");
			if (last?.role !== "assistant" || ["error", "aborted", "length"].includes(last.stopReason))
				throw new Error(
					"Model could not complete the request. Check the local login and try again.",
				);
			return { reply, tools: [...calls.values()] };
		} finally {
			options.signal.removeEventListener("abort", abort);
			unsubscribe();
		}
	};
}
