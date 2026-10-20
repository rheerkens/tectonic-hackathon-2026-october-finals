import type { ChangedMessage } from "@day-one/http/realtime";
import type { Query, QueryClient } from "@tanstack/react-query";

/** A change target names a key family: [family, userId, id] or the workspace-scoped [family, userId, workspaceId]. */
export const changedKeys = (userId: string, message: ChangedMessage) =>
	message.targets.map((target) => [target.family, userId, target.id ?? message.workspaceId]);

/**
 * Refetches loaded queries that match. A matching read already in flight may have been answered
 * before the change, and TanStack would reuse it, so it is refetched once it settles instead.
 * Failed queries keep their manual retry. While waiting, a stop function sits in `pending` so the
 * owner can cancel on unmount; it removes itself when the reads settle.
 */
export type PendingRefetches = Set<() => void>;
function refetchMatching(
	queries: QueryClient,
	matches: (query: Query) => boolean,
	pending: PendingRefetches,
) {
	const cache = queries.getQueryCache();
	const inFlight = new Set(
		cache
			.findAll({ predicate: (query) => matches(query) && query.state.fetchStatus === "fetching" })
			.map((query) => query.queryHash),
	);
	void queries.invalidateQueries({
		predicate: (query) =>
			matches(query) && query.state.status === "success" && !inFlight.has(query.queryHash),
	});
	if (!inFlight.size) return;
	const unsubscribe = cache.subscribe((event) => {
		const query = event.query;
		if (!inFlight.has(query.queryHash)) return;
		if (event.type !== "removed" && query.state.fetchStatus === "fetching") return;
		inFlight.delete(query.queryHash);
		if (event.type !== "removed" && query.state.status === "success")
			void queries.invalidateQueries({ queryKey: query.queryKey, exact: true });
		if (!inFlight.size) stop();
	});
	const stop = () => {
		unsubscribe();
		pending.delete(stop);
	};
	pending.add(stop);
}

export function applyChange(
	queries: QueryClient,
	userId: string,
	message: ChangedMessage,
	pending: PendingRefetches,
) {
	const prefixes = changedKeys(userId, message);
	refetchMatching(
		queries,
		(query) =>
			prefixes.some((prefix) => prefix.every((part, index) => query.queryKey[index] === part)),
		pending,
	);
}

/** After the server admits a subscription, refetch everything loaded before admission. */
export const refreshAfterSubscribe = (queries: QueryClient, pending: PendingRefetches) =>
	refetchMatching(queries, () => true, pending);

/**
 * Access to a workspace was removed. Drop every cached result for this identity, including the
 * workspace directory, so nothing from the workspace stays on screen even if the refetch fails.
 */
export const clearAfterRevocation = (queries: QueryClient) => queries.resetQueries();
