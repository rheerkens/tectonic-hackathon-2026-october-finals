import type { User } from "@day-one/contracts";
import { Avatar } from "@day-one/ui/avatar";
import { Button } from "@day-one/ui/button";

export function UserMenu({ user, role }: { user: User; role: string }) {
	return (
		<Button variant="ghost" className="account" aria-label={`Account: ${user.name}`}>
			<Avatar name={user.name} />
			<span className="account-name">
				<strong>{user.name}</strong>
				<small>{role}</small>
			</span>
		</Button>
	);
}
