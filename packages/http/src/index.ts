import {
	type ErrorBody,
	ErrorBodySchema,
	type ErrorCode,
	validationFields,
} from "@day-one/contracts";
import { z } from "zod";
export class ApiError extends Error {
	readonly code: ErrorCode;
	readonly requestId: string | undefined;
	readonly fieldErrors: ErrorBody["fieldErrors"];
	constructor(
		readonly status: number,
		body: ErrorBody,
	) {
		super(body.message);
		this.name = "ApiError";
		this.code = body.code;
		this.requestId = body.requestId;
		this.fieldErrors = body.fieldErrors;
	}
}
export function inputError(error: z.ZodError) {
	return new ApiError(400, {
		code: "VALIDATION",
		message: "Check the highlighted fields.",
		fieldErrors: validationFields(error),
	});
}
export const isUncertainWrite = (error: unknown) =>
	error instanceof ApiError &&
	(error.status >= 500 || ["TIMEOUT", "NETWORK", "INVALID_RESPONSE"].includes(error.code));
export const isRetryableRead = (error: unknown) =>
	error instanceof ApiError &&
	(error.code === "NETWORK" || [502, 503, 504, 500].includes(error.status));
function cancelled() {
	return new ApiError(0, { code: "CANCELLED", message: "Request cancelled." });
}
async function abortable<T>(run: () => Promise<T>, signal: AbortSignal): Promise<T> {
	signal.throwIfAborted();
	let listener: () => void = () => {};
	const interrupted = new Promise<never>((_, reject) => {
		listener = () => reject(signal.reason);
		signal.addEventListener("abort", listener, { once: true });
	});
	try {
		return await Promise.race([run(), interrupted]);
	} finally {
		signal.removeEventListener("abort", listener);
	}
}
export function createApiClient({
	headers,
	fetch: transport = globalThis.fetch,
	baseUrl = "",
	timeoutMs = 15000,
	onUnauthorized,
}: {
	headers: () => Promise<Record<string, string>>;
	fetch?: (input: string, init?: RequestInit) => Promise<Response>;
	baseUrl?: string;
	timeoutMs?: number;
	onUnauthorized?: () => void;
}) {
	async function request<T>(
		path: string,
		init: RequestInit,
		consume: (response: Response) => Promise<T>,
		deadlineMs = timeoutMs,
	) {
		const deadline = new AbortController();
		const timer = setTimeout(
			() => deadline.abort(new ApiError(0, { code: "TIMEOUT", message: "The request timed out." })),
			deadlineMs,
		);
		const signal = init.signal ? AbortSignal.any([init.signal, deadline.signal]) : deadline.signal;
		const method = (init.method ?? "GET").toUpperCase();
		try {
			for (let attempt = 0; ; attempt++) {
				try {
					return await abortable(async () => {
						const auth = await headers();
						signal.throwIfAborted();
						const outgoing = new Headers(init.headers);
						for (const [key, value] of Object.entries(auth)) outgoing.set(key, value);
						if (init.body && !outgoing.has("Content-Type"))
							outgoing.set("Content-Type", "application/json");
						const response = await transport(baseUrl + path, {
							...init,
							headers: outgoing,
							signal,
						});
						if (!response.ok) {
							const body: unknown = await response.json().catch(() => null);
							signal.throwIfAborted();
							const parsed = ErrorBodySchema.safeParse(body);
							const error = new ApiError(
								response.status,
								parsed.success
									? parsed.data
									: {
											code:
												response.status === 401
													? "UNAUTHENTICATED"
													: response.status === 403
														? "FORBIDDEN"
														: response.status >= 500
															? "INTERNAL"
															: "INVALID_RESPONSE",
											message:
												response.status === 401
													? "Sign in to continue."
													: "The request could not complete.",
											...(response.headers.get("x-request-id")
												? { requestId: response.headers.get("x-request-id") ?? "" }
												: {}),
										},
							);
							if (response.status === 401) onUnauthorized?.();
							throw error;
						}
						return consume(response);
					}, signal);
				} catch (failure) {
					const error = init.signal?.aborted
						? cancelled()
						: deadline.signal.aborted
							? deadline.signal.reason
							: failure instanceof ApiError
								? failure
								: new ApiError(0, { code: "NETWORK", message: "Could not reach the server." });
					if (method === "GET" && attempt === 0 && isRetryableRead(error) && !signal.aborted)
						continue;
					throw error;
				}
			}
		} finally {
			clearTimeout(timer);
		}
	}
	return {
		response(path: string, init: RequestInit = {}, options: { timeoutMs?: number } = {}) {
			return request(path, init, async (response) => response, options.timeoutMs);
		},
		json<T>(path: string, schema: z.ZodType<T>, init: RequestInit = {}) {
			return request(path, init, async (response) => {
				try {
					const body: unknown = await response.json();
					return schema.parse(body);
				} catch {
					throw new ApiError(response.status, {
						code: "INVALID_RESPONSE",
						message: "The server returned an unexpected response.",
						...(response.headers.get("x-request-id")
							? { requestId: response.headers.get("x-request-id") ?? "" }
							: {}),
					});
				}
			});
		},
	};
}
export type ApiClient = ReturnType<typeof createApiClient>;
export type ClientContext = { client: ApiClient; userId: string };
export type WorkspaceContext = ClientContext & { workspaceId: string };
export const errorMessage = (error: unknown) => {
	if (error instanceof ApiError)
		return (
			error.message +
			(error.requestId && (error.status >= 500 || error.code === "INVALID_RESPONSE")
				? ` Reference: ${error.requestId}`
				: "")
		);
	return "The request could not complete.";
};
