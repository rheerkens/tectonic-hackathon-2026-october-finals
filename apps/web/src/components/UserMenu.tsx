// Account menu adapted from Tectonic apps/web/src/components/UserMenu.tsx; uses the native popover API.
import type { User } from "@day-one/contracts";
import { Avatar } from "@day-one/ui/avatar";
import { Button } from "@day-one/ui/button";
import { useId, useRef } from "react";

export function UserMenu({
	user,
	role,
	switchUsers,
	onSwitch,
	onSignOut,
}: {
	user: User;
	role: string;
	// Synthetic identities only; Clerk sessions switch accounts through sign-out.
	switchUsers?: User[];
	onSwitch?: (id: string) => void;
	onSignOut: () => void;
}) {
	const menu = useRef<HTMLDivElement>(null);
	const id = useId();
	const close = () => menu.current?.hidePopover();
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
			<div
				ref={menu}
				id={id}
				popover="auto"
				role="dialog"
				aria-label="Account"
				className="account-menu"
			>
				<div className="account-menu-heading">
					<strong>{user.name}</strong>
					{user.email && <small>{user.email}</small>}
				</div>
				{switchUsers && onSwitch && (
					<div className="account-menu-users" role="group" aria-label="Switch demo user">
						{switchUsers.map((other) => (
							<Button
								key={other.id}
								variant="ghost"
								className="account-menu-user"
								disabled={other.id === user.id}
								onClick={() => {
									close();
									onSwitch(other.id);
								}}
							>
								<Avatar name={other.name} size={32} />
								<span>{other.name}</span>
								{other.id === user.id && <small>Current</small>}
							</Button>
						))}
					</div>
				)}
				<Button
					variant="ghost"
					className="account-menu-signout"
					onClick={() => {
						close();
						onSignOut();
					}}
				>
					Sign out
				</Button>
			</div>
		</>
	);
}
