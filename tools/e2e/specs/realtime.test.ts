import { type Browser, expect, type Page, test } from "@playwright/test";

async function signIn(browser: Browser, name: RegExp) {
	const context = await browser.newContext();
	const page = await context.newPage();
	await page.goto("/");
	await page.getByRole("button", { name }).click();
	await page.getByRole("button", { name: "Continue to studio" }).click();
	await expect(page.getByRole("status").filter({ hasText: "Live" })).toBeVisible();
	return page;
}
const note = (page: Page, text: string) => page.locator(".note").filter({ hasText: text });

test("a saved note appears for another member without reload, with presence and offline recovery", async ({
	browser,
}) => {
	const alex = await signIn(browser, /Alex Morgan/);
	const sam = await signIn(browser, /Sam Chen/);
	// Each sees the other in the workspace header.
	await expect(
		alex.getByRole("list", { name: "Also here" }).getByRole("img", { name: "Sam Chen" }),
	).toBeVisible();
	await expect(
		sam.getByRole("list", { name: "Also here" }).getByRole("img", { name: "Alex Morgan" }),
	).toBeVisible();

	const first = `Live note ${Date.now()}`;
	await alex.getByLabel("New note", { exact: true }).fill(first);
	await alex.getByRole("button", { name: "Save note" }).click();
	await expect(note(sam, first)).toBeVisible();

	// While Sam is offline the change is missed; reconnecting refetches it.
	await sam.context().setOffline(true);
	await expect(
		sam.getByRole("status").filter({ hasText: /Reconnecting|Connecting/ }),
	).toBeVisible();
	await expect(alex.getByRole("list", { name: "Also here" })).toHaveCount(0);
	const second = `Missed while offline ${Date.now()}`;
	await alex.getByLabel("New note", { exact: true }).fill(second);
	await alex.getByRole("button", { name: "Save note" }).click();
	await expect(note(alex, second)).toBeVisible();
	await sam.context().setOffline(false);
	await expect(sam.getByRole("status").filter({ hasText: "Live" })).toBeVisible();
	await expect(note(sam, second)).toBeVisible();

	// Signing out closes the socket, so Alex no longer sees Sam.
	await sam.getByRole("button", { name: /^Account:/ }).click();
	await sam.getByRole("button", { name: "Sign out" }).click();
	await expect(alex.getByRole("list", { name: "Also here" })).toHaveCount(0);
	await alex.context().close();
	await sam.context().close();
});
