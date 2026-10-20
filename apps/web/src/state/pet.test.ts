import { expect, test } from "bun:test";
import { petMood } from "./pet";

test("pet mood follows chat state", () => {
	expect(petMood({ busy: true, error: "x", draft: "hi" })).toBe("running");
	expect(petMood({ busy: false, error: "x", draft: "hi" })).toBe("failed");
	expect(petMood({ busy: false, error: "", draft: "  " })).toBe("idle");
	expect(petMood({ busy: false, error: "", draft: "hi" })).toBe("waiting");
});
