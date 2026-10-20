import { z } from "zod";
export const ErrorCodeSchema = z.enum([
	"VALIDATION",
	"UNAUTHENTICATED",
	"FORBIDDEN",
	"NOT_FOUND",
	"CONFLICT",
	"PAYLOAD_TOO_LARGE",
	"UNAVAILABLE",
	"INTERNAL",
	"TIMEOUT",
	"NETWORK",
	"CANCELLED",
	"INVALID_RESPONSE",
]);
export type ErrorCode = z.infer<typeof ErrorCodeSchema>;
export const FieldErrorsSchema = z.record(z.string(), z.array(z.string()));
export type FieldErrors = z.infer<typeof FieldErrorsSchema>;
export const ErrorBodySchema = z.object({
	code: ErrorCodeSchema,
	message: z.string(),
	fieldErrors: FieldErrorsSchema.optional(),
	requestId: z.string().optional(),
});
export type ErrorBody = z.infer<typeof ErrorBodySchema>;
export function validationFields(error: z.ZodError): FieldErrors {
	const fields = new Map<string, string[]>();
	for (const issue of error.issues) {
		const path = issue.path.map(String).join(".") || "_form";
		fields.set(path, [...(fields.get(path) ?? []), issue.message]);
	}
	return Object.fromEntries(fields);
}
