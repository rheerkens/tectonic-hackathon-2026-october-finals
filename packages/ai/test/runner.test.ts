import { expect, test } from "bun:test";
import { Type } from "typebox";
import { createRunner, type RunEvent, type RunOptions } from "../src/runner";
import { model, textStream, toolStream } from "./fixtures";

function options(overrides: Partial<RunOptions> = {}): RunOptions {
	return {
		model,
		token: "fixture",
		systemPrompt: "Help",
		history: [],
		tools: [],
		message: "Hello",
		signal: new AbortController().signal,
		onEvent: async () => {},
		...overrides,
	};
}
test("streams text through the real pi Agent", async () => {
	const events: RunEvent[] = [];
	const result = await createRunner({ streamFn: () => textStream("Ready.") })(
		options({
			onEvent: async (e) => {
				events.push(e);
			},
		}),
	);
	expect(result.reply).toBe("Ready.");
	expect(events).toContainEqual({ type: "text", text: "Ready." });
});
test("executes a tool and continues to an answer", async () => {
	let requests = 0,
		executed = 0;
	const result = await createRunner({
		streamFn: () => (++requests === 1 ? toolStream("read") : textStream("One note.")),
	})(
		options({
			tools: [
				{
					name: "read",
					label: "Read",
					description: "Read notes",
					parameters: Type.Object({}),
					execute: async () => {
						executed++;
						return { content: [{ type: "text", text: "one" }], details: null };
					},
				},
			],
		}),
	);
	expect(requests).toBe(2);
	expect(executed).toBe(1);
	expect(result.tools).toMatchObject([{ name: "read", status: "completed", result: "one" }]);
});
test("cancellation reaches an executing tool", async () => {
	const controller = new AbortController();
	const started = Promise.withResolvers<void>();
	const run = createRunner({ streamFn: () => toolStream("wait") })(
		options({
			signal: controller.signal,
			tools: [
				{
					name: "wait",
					label: "Wait",
					description: "Wait",
					parameters: Type.Object({}),
					execute: async (_id, _args, signal) => {
						started.resolve();
						return new Promise((_resolve, reject) => {
							signal?.addEventListener("abort", () => reject(new Error("cancelled")), {
								once: true,
							});
							if (signal?.aborted) reject(new Error("cancelled"));
						});
					},
				},
			],
		}),
	);
	await started.promise;
	controller.abort();
	await expect(run).rejects.toThrow("cancelled");
});
test("delivery failure aborts provider and fails the run", async () => {
	let signal: AbortSignal | undefined;
	const run = createRunner({
		streamFn: (_model, _context, opts) => {
			signal = opts?.signal;
			return textStream("Ready");
		},
	});
	await expect(
		run(
			options({
				onEvent: async () => {
					throw new Error("delivery failed");
				},
			}),
		),
	).rejects.toThrow("delivery failed");
	expect(signal?.aborted).toBe(true);
});
test("bounds tool continuations", async () => {
	let count = 0;
	const run = createRunner({
		streamFn: () => {
			count++;
			return toolStream("read");
		},
	});
	await expect(
		run(
			options({
				tools: [
					{
						name: "read",
						label: "Read",
						description: "Read",
						parameters: Type.Object({}),
						execute: async () => ({ content: [{ type: "text", text: "one" }], details: null }),
					},
				],
			}),
		),
	).rejects.toThrow("limit");
	expect(count).toBe(8);
});
