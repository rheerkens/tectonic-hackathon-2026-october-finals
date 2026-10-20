import { Avatar } from "@day-one/ui/avatar";
import type { PresenceUser, RealtimeStatus } from "../state/realtime";

const labels: Record<RealtimeStatus, string> = {
	online: "Live",
	connecting: "Connecting",
	reconnecting: "Reconnecting",
	offline: "Offline",
};

/** Who else has this workspace open, and whether live updates are flowing. */
export function Presence({ users, status }: { users: PresenceUser[]; status: RealtimeStatus }) {
	const shown = users.slice(0, 4);
	return (
		<div className="presence">
			{shown.length > 0 && (
				<ul className="presence-users" aria-label="Also here">
					{shown.map((user) => (
						<li key={user.userId}>
							<Avatar name={user.name} size={28} label={user.name} />
						</li>
					))}
					{users.length > shown.length && (
						<li className="presence-more">+{users.length - shown.length}</li>
					)}
				</ul>
			)}
			<span className={`live-status live-status-${status}`} role="status">
				<span className="live-dot" aria-hidden="true" />
				<span className="live-label">{labels[status]}</span>
			</span>
		</div>
	);
}
