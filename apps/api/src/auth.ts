import { verifyToken } from "@clerk/backend";
import { demoUsers, type User } from "@day-one/contracts";
import { type AppDatabase, users } from "@day-one/db";
import { AppError } from "@day-one/server";
import { readServerConfig } from "./config";
export type AuthConfig = { mode: "dev" } | { mode: "clerk"; secretKey: string };
export const authConfig = () => readServerConfig(process.env).auth;
export async function authenticate(
	req: Request,
	db: AppDatabase,
	config: AuthConfig,
	verify: (token: string, options: { secretKey: string }) => Promise<{ sub: string }> = verifyToken,
): Promise<User> {
	if (config.mode === "dev") {
		const user = demoUsers.find((user) => user.id === req.headers.get("x-dev-user"));
		if (!user) throw new AppError(401, "Choose a synthetic user to sign in.");
		return user;
	}
	const match = /^Bearer (\S+)$/i.exec(req.headers.get("authorization") || "");
	if (!match?.[1]) throw new AppError(401, "Sign in to continue.");
	let claims: { sub: string };
	try {
		claims = await verify(match[1], { secretKey: config.secretKey });
	} catch {
		throw new AppError(401, "Your sign-in is invalid or expired.");
	}
	{
		const user = { id: claims.sub, name: "Signed-in user", email: "" };
		db.insert(users).values(user).onConflictDoNothing().run();
		return user;
	}
}
