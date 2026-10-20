// Pi event-stream fixtures adapted from Tectonic chat-runner.test.ts.
import {
	type AssistantMessage,
	createAssistantMessageEventStream,
	type ToolCall,
} from "@earendil-works/pi-ai";
import { getBuiltinModels } from "@earendil-works/pi-ai/providers/all";

const selected = getBuiltinModels("openai-codex").find((model) => model.id === "gpt-6-luna");
if (!selected) throw new Error("Pinned pi catalog is missing the previous default model.");
export const model = selected;
function assistant(
	content: AssistantMessage["content"],
	stopReason: AssistantMessage["stopReason"],
): AssistantMessage {
	return {
		role: "assistant",
		content,
		api: model.api,
		provider: model.provider,
		model: model.id,
		usage: {
			input: 1,
			output: 1,
			cacheRead: 0,
			cacheWrite: 0,
			totalTokens: 2,
			cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 },
		},
		stopReason,
		timestamp: Date.now(),
	};
}
export function textStream(text: string) {
	const stream = createAssistantMessageEventStream(),
		initial = assistant([], "pending"),
		partial = assistant([{ type: "text", text }], "pending");
	stream.push({ type: "start", partial: initial });
	stream.push({ type: "text_start", contentIndex: 0, partial: initial });
	stream.push({ type: "text_delta", contentIndex: 0, delta: text, partial });
	stream.push({ type: "text_end", contentIndex: 0, content: text, partial });
	stream.push({
		type: "done",
		reason: "stop",
		message: assistant([{ type: "text", text }], "stop"),
	});
	return stream;
}
export function toolStream(name: string, args: ToolCall["arguments"] = {}) {
	const stream = createAssistantMessageEventStream(),
		initial = assistant([], "pending");
	const call = {
		type: "toolCall",
		id: "call-1",
		name,
		arguments: args,
	} satisfies AssistantMessage["content"][number];
	const partial = assistant([call], "pending");
	stream.push({ type: "start", partial: initial });
	stream.push({ type: "toolcall_start", contentIndex: 0, partial: initial });
	stream.push({ type: "toolcall_end", contentIndex: 0, toolCall: call, partial });
	stream.push({ type: "done", reason: "toolUse", message: assistant([call], "toolUse") });
	return stream;
}
