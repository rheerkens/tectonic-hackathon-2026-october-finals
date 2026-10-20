import { existsSync, readdirSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { ClaimBusy, claimFile, type Owner } from "./lock";
import { allocatePorts, isPortFree } from "./ports";

const LEASE_NAME = /^[1-9]\d{0,4}\.json$/;
const isPort = (port: number) => Number.isInteger(port) && port >= 1 && port <= 65535;
/** A lease is `<port>.json` directly inside the registry; nothing else is ever opened. */
function leaseName(port: number) {
	if (!isPort(port)) throw new Error(`Invalid lease port: ${port}`);
	return `${port}.json`;
}
/** Lease names in the registry, skipping links, directories and names that are not `<port>.json`. */
export function listLeases(registry: string) {
	if (!existsSync(registry)) return [];
	return readdirSync(registry, { withFileTypes: true })
		.filter((entry) => entry.isFile() && LEASE_NAME.test(entry.name))
		.map((entry) => Number.parseInt(entry.name, 10))
		.filter(isPort)
		.map(leaseName);
}
export function registryDir() {
	return (
		process.env.DEV_PORT_REGISTRY ||
		join(process.env.XDG_CACHE_HOME || join(homedir(), ".cache"), "day-one", "port-leases")
	);
}
export async function reservePorts(options: { owner: Owner; seed: number; registry?: string }) {
	const registry = options.registry ?? registryDir();
	const reserved = new Set<number>();
	for (let i = 0; i < 100; i++) {
		const ports = await allocatePorts({ seed: options.seed + i, reserved });
		let releaseWeb: (() => void) | undefined;
		try {
			releaseWeb = claimFile(registry, leaseName(ports.web), options.owner);
			const releaseApi = claimFile(registry, leaseName(ports.api), options.owner);
			if (!(await isPortFree(ports.web)) || !(await isPortFree(ports.api))) {
				releaseApi();
				releaseWeb();
				reserved.add(ports.web);
				reserved.add(ports.api);
				continue;
			}
			return {
				ports,
				release: () => {
					releaseApi();
					releaseWeb?.();
				},
			};
		} catch (error) {
			releaseWeb?.();
			if (!(error instanceof ClaimBusy)) throw error;
			reserved.add(ports.web);
			reserved.add(ports.api);
		}
	}
	throw new Error("No free web/API pair. Inspect local port leases with bun doctor.");
}
