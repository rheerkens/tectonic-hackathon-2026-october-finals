import { expect, test } from "bun:test";
import { QueryClient, QueryObserver } from "@tanstack/react-query";
import {
	applyChange,
	changedKeys,
	clearAfterRevocation,
	type PendingRefetches,
	refreshAfterSubscribe,
} from "./realtime-cache";

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** An active query whose fetch count shows when the cache refetched it. */
function watch(queries: QueryClient, queryKey: unknown[], run: () => Promise<unknown>) {
	let fetches = 0;
	const observer = new QueryObserver(queries, {
		queryKey,
		queryFn: () => {
			fetches++;
			return run();
		},
		retry: false,
	});
	const stop = observer.subscribe(() => {});
	return { fetches: () => fetches, stop };
}

test("change targets map to the same keys feature state uses", () => {
	expect(
		changedKeys("sam", {
			type: "changed",
			workspaceId: "studio",
			actorId: "alex",
			targets: [{ family: "notes" }, { family: "history", id: "c1" }],
		}),
	).toEqual([
		["notes", "sam", "studio"],
		["history", "sam", "c1"],
	]);
});

test("a change refetches only the named family in that workspace", async () => {
	const queries = new QueryClient();
	const notes = watch(queries, ["notes", "sam", "studio"], async () => []);
	const other = watch(queries, ["notes", "sam", "sandbox"], async () => []);
	const chat = watch(queries, ["conversations", "sam", "studio"], async () => []);
	await sleep(5);
	applyChange(
		queries,
		"sam",
		{ type: "changed", workspaceId: "studio", actorId: "alex", targets: [{ family: "notes" }] },
		new Set(),
	);
	await sleep(5);
	expect([notes.fetches(), other.fetches(), chat.fetches()]).toEqual([2, 1, 1]);
	for (const q of [notes, other, chat]) q.stop();
});

test("after subscribing, loaded data and in-flight reads refetch; failed reads keep manual retry", async () => {
	const queries = new QueryClient();
	const loaded = watch(queries, ["notes", "sam", "studio"], async () => []);
	const failed = watch(queries, ["conversations", "sam", "studio"], async () => {
		throw new Error("down");
	});
	await sleep(5);
	let finish: (value: unknown) => void = () => {};
	let slow = true;
	const inFlight = watch(queries, ["history", "sam", "c1"], () =>
		slow ? new Promise((resolve) => (finish = resolve)) : Promise.resolve([]),
	);
	await sleep(1);
	const pending: PendingRefetches = new Set();
	refreshAfterSubscribe(queries, pending);
	expect(pending.size).toBe(1);
	await sleep(5);
	expect([loaded.fetches(), failed.fetches(), inFlight.fetches()]).toEqual([2, 1, 1]);
	// The read started before the subscription may predate a write, so it runs once more.
	slow = false;
	finish([]);
	await sleep(5);
	expect(inFlight.fetches()).toBe(2);
	expect(pending.size).toBe(0);
	for (const q of [loaded, failed, inFlight]) q.stop();
});

test("a change that arrives during a first load refetches after that load settles", async () => {
	const queries = new QueryClient();
	let finish: (value: string) => void = () => {};
	let calls = 0;
	const history = watch(queries, ["history", "sam", "c1"], () =>
		++calls === 1 ? new Promise((resolve) => (finish = resolve)) : Promise.resolve("new"),
	);
	await sleep(1);
	applyChange(
		queries,
		"sam",
		{
			type: "changed",
			workspaceId: "studio",
			actorId: "sam",
			targets: [{ family: "history", id: "c1" }],
		},
		new Set(),
	);
	finish("old");
	await sleep(5);
	expect(history.fetches()).toBe(2);
	expect(queries.getQueryData(["history", "sam", "c1"])).toBe("new");
	history.stop();
});

test("revocation drops cached data even when the refetch fails", async () => {
	const queries = new QueryClient();
	let allowed = true;
	const deny = async () => {
		if (!allowed) throw new Error("403");
		return ["secret"];
	};
	const notes = watch(queries, ["notes", "sam", "studio"], deny);
	const directory = watch(queries, ["workspaces", "sam"], deny);
	await sleep(5);
	allowed = false;
	await clearAfterRevocation(queries).catch(() => {});
	await sleep(5);
	expect(queries.getQueryData(["notes", "sam", "studio"])).toBeUndefined();
	expect(queries.getQueryData(["workspaces", "sam"])).toBeUndefined();
	notes.stop();
	directory.stop();
});
