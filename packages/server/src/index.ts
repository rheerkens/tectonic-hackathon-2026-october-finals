import type { User } from "@day-one/contracts";
import type { AppDatabase } from "@day-one/db";
import type { Publish } from "./realtime";

export { AppError } from "./errors";
export { requireWorkspaceAccess } from "./permissions";
export type ApiEnvironment = {
	Variables: {
		user: User;
		requestId: string;
		workspaceId: string;
		logError: (event: "api_error" | "chat_failed", error: unknown) => void;
		publish: Publish;
	};
};
export type FeatureContext = { db: AppDatabase; workspaceId: string; userId: string };
/** Writes notify open browsers after commit; reads do not need a publisher. */
export type WriteContext = FeatureContext & { publish: Publish };
export { createHttpApp } from "./http";
export type { LogSink, RequestLog } from "./logging";
export { safeError, writeLog } from "./logging";
export type { Change, Publish } from "./realtime";
