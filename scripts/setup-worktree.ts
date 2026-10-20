// T3 creates the checkout; this hook only prepares it.
import { copyFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dir, "..");
const expected = (await Bun.file(resolve(root, ".bun-version")).text()).trim();
if (Bun.version !== expected) throw new Error(`Use Bun ${expected}; running ${Bun.version}.`);
const proc = Bun.spawn([process.execPath, "install", "--frozen-lockfile"], {
	cwd: root,
	stdout: "inherit",
	stderr: "inherit",
});
if ((await proc.exited) !== 0) process.exit(1);
const env = resolve(root, ".env.local");
if (!existsSync(env)) copyFileSync(resolve(root, ".env.example"), env);
process.stdout.write("Prepared this checkout. Run bun dev when you need the app.\n");
