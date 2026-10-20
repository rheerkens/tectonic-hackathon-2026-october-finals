import { createShutdown } from "./shutdown";
/** Cleanup waits until startup has stopped acquiring resources. */
export function createLifecycle(cleanup: (reason: string, code: number) => Promise<void>) {
	const startup = Promise.withResolvers<void>();
	let stopping = false;
	const stop = createShutdown(async (reason, code) => {
		stopping = true;
		await startup.promise;
		await cleanup(reason, code);
	});
	return {
		stop,
		started: () => startup.resolve(),
		isStopping: () => stopping,
		assertStarting: () => {
			if (stopping) throw new Error("Startup cancelled.");
		},
	};
}
