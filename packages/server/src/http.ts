import { validationFields } from "@day-one/contracts";
import { Hono } from "hono";
import { matchedRoutes } from "hono/route";
import { ZodError } from "zod";
import { type ApiEnvironment, AppError } from "./index";
import { type LogSink, safeError, writeLog } from "./logging";
export function createHttpApp({
	log = writeLog,
	development = false,
}: {
	log?: LogSink;
	development?: boolean;
} = {}) {
	const app = new Hono<ApiEnvironment>();
	app.use("*", async (c, next) => {
		const requestId = crypto.randomUUID(),
			started = performance.now();
		c.set("requestId", requestId);
		c.header("x-request-id", requestId);
		const metadata = () => ({
			requestId,
			method: c.req.method,
			route:
				matchedRoutes(c)
					.filter((r) => r.path !== "*" && !r.path.endsWith("/*"))
					.at(-1)?.path ?? "unmatched",
			...(c.get("user") ? { userId: c.get("user").id } : {}),
			...(c.get("workspaceId") ? { workspaceId: c.get("workspaceId") } : {}),
		});
		c.set("logError", (event, error) =>
			log({ event, ...metadata(), ...safeError(error, development) }),
		);
		await next();
		log({
			event: "request",
			...metadata(),
			status: c.res.status,
			durationMs: Math.round(performance.now() - started),
		});
	});
	app.onError((error, c) => {
		const requestId = c.get("requestId");
		if (error instanceof AppError)
			return c.json(
				{
					code: error.code,
					message: error.message,
					requestId,
					...(error.fieldErrors ? { fieldErrors: error.fieldErrors } : {}),
				},
				error.status,
			);
		if (error instanceof ZodError)
			return c.json(
				{
					code: "VALIDATION",
					message: "Check the highlighted fields.",
					fieldErrors: validationFields(error),
					requestId,
				},
				400,
			);
		if (error instanceof SyntaxError)
			return c.json({ code: "VALIDATION", message: "Send a valid JSON request.", requestId }, 400);
		c.get("logError")("api_error", error);
		return c.json({ code: "INTERNAL", message: "The request could not complete.", requestId }, 500);
	});
	app.notFound((c) =>
		c.json(
			{
				code: "NOT_FOUND",
				message: "This endpoint does not exist.",
				requestId: c.get("requestId"),
			},
			404,
		),
	);
	return app;
}
