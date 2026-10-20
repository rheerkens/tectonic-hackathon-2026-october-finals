import { join } from "node:path";
import { launch, stopStack } from "./launcher";
import { listLeases, registryDir } from "./leases";
import { isProcessAlive, readOwner } from "./lock";
import { readRuntime, tailscaleHost } from "./runtime";
import { assertProfile, localDir, resolveWorktree } from "./worktree";

const args = process.argv.slice(2),
	command = args.shift() || "up";
const index = args.indexOf("--profile");
const profile = assertProfile(index >= 0 ? args[index + 1] || "" : "dev");
if (command === "up") await launch({ profile });
else if (command === "stop") {
	try {
		process.stdout.write((await stopStack(profile)) ? "Stop requested.\n" : "No running stack.\n");
	} catch {
		throw new Error("Launcher is unavailable. Inspect bun doctor; no saved PID was signalled.");
	}
} else if (command === "status" || command === "env" || command === "doctor") {
	const root = (await resolveWorktree()).root,
		local = localDir(root, profile),
		runtime = readRuntime(local);
	if (command === "status") {
		process.stdout.write(JSON.stringify(runtime, null, 2) + "\n");
		process.exitCode = runtime?.status === "ready" ? 0 : 1;
	} else if (command === "env") {
		if (!runtime || runtime.status !== "ready")
			throw new Error("Start this profile with bun dev first.");
		process.stdout.write(
			JSON.stringify(
				{
					WEB_URL: runtime.urls.web,
					API_URL: runtime.urls.api,
					DATABASE_PATH: runtime.databasePath,
				},
				null,
				2,
			) + "\n",
		);
	} else {
		const files = listLeases(registryDir());
		process.stdout.write(
			JSON.stringify(
				{
					bun: Bun.version,
					root,
					profile,
					tailscale: await tailscaleHost(),
					runtime,
					profileClaim: readOwner(join(local, "dev.lock")),
					leases: files.map((file) => {
						const owner = readOwner(file);
						return {
							file,
							owner,
							ownerAlive: owner ? isProcessAlive(owner.pid) : null,
						};
					}),
					recovery:
						"Stale claims are retained. Confirm the owner is dead and ports are free before removing only that claim. Never stop a saved PID.",
				},
				null,
				2,
			) + "\n",
		);
	}
} else throw new Error("Use up, stop, status, env, or doctor [--profile name].");
