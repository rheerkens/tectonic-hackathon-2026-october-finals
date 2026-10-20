import { expect, test } from "bun:test";
import { CreateNoteInputSchema } from "./contract";

test("note input trims text and rejects malformed or excessive input", () => {
	expect(CreateNoteInputSchema.parse({ text: "  useful note  " }).text).toBe("useful note");
	for (const input of [null, {}, { text: 42 }, { text: "  " }, { text: "x".repeat(2001) }])
		expect(CreateNoteInputSchema.safeParse(input).success).toBe(false);
});
