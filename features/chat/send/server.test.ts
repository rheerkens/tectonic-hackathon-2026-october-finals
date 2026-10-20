import { expect, test } from "bun:test";
import { createRunner } from "@day-one/ai";
import { memberships, turns } from "@day-one/db";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { model, textStream, toolStream } from "../../../packages/ai/test/fixtures";
import { ConversationSchema, TurnSchema } from "../shared/contract";
import { SYSTEM_PROMPT } from "../shared/model.server";
import { fixture, request } from "../shared/test-fixture";
import { ChatEventSchema } from "./contract";

async function conversation(f: ReturnType<typeof fixture>) {
	return ConversationSchema.parse(
		await (await request(f, "/api/workspaces/studio/conversations", "alex", {})).json(),
	);
}
test("real pi tools write SQLite; private history/results survive reopening", async () => {
	let calls = 0;
	const runner = createRunner({
		streamFn: () =>
			++calls === 1
				? toolStream("add_note", { text: "Saved by pi" })
				: textStream("Saved your note."),
	});
	const f = fixture((options) =>
		runner({ ...options, model, token: "fixture", systemPrompt: SYSTEM_PROMPT }),
	);
	const c = await conversation(f);
	const response = await request(f, `/api/conversations/${c.id}/turns`, "alex", {
		message: "Save a note",
	});
	const events = (await response.text())
		.trim()
		.split("\n")
		.map((line) => ChatEventSchema.parse(JSON.parse(line)));
	expect(events.at(-1)?.type).toBe("done");
	expect(events.filter((e) => e.type === "tool").map((e) => e.tool.status)).toEqual([
		"running",
		"completed",
	]);
	expect((await request(f, `/api/conversations/${c.id}`, "sam")).status).toBe(404);
	// The tool's note reaches the workspace; the finished turn reaches only its owner.
	expect(f.published.slice(1)).toEqual([
		{
			audience: "workspace",
			workspaceId: "studio",
			actorId: "alex",
			targets: [{ family: "notes" }],
		},
		{
			audience: "user",
			userId: "alex",
			workspaceId: "studio",
			actorId: "alex",
			targets: [{ family: "conversations" }, { family: "history", id: c.id }],
		},
	]);
	f.reopen();
	const history = z
		.object({ turns: z.array(TurnSchema) })
		.parse(await (await request(f, `/api/conversations/${c.id}`)).json());
	expect(history.turns[0]?.reply).toBe("Saved your note.");
	expect(history.turns[0]?.tools[0]).toMatchObject({ status: "completed", name: "add_note" });
	expect(JSON.stringify(await (await request(f, "/api/workspaces/studio/notes")).json())).toContain(
		"Saved by pi",
	);
	expect(calls).toBe(2);
});
test("a viewer cannot write through the pi tool", async () => {
	let calls = 0;
	const runner = createRunner({
		streamFn: () =>
			++calls === 1
				? toolStream("add_note", { text: "unauthorized" })
				: textStream("Permission denied."),
	});
	const f = fixture((options) =>
		runner({ ...options, model, token: "fixture", systemPrompt: SYSTEM_PROMPT }),
	);
	const c = ConversationSchema.parse(
		await (await request(f, "/api/workspaces/studio/conversations", "sam", {})).json(),
	);
	const response = await request(f, `/api/conversations/${c.id}/turns`, "sam", { message: "Save" });
	expect(await response.text()).toContain('"status":"failed"');
	expect(
		JSON.stringify(await (await request(f, "/api/workspaces/studio/notes")).json()),
	).not.toContain("unauthorized");
});
test("overlapping turns are rejected and request cancellation persists", async () => {
	const started = Promise.withResolvers<void>();
	const f = fixture(async (options) => {
		started.resolve();
		await new Promise<void>((resolve) => {
			options.signal.addEventListener("abort", () => resolve(), { once: true });
		});
		options.signal.throwIfAborted();
		return { reply: "" };
	});
	const c = await conversation(f),
		abort = new AbortController();
	const response = await f.app.request(`/api/conversations/${c.id}/turns`, {
		method: "POST",
		headers: { "x-dev-user": "alex", "Content-Type": "application/json" },
		body: JSON.stringify({ message: "Hi" }),
		signal: abort.signal,
	});
	await started.promise;
	expect(
		(await request(f, `/api/conversations/${c.id}/turns`, "alex", { message: "Again" })).status,
	).toBe(409);
	abort.abort();
	await response.text();
	expect(f.db.select().from(turns).get()?.status).toBe("interrupted");
});
test("cancellation during provider readiness does not start a turn", async () => {
	const readiness = Promise.withResolvers<{ available: true; model: string }>();
	let runs = 0;
	const f = fixture(
		async () => {
			runs++;
			return { reply: "" };
		},
		() => readiness.promise,
	);
	const c = await conversation(f),
		abort = new AbortController();
	const response = f.app.request(`/api/conversations/${c.id}/turns`, {
		method: "POST",
		headers: { "x-dev-user": "alex", "Content-Type": "application/json" },
		body: JSON.stringify({ message: "Hi" }),
		signal: abort.signal,
	});
	abort.abort();
	readiness.resolve({ available: true, model: "fixture" });
	expect((await response).status).toBe(400);
	expect(runs).toBe(0);
	expect(f.db.select().from(turns).all()).toHaveLength(0);
});
test("revocation during readiness cannot send private history to the model", async () => {
	const readiness = Promise.withResolvers<{ available: true; model: string }>(),
		entered = Promise.withResolvers<void>();
	let runs = 0;
	const f = fixture(
		async () => {
			runs++;
			return { reply: "" };
		},
		() => {
			entered.resolve();
			return readiness.promise;
		},
	);
	const c = await conversation(f);
	const response = request(f, `/api/conversations/${c.id}/turns`, "alex", { message: "Hi" });
	await entered.promise;
	f.db
		.delete(memberships)
		.where(and(eq(memberships.workspaceId, "studio"), eq(memberships.userId, "alex")))
		.run();
	readiness.resolve({ available: true, model: "fixture" });
	expect((await response).status).toBe(403);
	expect(runs).toBe(0);
});
test("unexpected stream errors do not disclose server details", async () => {
	const f = fixture(async () => {
			throw new Error("private database path and provider internals");
		}),
		c = await conversation(f);
	const response = await request(f, `/api/conversations/${c.id}/turns`, "alex", { message: "Hi" });
	const text = await response.text();
	expect(text).toContain("Chat could not complete");
	expect(text).not.toContain("private database path");
});
