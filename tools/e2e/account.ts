import type { Page } from "@playwright/test";

/** Sign-out lives in the account menu popover. */
export async function signOut(page: Page) {
	await page.getByRole("button", { name: /^Account:/ }).click();
	await page.getByRole("button", { name: "Sign out" }).click();
}
