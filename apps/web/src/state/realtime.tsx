// Live updates for the signed-in user. Mounted inside the identity key, so an account change or
// sign-out stops the socket and a new user starts with a new connection and a new query cache.
import type { PresenceUser } from "@day-one/contracts/realtime";
import { REALTIME_PATH } from "@day-one/contracts/realtime";
import { createApiClient } from "@day-one/http";
import { createRealtimeClient, type RealtimeStatus } from "@day-one/http/realtime";
import { useQueryClient } from "@tanstack/react-query";
import {
	createContext,
	type ReactNode,
	useContext,
	useEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import { useSession } from "../auth/context";
import {
	applyChange,
	clearAfterRevocation,
	type PendingRefetches,
	refreshAfterSubscribe,
} from "./realtime-cache";

export type { PresenceUser, RealtimeStatus };

type Realtime = {
	status: RealtimeStatus;
	/** Workspaces whose subscription the server acknowledged on the current connection. */
	acknowledged: ReadonlySet<string>;
	presence: Record<string, PresenceUser[]>;
	subscribe: (workspaceId: string) => () => void;
};
const RealtimeContext = createContext<Realtime | null>(null);

const realtimeUrl = () =>
	`${window.location.protocol === "https:" ? "wss:" : "ws:"}//${window.location.host}${REALTIME_PATH}`;

export function RealtimeProvider({ children }: { children: ReactNode }) {
	const session = useSession();
	const userId = session.user?.id ?? "";
	const queries = useQueryClient();
	// The session object changes on every auth render; the connection only follows the user.
	const latest = useRef(session);
	latest.current = session;
	const [status, setStatus] = useState<RealtimeStatus>("connecting");
	const [presence, setPresence] = useState<Record<string, PresenceUser[]>>({});
	const [acknowledged, setAcknowledged] = useState<ReadonlySet<string>>(new Set());
	const refreshes = useRef<PendingRefetches>(new Set());
	const realtime = useMemo(() => {
		const without = (workspaceId: string) => {
			setPresence(({ [workspaceId]: _, ...rest }) => rest);
			setAcknowledged((current) => new Set([...current].filter((id) => id !== workspaceId)));
		};
		return createRealtimeClient({
			client: createApiClient({
				headers: () => latest.current.headers(),
				onUnauthorized: () => latest.current.expire(),
			}),
			url: realtimeUrl(),
			onStatus: (next) => {
				setStatus(next);
				// A new connection must be acknowledged again before it counts as live.
				if (next !== "online") setAcknowledged(new Set());
			},
			// Refetch before marking the workspace live, so "Live" means nothing earlier was missed.
			onSubscribed: (workspaceId) => {
				refreshAfterSubscribe(queries, refreshes.current);
				setAcknowledged((current) => new Set(current).add(workspaceId));
			},
			onChanged: (message) => applyChange(queries, userId, message, refreshes.current),
			onPresence: (workspaceId, users) =>
				setPresence((current) => ({ ...current, [workspaceId]: users })),
			// Membership changed: hide presence and every cached result at once, then reload what is
			// still allowed. The directory refetches too, so the workspace shows as unavailable.
			onRevoked: (workspaceId) => {
				without(workspaceId);
				void clearAfterRevocation(queries);
			},
		});
	}, [queries, userId]);
	useEffect(() => {
		const pending = refreshes.current;
		realtime.start();
		return () => {
			realtime.stop();
			for (const stop of pending) stop();
			pending.clear();
		};
	}, [realtime]);
	// Stable across status/presence updates so subscribers do not resubscribe on every render.
	const subscribe = useMemo(
		() => (workspaceId: string) => {
			const release = realtime.subscribe(workspaceId);
			return () => {
				release();
				setPresence(({ [workspaceId]: _, ...rest }) => rest);
				setAcknowledged((current) => new Set([...current].filter((id) => id !== workspaceId)));
			};
		},
		[realtime],
	);
	const value = useMemo<Realtime>(
		() => ({ status, acknowledged, presence, subscribe }),
		[status, acknowledged, presence, subscribe],
	);
	return <RealtimeContext.Provider value={value}>{children}</RealtimeContext.Provider>;
}

/** Follows one workspace while mounted. Pass "" until membership is confirmed. */
export function useLiveWorkspace(workspaceId: string) {
	const realtime = useContext(RealtimeContext);
	if (!realtime) throw new Error("Realtime provider is missing.");
	const { subscribe } = realtime;
	useEffect(() => (workspaceId ? subscribe(workspaceId) : undefined), [workspaceId, subscribe]);
	const status: RealtimeStatus =
		realtime.status === "online" && !realtime.acknowledged.has(workspaceId)
			? "connecting"
			: realtime.status;
	return { status, users: realtime.presence[workspaceId] ?? [] };
}
