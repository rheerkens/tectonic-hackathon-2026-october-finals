import { readAuthMode } from "@day-one/contracts";

export function readWebConfig(env: Record<string, string | undefined>) {
	// Vite sets NODE_ENV=production for every optimized build, including local demo builds.
	// Railway is a deployment signal; the API independently enforces NODE_ENV at runtime.
	const auth = readAuthMode({
		AUTH_MODE: env.AUTH_MODE,
		RAILWAY_ENVIRONMENT_ID: env.RAILWAY_ENVIRONMENT_ID,
	});
	const publishableKey = env.VITE_CLERK_PUBLISHABLE_KEY?.trim();
	if (auth.mode === "clerk" && !publishableKey)
		throw new Error("Clerk requires VITE_CLERK_PUBLISHABLE_KEY.");
	return { ...auth, publishableKey: publishableKey ?? "" };
}
