import { expect, test } from "bun:test";
import { createDraftStore } from "./drafts";

test("drafts survive same-account reauthentication and remain scoped by workspace/action", () => {
	const store = createDraftStore();
	store.activate("alex");
	store.set("alex", "studio", "note", "unsent note");
	store.set("alex", "studio", "chat", "unsent message");
	store.select("alex", "studio");
	// The store outlives both auth adapters and the signed-in page. Reauthentication reuses it.
	store.activate("alex");
	expect(store.get("alex", "studio", "note")).toBe("unsent note");
	expect(store.get("alex", "studio", "chat")).toBe("unsent message");
	expect(store.get("alex", "sandbox", "note")).toBe("");
	expect(store.workspace("alex")).toBe("studio");
});
test("account changes and explicit signout clear drafts; old callbacks cannot restore them", () => {
	const store = createDraftStore();
	store.activate("alex");
	store.set("alex", "studio", "note", "private");
	store.activate("sam");
	store.set("alex", "studio", "note", "late old callback");
	expect(store.get("sam", "studio", "note")).toBe("");
	store.activate("alex");
	expect(store.get("alex", "studio", "note")).toBe("");
	store.set("alex", "studio", "note", "new");
	store.clear();
	store.activate("alex");
	expect(store.get("alex", "studio", "note")).toBe("");
});
