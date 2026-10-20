// `preinstall` guard adapted from Tectonic scripts/require-bun.ts. A different Bun can ignore bun.lock,
// re-resolve dependencies and rewrite it before this script runs. Fail the install so nobody installs
// or commits a drifted tree. Tracked files are never restored automatically: that could discard
// someone's intended lockfile edits, so the message says how to recover.
import { resolve } from "node:path";

const root = resolve(import.meta.dir, "..");

/** The Bun running `bun install` (the one that touches bun.lock), not whichever `bun` PATH resolved. */
export function installerVersion(userAgent: string | undefined, fallback: string) {
	return /^bun\/(\S+)/.exec(userAgent ?? "")?.[1] ?? fallback;
}

export function bunMismatch(installer: string, expected: string) {
	if (installer === expected) return null;
	return [
		"",
		`Bun ${expected} is required (running ${installer}).`,
		"Install the pinned version, then run `bun install` again:",
		`  curl -fsSL https://bun.sh/install | bash -s -- bun-v${expected}`,
	].join("\n");
}

if (import.meta.main) {
	const expected = (await Bun.file(resolve(root, ".bun-version")).text()).trim();
	const message = bunMismatch(
		installerVersion(process.env.npm_config_user_agent, Bun.version),
		expected,
	);
	if (message) {
		const changed =
			Bun.spawnSync(["git", "diff", "--quiet", "--", "bun.lock"], { cwd: root, stderr: "ignore" })
				.exitCode === 1;
		process.stderr.write(
			`${message}\n${
				changed
					? "bun.lock differs from the committed version. If you did not intend that, run `git checkout -- bun.lock`.\n"
					: ""
			}\n`,
		);
		process.exit(1);
	}
}
