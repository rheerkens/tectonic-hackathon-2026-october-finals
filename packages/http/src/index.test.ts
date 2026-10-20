import { expect, test } from "bun:test";
import { z } from "zod";
import { ApiError, createApiClient } from "./index";

const headers = async () => ({});
const schema = z.object({ ok: z.boolean() });
test("typed field errors preserve status and request correlation", async () => {
	const client = createApiClient({
		headers,
		fetch: async () =>
			Response.json(
				{
					code: "VALIDATION",
					message: "Fix input.",
					fieldErrors: { text: ["Required."] },
					requestId: "r1",
				},
				{ status: 400 },
			),
	});
	try {
		await client.json("/notes", schema, { method: "POST" });
		throw new Error("Expected failure");
	} catch (error) {
		expect(error).toBeInstanceOf(ApiError);
		if (!(error instanceof ApiError)) throw error;
		expect(error.status).toBe(400);
		expect(error.fieldErrors).toEqual({ text: ["Required."] });
		expect(error.requestId).toBe("r1");
	}
});
for (const method of ["GET", "POST", "PUT", "DELETE"])
	test(`${method} retries transient failures only when it is a read`, async () => {
		let calls = 0;
		const client = createApiClient({
			headers,
			fetch: async () => {
				calls++;
				return Response.json({ code: "UNAVAILABLE", message: "Unavailable." }, { status: 503 });
			},
		});
		await expect(client.json("/resource", schema, { method })).rejects.toBeInstanceOf(ApiError);
		expect(calls).toBe(method === "GET" ? 2 : 1);
	});
test("a network failure retries once and succeeds", async () => {
	let calls = 0;
	const client = createApiClient({
		headers,
		fetch: async () => {
			if (++calls === 1) throw new TypeError("offline");
			return Response.json({ ok: true });
		},
	});
	expect(await client.json("/read", schema)).toEqual({ ok: true });
	expect(calls).toBe(2);
});
test("401 triggers recovery once and is never retried", async () => {
	let calls = 0,
		expired = 0;
	const client = createApiClient({
		headers,
		onUnauthorized: () => {
			expired++;
		},
		fetch: async () => {
			calls++;
			return Response.json({ code: "UNAUTHENTICATED", message: "Sign in." }, { status: 401 });
		},
	});
	await expect(client.json("/private", schema)).rejects.toMatchObject({
		status: 401,
		code: "UNAUTHENTICATED",
	});
	expect(calls).toBe(1);
	expect(expired).toBe(1);
});
for (const status of [400, 403, 404, 409, 429])
	test(`HTTP ${status} is not retried`, async () => {
		let calls = 0;
		const client = createApiClient({
			headers,
			fetch: async () => {
				calls++;
				return new Response("", { status });
			},
		});
		await expect(client.json("/read", schema)).rejects.toBeInstanceOf(ApiError);
		expect(calls).toBe(1);
	});
test("malformed successful responses are not retried or exposed", async () => {
	let calls = 0;
	const client = createApiClient({
		headers,
		fetch: async () => {
			calls++;
			return Response.json({ secret: "private" }, { headers: { "x-request-id": "r2" } });
		},
	});
	await expect(client.json("/read", schema)).rejects.toMatchObject({
		code: "INVALID_RESPONSE",
		requestId: "r2",
	});
	expect(calls).toBe(1);
});
test("deadline includes body consumption and never retries timeout", async () => {
	let calls = 0;
	const client = createApiClient({
		headers,
		timeoutMs: 10,
		fetch: async () => {
			calls++;
			return new Response(new ReadableStream({}));
		},
	});
	await expect(client.json("/slow", schema)).rejects.toMatchObject({ code: "TIMEOUT" });
	expect(calls).toBe(1);
});
test("deadline also covers asynchronous credentials", async () => {
	let calls = 0;
	const client = createApiClient({
		headers: () => new Promise(() => {}),
		timeoutMs: 10,
		fetch: async () => {
			calls++;
			return Response.json({ ok: true });
		},
	});
	await expect(client.json("/slow", schema)).rejects.toMatchObject({ code: "TIMEOUT" });
	expect(calls).toBe(0);
});
test("caller cancellation is distinct and cannot trigger reauthentication", async () => {
	const controller = new AbortController();
	let expired = 0;
	const client = createApiClient({
		headers,
		onUnauthorized: () => {
			expired++;
		},
		fetch: async () => {
			controller.abort();
			return Response.json({ code: "UNAUTHENTICATED", message: "expired" }, { status: 401 });
		},
	});
	await expect(
		client.json("/private", schema, { signal: controller.signal }),
	).rejects.toMatchObject({ code: "CANCELLED" });
	expect(expired).toBe(0);
});
