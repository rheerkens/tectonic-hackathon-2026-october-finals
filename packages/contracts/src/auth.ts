import { z } from "zod";
export const AuthModeSchema = z.enum(["dev", "clerk"]);
export function readAuthMode(env: Record<string, string | undefined>) {
	const runtime = z.enum(["development", "test", "production"]).optional().safeParse(env.NODE_ENV);
	if (!runtime.success) throw new Error("NODE_ENV must be development, test or production.");
	const parsed = AuthModeSchema.safeParse(env.AUTH_MODE);
	if (!parsed.success) throw new Error("Set AUTH_MODE explicitly to dev or clerk.");
	const production = env.NODE_ENV === "production" || !!env.RAILWAY_ENVIRONMENT_ID;
	if (production && parsed.data === "dev")
		throw new Error("Production requires AUTH_MODE=clerk; synthetic users are development-only.");
	return { mode: parsed.data, production };
}
