import { expect, test } from "@playwright/test";

const headers = { "x-dev-user": "alex" };
test("conversation links survive sign-in, refresh and Back; drafts survive switching pages", async ({
	page,
	request,
}) => {
	const response = await request.post("/api/workspaces/studio/conversations", {
		headers,
		data: {},
	});
	expect(response.ok()).toBe(true);
	const conversation = await response.json();
	const path = `/w/studio/chat/${conversation.id}`;
	await page.goto(path);
	await page.getByRole("button", { name: "Continue to studio" }).click();
	await expect(page).toHaveURL(new RegExp(`${path}$`));
	await expect(page.getByLabel("Conversation", { exact: true })).toHaveValue(conversation.id);
	await page.reload();
	await expect(page.getByLabel("Conversation", { exact: true })).toHaveValue(conversation.id);
	await page.getByRole("link", { name: "Notes", exact: true }).click();
	await page.getByLabel("New note", { exact: true }).fill("Retain this draft when I navigate");
	await page.goBack();
	await expect(page).toHaveURL(new RegExp(`${path}$`));
	await page.goForward();
	await expect(page.getByLabel("New note", { exact: true })).toHaveValue(
		"Retain this draft when I navigate",
	);
});

test("creating the first conversation updates the URL without cancelling its send", async ({
	page,
}) => {
	await page.route("**/api/chat/status", (route) =>
		route.fulfill({ json: { available: true, model: "fixture" } }),
	);
	let sends = 0;
	await page.route("**/api/conversations/*/turns", async (route) => {
		sends++;
		const id = new URL(route.request().url()).pathname.split("/")[3];
		await route.fulfill({
			contentType: "application/x-ndjson",
			body:
				[
					{ type: "text", text: "Sent successfully" },
					{
						type: "done",
						turn: {
							id: "fixture-turn",
							conversationId: id,
							message: "Hello",
							reply: "Sent successfully",
							tools: [],
							status: "completed",
							createdAt: new Date().toISOString(),
						},
					},
				]
					.map((event) => JSON.stringify(event))
					.join("\n") + "\n",
		});
	});
	await page.goto("/w/studio/chat");
	await page.getByRole("button", { name: "Continue to studio" }).click();
	await page.getByLabel("Message", { exact: true }).fill("Hello");
	await page.getByRole("button", { name: "Send message" }).click();
	await expect(page).toHaveURL(/\/w\/studio\/chat\/[^/]+$/);
	await expect(page.getByLabel("Message", { exact: true })).toHaveValue("");
	await expect(page.getByRole("button", { name: "Send message" })).toBeEnabled();
	await expect(page.getByRole("alert")).toHaveCount(0);
	expect(sends).toBe(1);
});

test("a conversation URL does not reveal another user's conversation or another workspace", async ({
	page,
	request,
}) => {
	const response = await request.post("/api/workspaces/studio/conversations", {
		headers,
		data: {},
	});
	const conversation = await response.json();
	await page.goto(`/w/studio/chat/${conversation.id}`);
	await page.getByRole("button", { name: /Sam Chen/ }).click();
	await page.getByRole("button", { name: "Continue to studio" }).click();
	await expect(page.getByRole("alert")).toContainText("Conversation not found");
	await expect(page.locator(".turn")).toHaveCount(0);
	await expect(page.getByRole("button", { name: "Send message" })).toBeDisabled();
	await page.goto("/w/sandbox/notes");
	await expect(page.getByRole("heading", { name: "Workspace unavailable" })).toBeVisible();
	await expect(page.getByLabel("New note", { exact: true })).toHaveCount(0);
});

test("notes and chat use document scrolling on tablet and phone", async ({ page, request }) => {
	for (let index = 0; index < 12; index++) {
		const response = await request.post("/api/workspaces/studio/notes", {
			headers,
			data: { text: `Layout note ${index}. ${"A longer saved note. ".repeat(10)}` },
		});
		expect(response.ok()).toBe(true);
	}
	await page.goto("/w/studio/notes");
	await page.getByRole("button", { name: "Continue to studio" }).click();
	for (const size of [
		{ width: 800, height: 1100 },
		{ width: 1024, height: 600 },
		{ width: 390, height: 844 },
	]) {
		await page.setViewportSize(size);
		await page.evaluate(() => window.scrollTo(0, 0));
		const save = await page.getByRole("button", { name: "Save note" }).boundingBox();
		expect(save).not.toBeNull();
		if (save) expect(save.y + save.height).toBeLessThan(size.height);
		const dimensions = await page.evaluate(() => ({
			overflow: document.documentElement.scrollWidth > window.innerWidth,
			scrollers: [...document.querySelectorAll(".studio *")]
				.filter((element) => {
					if (element.tagName === "TEXTAREA") return false;
					return (
						/auto|scroll/.test(getComputedStyle(element).overflowY) &&
						element.scrollHeight > element.clientHeight + 1
					);
				})
				.map((element) => element.className),
		}));
		expect(dimensions).toEqual({ overflow: false, scrollers: [] });
	}
	await page.getByRole("button", { name: "Show more notes" }).click();
	const saved = await (await request.get("/api/workspaces/studio/notes", { headers })).json();
	await expect(page.locator(".note")).toHaveCount(Math.min(20, saved.length));
	await page.getByRole("link", { name: "Chat", exact: true }).click();
	const message = await page.getByLabel("Message", { exact: true }).boundingBox();
	expect(message).not.toBeNull();
	if (message) expect(message.y + message.height).toBeLessThan(844);
	const response = await request.post("/api/workspaces/studio/conversations", {
		headers,
		data: {},
	});
	const conversation = await response.json();
	await page.route(`**/api/conversations/${conversation.id}`, (route) =>
		route.fulfill({
			json: {
				conversation,
				turns: Array.from({ length: 12 }, (_, index) => ({
					id: `long-${index}`,
					conversationId: conversation.id,
					message: `Message ${index}`,
					reply: "A long saved reply. ".repeat(60),
					tools: [],
					status: "completed",
					createdAt: new Date().toISOString(),
				})),
			},
		}),
	);
	await page.goto(`/w/studio/chat/${conversation.id}`);
	await expect(page.locator(".turn")).toHaveCount(12);
	for (const size of [
		{ width: 800, height: 1100 },
		{ width: 1024, height: 600 },
		{ width: 390, height: 844 },
	]) {
		await page.setViewportSize(size);
		const scrollers = await page.evaluate(() =>
			[...document.querySelectorAll(".studio *")]
				.filter(
					(element) =>
						element.tagName !== "TEXTAREA" &&
						/auto|scroll/.test(getComputedStyle(element).overflowY) &&
						element.scrollHeight > element.clientHeight + 1,
				)
				.map((element) => element.className),
		);
		expect(scrollers).toEqual([]);
	}
});

test("leaving chat during conversation creation does not pull the user back or send a message", async ({
	page,
}) => {
	await page.route("**/api/chat/status", (route) =>
		route.fulfill({ json: { available: true, model: "fixture" } }),
	);
	const created = Promise.withResolvers<void>();
	const release = Promise.withResolvers<void>();
	let sends = 0;
	await page.route("**/api/conversations/*/turns", (route) => {
		sends++;
		return route.abort();
	});
	await page.route("**/api/workspaces/studio/conversations", async (route) => {
		if (route.request().method() !== "POST") return route.continue();
		const response = await route.fetch();
		created.resolve();
		await release.promise;
		await route.fulfill({ response }).catch(() => {}); // Navigation may already have cancelled it.
	});
	await page.goto("/w/studio/chat");
	await page.getByRole("button", { name: "Continue to studio" }).click();
	await page.getByLabel("Message", { exact: true }).fill("Keep this draft if I leave");
	await page.getByRole("button", { name: "Send message" }).click();
	await created.promise;
	await page.getByRole("link", { name: "Notes", exact: true }).click();
	await expect(page.getByRole("heading", { name: "Workspace notes" })).toBeVisible();
	release.resolve();
	await expect(page).toHaveURL(/\/w\/studio\/notes$/);
	await page.getByRole("link", { name: "Chat", exact: true }).click();
	await expect(page.getByLabel("Message", { exact: true })).toHaveValue(
		"Keep this draft if I leave",
	);
	await expect(page.getByRole("button", { name: "Send message" })).toBeEnabled();
	expect(sends).toBe(0);
});

test("a chat tool write refreshes cached notes without chat naming the notes feature", async ({
	page,
	request,
}) => {
	await page.route("**/api/chat/status", (route) =>
		route.fulfill({ json: { available: true, model: "fixture" } }),
	);
	const note = `Saved by a chat tool ${Date.now()}`;
	await page.route("**/api/conversations/*/turns", async (route) => {
		// The injected stream stands in for the model; the real API performs the tool's write.
		const saved = await request.post("/api/workspaces/studio/notes", {
			headers,
			data: { text: note },
		});
		expect(saved.ok()).toBe(true);
		const id = new URL(route.request().url()).pathname.split("/")[3];
		const tool = { id: "fixture-tool", name: "add_note" };
		await route.fulfill({
			contentType: "application/x-ndjson",
			body:
				[
					{ type: "tool", tool: { ...tool, status: "running" } },
					{ type: "tool", tool: { ...tool, status: "completed", result: note } },
					{ type: "text", text: "Saved." },
					{
						type: "done",
						turn: {
							id: "fixture-tool-turn",
							conversationId: id,
							message: "Save a note",
							reply: "Saved.",
							tools: [{ ...tool, status: "completed", result: note }],
							status: "completed",
							createdAt: new Date().toISOString(),
						},
					},
				]
					.map((event) => JSON.stringify(event))
					.join("\n") + "\n",
		});
	});
	await page.goto("/w/studio/notes");
	await page.getByRole("button", { name: "Continue to studio" }).click();
	await expect(page.getByRole("heading", { name: "Workspace notes" })).toBeVisible();
	await expect(page.locator(".note").first()).toBeVisible();
	await page.getByRole("link", { name: "Chat", exact: true }).click();
	await page.getByLabel("Message", { exact: true }).fill("Save a note");
	await page.getByRole("button", { name: "Send message" }).click();
	await expect(page.getByLabel("Message", { exact: true })).toHaveValue("");
	await page.getByRole("link", { name: "Notes", exact: true }).click();
	await expect(page.locator(".note").filter({ hasText: note })).toBeVisible();
});
