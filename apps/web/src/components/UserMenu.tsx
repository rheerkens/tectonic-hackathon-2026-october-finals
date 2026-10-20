// Account menu adapted from Tectonic apps/web/src/components/UserMenu.tsx; uses the native popover API.
import type { User } from "@day-one/contracts";
import { Avatar } from "@day-one/ui/avatar";
import { Button } from "@day-one/ui/button";
import { useId } from "react";

export function UserMenu({ user, role }: { user: User; role: string }) {
	const id = useId();
	return (
		<>
			<Button
				variant="ghost"
				className="account"
				popoverTarget={id}
				aria-haspopup="dialog"
				aria-label={`Account: ${user.name}`}
			>
				<Avatar name={user.name} />
				<span className="account-name">
					<strong>{user.name}</strong>
					<small>{role}</small>
				</span>
			</Button>
			<div id={id} popover="auto" role="dialog" aria-label="Account" className="account-menu">
				<div className="account-menu-heading">
					<strong>{user.name}</strong>
					{user.email && <small>{user.email}</small>}
				</div>
			</div>
		</>
	);
}
