import { expect, test } from "bun:test";
import { conversations, turns } from "@day-one/db";
import { createFeatureFixture } from "@day-one/server/testing";
import { createApp } from "../src/app";

test("constructing app instances leaves pending turns and saved outcomes untouched", () => {
	const fixture = createFeatureFixture(() => {});
	fixture.db
		.insert(conversations)
		.values({
			id: "active-conversation",
			workspaceId: "studio",
			userId: "alex",
			title: "Running",
			createdAt: new Date().toISOString(),
		})
		.run();
	fixture.db
		.insert(turns)
		.values({
			id: "active-turn",
			conversationId: "active-conversation",
			message: "Save",
			status: "pending",
			reply: "Working",
			createdAt: new Date().toISOString(),
			tools: [{ id: "write", name: "add_note", status: "completed", result: "saved" }],
		})
		.run();
	const before = fixture.db.select().from(turns).all();
	for (let instance = 0; instance < 2; instance++) {
		const { abortActive } = createApp({ db: fixture.db, auth: { mode: "dev" }, log: () => {} });
		abortActive();
		expect(fixture.db.select().from(turns).all()).toEqual(before);
	}
});

test("application mounts health, session, and authenticated feature routes", async () => {
	const fixture = createFeatureFixture(() => {});
	const { app, abortActive } = createApp({
		db: fixture.db,
		log: () => {},
		auth: { mode: "dev" },
		chatStatus: async () => ({ available: false, message: "fixture" }),
	});
	try {
		expect((await app.request("/api/health")).status).toBe(200);
		expect((await app.request("/api/workspaces")).status).toBe(401);
		const headers = { "x-dev-user": "alex" };
		for (const path of [
			"/api/session",
			"/api/workspaces",
			"/api/chat/status",
			"/api/workspaces/studio/notes",
			"/api/workspaces/studio/conversations",
		])
			expect((await app.request(path, { headers })).status).toBe(200);
		expect(
			(
				await app.request("/api/workspaces/studio/notes", {
					method: "POST",
					headers: { ...headers, "Content-Type": "application/json" },
					body: JSON.stringify({ text: "x".repeat(33000) }),
				})
			).status,
		).toBe(413);
	} finally {
		abortActive();
	}
});

test("real API validation, denied writes and body limits use the shared envelope", async () => {
	const fixture = createFeatureFixture(() => {});
	const { app } = createApp({ db: fixture.db, auth: { mode: "dev" }, log: () => {} });
	for (const [user, text, status, code] of [
		["alex", "", 400, "VALIDATION"],
		["sam", "Forbidden", 403, "FORBIDDEN"],
		["alex", "x".repeat(33000), 413, "PAYLOAD_TOO_LARGE"],
	] satisfies Array<[string, string, number, string]>) {
		const response = await app.request("/api/workspaces/studio/notes", {
			method: "POST",
			headers: { "x-dev-user": user, "Content-Type": "application/json" },
			body: JSON.stringify({ text }),
		});
		const body = await response.json();
		expect(response.status).toBe(status);
		expect(body.code).toBe(code);
		expect(body.requestId).toBe(response.headers.get("x-request-id"));
		if (code === "VALIDATION") expect(body.fieldErrors.text).toHaveLength(1);
	}
});
