import { expect, test } from "bun:test";
import { ErrorBodySchema, type ErrorCode } from "@day-one/contracts";
import { z } from "zod";
import { AppError, createHttpApp, type RequestLog } from "./index";

test("errors share an envelope and request ID; logs never contain supplied input", async () => {
	const records: RequestLog[] = [];
	const app = createHttpApp({ log: (record) => records.push(record), development: true });
	app.post("/input", async (c) =>
		c.json(z.object({ text: z.string().min(1) }).parse(await c.req.json())),
	);
	app.get("/forbidden", () => {
		throw new AppError(403, "Not allowed.");
	});
	app.get("/explode", () => {
		throw new Error("SECRET_TOKEN user@example.com prompt contents");
	});
	for (const [path, init, status, code] of [
		["/input", { method: "POST", body: JSON.stringify({ text: "" }) }, 400, "VALIDATION"],
		["/input", { method: "POST", body: "{" }, 400, "VALIDATION"],
		["/forbidden", {}, 403, "FORBIDDEN"],
		["/explode", {}, 500, "INTERNAL"],
		["/unknown?token=SECRET_TOKEN", {}, 404, "NOT_FOUND"],
	] satisfies Array<[string, RequestInit, number, ErrorCode]>) {
		const response = await app.request(path, init),
			body = ErrorBodySchema.parse(await response.json());
		expect(response.status).toBe(status);
		expect(body.code).toBe(code);
		expect(body.requestId).toBe(response.headers.get("x-request-id") ?? undefined);
		if (path === "/input" && init.body !== "{") expect(body.fieldErrors?.text).toHaveLength(1);
	}
	const serialized = JSON.stringify(records);
	for (const value of ["SECRET_TOKEN", "user@example.com", "prompt contents"])
		expect(serialized).not.toContain(value);
	expect(records.filter((record) => record.event === "request")).toHaveLength(5);
	expect(records.find((record) => record.event === "api_error")?.stack?.length).toBeGreaterThan(0);
	expect(records.find((record) => record.status === 404)?.route).toBe("unmatched");
});
