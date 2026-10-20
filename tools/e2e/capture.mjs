// Adapted from Tectonic capture-demo.mjs: real actions, readiness, timestamps, screenshots.
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { chromium } from "@playwright/test";

const plan = JSON.parse(await readFile(process.argv[2], "utf8"));
const output = resolve(plan.output);
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true });
const scenes = [];
let storageState;
let currentUrl = plan.url;
try {
	for (const scene of plan.scenes) {
		// A scene gets a separate recording; storage/session is carried forward explicitly.
		const context = await browser.newContext({
			viewport: { width: 1280, height: 800 },
			recordVideo: { dir: join(output, "raw"), size: { width: 1280, height: 800 } },
			...(storageState ? { storageState } : {}),
			reducedMotion: "reduce",
		});
		const recordingStarted = performance.now();
		const page = await context.newPage();
		await page.goto(currentUrl, { waitUntil: "networkidle" });
		await page.evaluate(() => document.fonts.ready);
		if (scene.expectBefore)
			await page
				.getByText(scene.expectBefore, { exact: false })
				.first()
				.waitFor({ state: "visible" });
		await page.screenshot({ path: join(output, `${scene.id}-before.png`) });
		await page.evaluate((caption) => {
			const el = document.createElement("div");
			el.id = "presentation-caption";
			el.textContent = caption;
			Object.assign(el.style, {
				position: "fixed",
				bottom: "20px",
				left: "50%",
				transform: "translateX(-50%)",
				maxWidth: "85%",
				background: "#20362ef0",
				color: "#fff",
				padding: "13px 22px",
				font: "600 16px Manrope, sans-serif",
				borderRadius: "8px",
				zIndex: "9999",
				pointerEvents: "none",
			});
			document.body.append(el);
		}, scene.caption);
		const readyOffset = (performance.now() - recordingStarted) / 1000;
		// Narration explains the action before it happens.
		await page.waitForTimeout(scene.audioDuration * 1000 + 400);
		for (const action of scene.actions ?? []) {
			if (action.kind === "click") await page.locator(action.selector).click();
			else if (action.kind === "fill") {
				const locator = page.locator(action.selector);
				await locator.fill("");
				await locator.pressSequentially(action.text, { delay: 30 });
			} else if (action.kind === "waitText")
				await page
					.getByText(action.text, { exact: false })
					.first()
					.waitFor({ state: "visible", timeout: 45000 });
			else if (action.kind === "waitSelector")
				await page.locator(action.selector).waitFor({ state: "visible", timeout: 45000 });
			else if (action.kind === "reload") await page.reload({ waitUntil: "networkidle" });
			else throw new Error(`Unknown action: ${action.kind}`);
		}
		await page.waitForTimeout(1600);
		await page.evaluate(() => document.fonts.ready);
		await page.screenshot({ path: join(output, scene.id + ".png") });
		storageState = await context.storageState();
		currentUrl = page.url();
		const video = page.video();
		await context.close();
		if (!video) throw new Error("Video recorder unavailable.");
		const path = join(output, scene.id + ".webm");
		await rename(await video.path(), path);
		scenes.push({ ...scene, video: path, readyOffset });
	}
	await writeFile(join(output, "capture.json"), JSON.stringify({ scenes }, null, 2));
} finally {
	await browser.close();
}
