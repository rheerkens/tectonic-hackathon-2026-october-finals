import { expect, test } from "@playwright/test";
import { signOut } from "../account";

test("synthetic user, SQLite note, refresh, viewer permissions", async ({ page }) => {
	const note = `Browser smoke note ${Date.now()}`;
	await page.goto("/");
	await page.getByRole("button", { name: "Continue to studio" }).click();
	await page.getByLabel("New note", { exact: true }).fill(note);
	await page.getByRole("button", { name: "Save note" }).click();
	await expect(page.locator(".note").filter({ hasText: note })).toBeVisible();
	await expect(page.getByRole("region", { name: "Notifications" })).toContainText("Note saved");
	await expect(page.getByText("Enter a note.")).toHaveCount(0);
	await page.reload();
	await expect(page.locator(".note").filter({ hasText: note })).toBeVisible();
	await signOut(page);
	await page.getByRole("button", { name: /Sam Chen/ }).click();
	await page.getByRole("button", { name: "Continue to studio" }).click();
	await expect(page.getByText("Your role can read these notes.")).toBeVisible();
	await expect(page.getByLabel("New note", { exact: true })).toHaveCount(0);
	await signOut(page);
	await page.getByRole("button", { name: /Casey Park/ }).click();
	await page.getByRole("button", { name: "Continue to studio" }).click();
	await expect(page.locator(".breadcrumb")).toContainText("Private sandbox");
	await expect(page.locator(".note").filter({ hasText: note })).toHaveCount(0);
	await expect(page.getByLabel("New note", { exact: true })).toBeVisible();
});
test("live pi chat tools and history survive refresh", async ({ page }) => {
	test.skip(
		process.env.LIVE_CHAT_SMOKE !== "1",
		"Live host login is an explicit separate smoke; CI never calls a model.",
	);
	await page.goto("/");
	await page.getByRole("button", { name: "Continue to studio" }).click();
	await page.getByRole("link", { name: "Chat", exact: true }).click();
	await page.getByRole("button", { name: "New conversation", exact: true }).click();
	const errors: string[] = [];
	page.on("console", (message) => {
		if (message.type() === "error") errors.push(message.text());
	});
	await page.getByRole("button", { name: "Show my notes" }).click();
	await expect(page.locator(".tool-result summary")).toContainText("completed", { timeout: 40000 });
	await expect(page.locator(".chat-markdown")).not.toBeEmpty({ timeout: 40000 });
	await expect(page.getByRole("button", { name: "Send message" })).toBeVisible();
	await expect(page.locator(".turn")).toHaveCount(1);
	const note = `Live feature-state note ${Date.now()}`;
	await page
		.getByLabel("Message", { exact: true })
		.fill(`Save a note containing exactly this text: ${note}`);
	await page.getByRole("button", { name: "Send message" }).click();
	await expect(page.getByRole("button", { name: "Send message" })).toBeEnabled({ timeout: 40000 });
	await expect(page.locator(".turn")).toHaveCount(2);
	await expect(page.getByRole("button", { name: "Send message" })).toBeVisible({ timeout: 40000 });
	expect(errors).toEqual([]);
	await page.reload();
	await expect(page.locator(".chat-markdown").first()).not.toBeEmpty();
	await expect(page.locator(".tool-result summary").first()).toContainText("completed");
	await expect(page.locator(".turn")).toHaveCount(2);
	await page.getByRole("link", { name: "Notes", exact: true }).click();
	await expect(page.locator(".note").filter({ hasText: note })).toBeVisible();
});
