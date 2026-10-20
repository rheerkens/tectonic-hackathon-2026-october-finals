import { fileURLToPath } from "node:url";
import { expect, test } from "@playwright/test";
import { signOut } from "../account";

test.beforeEach(async ({ page }) => {
	await page.route("**/api/chat/status", (route) =>
		route.fulfill({ json: { available: true, model: "offline-browser-fixture" } }),
	);
	await page.goto("/");
	await page.getByRole("button", { name: "Continue to studio" }).click();
	await expect(page.getByLabel("New note", { exact: true })).toBeVisible();
	// "Live" follows the subscription acknowledgement, whose refetch has already been sent.
	// Tests that count requests mock routes only after it.
	await expect(page.getByRole("status").filter({ hasText: "Live" })).toBeVisible();
});
test("field feedback stays beside inputs; an uncertain write refreshes SQLite without replay", async ({
	page,
}) => {
	let writes = 0;
	await page.route("**/api/workspaces/studio/notes", async (route) => {
		if (route.request().method() !== "POST") return route.continue();
		writes++;
		await route.fetch(); // The real SQLite commit succeeds, but its response is lost.
		await route.abort("failed");
	});
	await page.getByLabel("New note", { exact: true }).fill("   ");
	await page.getByRole("button", { name: "Save note" }).click();
	await expect(page.locator("#note-error")).toHaveText("Enter a note.");
	expect(writes).toBe(0);
	await page.getByRole("link", { name: "Chat", exact: true }).click();
	await page.getByLabel("Message", { exact: true }).fill(" ");
	await page.getByRole("button", { name: "Send message" }).click();
	await expect(page.locator("#message-error")).toHaveText("Enter a message.");
	await page.getByRole("link", { name: "Notes", exact: true }).click();
	const note = `Uncertain write ${Date.now()}`;
	await page.getByLabel("New note", { exact: true }).fill(note);
	await page.getByRole("button", { name: "Save note" }).click();
	await expect(page.locator(".note").filter({ hasText: note })).toBeVisible();
	await expect(page.getByLabel("New note", { exact: true })).toHaveValue(note);
	await expect(page.getByText(/The save may have completed/)).toBeVisible();
	await expect(page.getByRole("button", { name: "Save note" })).toBeEnabled();
	expect(writes).toBe(1);
});
test("expired auth hides private data, restores same-user drafts and clears them on account change", async ({
	page,
}) => {
	await signOut(page);
	await page.getByRole("button", { name: /Jordan Lee/ }).click();
	await page.getByRole("button", { name: "Continue to studio" }).click();
	await page.getByLabel("New note", { exact: true }).fill("Private unsent note");
	await page.getByRole("link", { name: "Chat", exact: true }).click();
	await page.getByLabel("Message", { exact: true }).fill("Private unsent message");
	await page.getByRole("link", { name: "Notes", exact: true }).click();
	await page.route("**/api/workspaces/studio/notes", (route) =>
		route.request().method() === "POST"
			? route.fulfill({
					status: 401,
					json: {
						code: "UNAUTHENTICATED",
						message: "Sign in again.",
						requestId: "expired-fixture",
					},
				})
			: route.continue(),
	);
	await page.getByRole("button", { name: "Save note" }).click();
	await expect(page.getByText(/Sign in again. Your unsent text/)).toBeVisible();
	await expect(page.locator(".studio")).toHaveCount(0);
	await expect(page.getByRole("button", { name: /Jordan Lee/ })).toHaveAttribute(
		"aria-pressed",
		"true",
	);
	await page.getByRole("button", { name: "Continue to studio" }).click();
	await expect(page.getByLabel("New note", { exact: true })).toHaveValue("Private unsent note");
	await page.getByRole("link", { name: "Chat", exact: true }).click();
	await expect(page.getByLabel("Message", { exact: true })).toHaveValue("Private unsent message");
	await page.getByRole("link", { name: "Notes", exact: true }).click();
	await page.getByRole("button", { name: "Save note" }).click();
	await expect(page.getByRole("button", { name: "Continue to studio" })).toBeVisible();
	await page.getByRole("button", { name: /Casey Park/ }).click();
	await page.getByRole("button", { name: "Continue to studio" }).click();
	await expect(page.getByLabel("New note", { exact: true })).toHaveValue("");
	await page.getByRole("link", { name: "Chat", exact: true }).click();
	await expect(page.getByLabel("Message", { exact: true })).toHaveValue("");
	await signOut(page);
	await page.getByRole("button", { name: "Continue to studio" }).click();
	await expect(page.getByLabel("New note", { exact: true })).toHaveValue("");
});
test("unexpected read failure shows its reference and manual recovery", async ({ page }) => {
	let calls = 0;
	await page.route("**/api/workspaces/studio/notes", (route) => {
		calls++;
		return calls <= 2
			? route.fulfill({
					status: 500,
					json: {
						code: "INTERNAL",
						message: "The request could not complete.",
						requestId: "browser-reference",
					},
				})
			: route.continue();
	});
	await page.reload();
	await expect(page.getByRole("alert")).toContainText("Reference: browser-reference");
	expect(calls).toBe(2);
	await page.getByRole("button", { name: "Retry loading" }).click();
	await expect(page.getByRole("button", { name: "Retry loading" })).toHaveCount(0);
	expect(calls).toBe(3);
});

test("failed chat retains the message and shows its request reference without replay", async ({
	page,
}) => {
	let sends = 0;
	await page.route("**/api/conversations/*/turns", (route) => {
		sends++;
		return route.fulfill({
			status: 503,
			json: { code: "UNAVAILABLE", message: "Chat unavailable.", requestId: "chat-reference" },
		});
	});
	await page.getByRole("link", { name: "Chat", exact: true }).click();
	await page.getByLabel("Message", { exact: true }).fill("Keep this unsent message");
	await page.getByRole("button", { name: "Send message" }).click();
	await expect(page.getByRole("alert")).toContainText("Reference: chat-reference");
	await expect(page.getByLabel("Message", { exact: true })).toHaveValue("Keep this unsent message");
	await expect(page.getByRole("button", { name: "Send message" })).toBeVisible();
	expect(sends).toBe(1);
});
test("rendering crashes show a reload fallback", async ({ page }) => {
	// Vite serves this development-only fixture; it is never imported by the app build.
	const fixture = fileURLToPath(new URL("../fixtures/crash.tsx", import.meta.url));
	await page.evaluate(async (path) => {
		const fixture = await import(path);
		fixture.mountCrash();
	}, `/@fs/${fixture}`);
	await expect(page.getByRole("alert")).toContainText("This page could not continue.");
	await expect(page.getByRole("button", { name: "Reload", exact: true })).toBeVisible();
});
