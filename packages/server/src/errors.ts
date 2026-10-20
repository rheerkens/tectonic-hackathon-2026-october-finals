import type { ErrorCode, FieldErrors } from "@day-one/contracts";

const codes = {
	400: "VALIDATION",
	401: "UNAUTHENTICATED",
	403: "FORBIDDEN",
	404: "NOT_FOUND",
	409: "CONFLICT",
	413: "PAYLOAD_TOO_LARGE",
	503: "UNAVAILABLE",
} satisfies Record<number, ErrorCode>;
export class AppError extends Error {
	constructor(
		readonly status: keyof typeof codes,
		message: string,
		readonly fieldErrors?: FieldErrors,
	) {
		super(message);
	}
	get code() {
		return codes[this.status];
	}
}
