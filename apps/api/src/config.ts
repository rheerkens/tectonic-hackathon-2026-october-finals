import { readAuthMode } from "@day-one/contracts";
import { z } from "zod";
export function readServerConfig(env: Record<string, string | undefined>) {
	const auth = readAuthMode(env);
	const staticSetting = z.enum(["0", "1"]).optional().safeParse(env.SERVE_STATIC);
	if (!staticSetting.success) throw new Error("SERVE_STATIC must be 0 or 1.");
	const secretKey = env.CLERK_SECRET_KEY?.trim();
	if (auth.mode === "clerk" && !secretKey) throw new Error("Clerk requires CLERK_SECRET_KEY.");
	const port = z.coerce
		.number()
		.int()
		.min(1)
		.max(65535)
		.safeParse(env.API_PORT || env.PORT || "3001");
	if (!port.success) throw new Error("API_PORT/PORT must be an integer between 1 and 65535.");
	// Browser origins allowed to open live updates. The launcher sets these for its web port.
	const webOrigins = (env.WEB_ORIGINS ?? "")
		.split(",")
		.map((value) => value.trim())
		.filter(Boolean);
	for (const origin of webOrigins) {
		let parsed: URL | null = null;
		try {
			parsed = new URL(origin);
		} catch {}
		if (!parsed || parsed.origin !== origin || !/^https?:$/.test(parsed.protocol))
			throw new Error("WEB_ORIGINS must list origins such as http://127.0.0.1:5173.");
	}
	return {
		...auth,
		auth:
			auth.mode === "clerk"
				? { mode: "clerk" as const, secretKey: secretKey ?? "" }
				: { mode: "dev" as const },
		port: port.data,
		hostname: env.API_HOST || "127.0.0.1",
		databasePath: env.DATABASE_PATH || ".local/dev/app.sqlite",
		serveStatic: env.SERVE_STATIC === "1" || auth.production,
		webOrigins,
	};
}
