import { expect, test } from "bun:test";
import { createApiClient } from "@day-one/http";
import { createFeatureFixture } from "@day-one/server/testing";
import { QueryClient, QueryObserver } from "@tanstack/react-query";
import { mountListNotes } from "../list/server";
import { listNotesOptions } from "../list/state";
import { notesKey } from "../shared/keys";
import { mountCreateNote } from "./server";
import { createNoteOptions } from "./state";

function fixture(userId: string) {
	const api = createFeatureFixture((app, db) => {
		mountListNotes(app, db);
		mountCreateNote(app, db);
	});
	const client = createApiClient({
		headers: async () => ({ "x-dev-user": userId }),
		fetch: async (path, init) => api.app.request(path, init),
	});
	return { client, userId, workspaceId: "studio" };
}
test("successful create refreshes the observed list and leaves other scopes alone", async () => {
	const scope = fixture("alex");
	const queries = new QueryClient({
		defaultOptions: {
			queries: { retry: false, gcTime: Infinity },
			mutations: { retry: false, gcTime: Infinity },
		},
	});
	const observer = new QueryObserver(queries, listNotesOptions(scope));
	const unsubscribe = observer.subscribe(() => {});
	try {
		await observer.refetch();
		const otherUser = notesKey({ userId: "sam", workspaceId: "studio" });
		const otherWorkspace = notesKey({ userId: "alex", workspaceId: "sandbox" });
		queries.setQueryData(otherUser, ["other user"]);
		queries.setQueryData(otherWorkspace, ["other workspace"]);
		const mutation = queries.getMutationCache().build(queries, createNoteOptions(scope, queries));
		await mutation.execute({ text: "  Saved through feature state  " });
		expect(
			observer.getCurrentResult().data?.some((note) => note.text === "Saved through feature state"),
		).toBe(true);
		expect(queries.getQueryData(otherUser)).toEqual(["other user"]);
		expect(queries.getQueryData(otherWorkspace)).toEqual(["other workspace"]);
	} finally {
		unsubscribe();
		queries.clear();
	}
});
test("a denied mutation preserves the list and exposes the server error", async () => {
	const scope = fixture("sam");
	const queries = new QueryClient({
		defaultOptions: {
			queries: { retry: false, gcTime: Infinity },
			mutations: { retry: false, gcTime: Infinity },
		},
	});
	try {
		const before = await queries.fetchQuery(listNotesOptions(scope));
		const mutation = queries.getMutationCache().build(queries, createNoteOptions(scope, queries));
		await expect(mutation.execute({ text: "Forbidden write" })).rejects.toThrow("role");
		expect(queries.getQueryData(notesKey(scope))).toEqual(before);
		expect(mutation.state.status).toBe("error");
	} finally {
		queries.clear();
	}
});
