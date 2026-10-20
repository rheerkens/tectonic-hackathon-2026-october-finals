import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const file = resolve(import.meta.dir, "../../.local/dev/runtime.json");
let ready = false;
for (let i = 0; i < 150; i++) {
	try {
		const runtime: unknown = JSON.parse(readFileSync(file, "utf8"));
		if (
			runtime &&
			typeof runtime === "object" &&
			"status" in runtime &&
			runtime.status === "ready"
		) {
			ready = true;
			break;
		}
	} catch {}
	await Bun.sleep(100);
}
if (!ready) throw new Error("Dev stack did not become ready. Inspect stack logs.");
