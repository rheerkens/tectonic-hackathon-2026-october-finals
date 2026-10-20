import { demoUsers } from "@day-one/contracts";
import { Avatar } from "@day-one/ui/avatar";
import { Button } from "@day-one/ui/button";
import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useSession } from "./context";
export function SignIn() {
	const session = useSession();
	const navigate = useNavigate();
	const [selected, setSelected] = useState(session.reauthUserId ?? "alex");
	return (
		<main className="sign-in">
			<div className="sign-in-copy">
				<span className="wordmark">
					day one
					<span className="brand-dot" />
				</span>
				<span className="eyebrow">A place to make progress</span>
				<h1>
					Start with a thought.
					<br />
					Build something real.
				</h1>
				<p>Your team's notes and conversations, in one quiet workspace.</p>
				<div className="sign-in-footer">A small working example. Ready for your idea.</div>
			</div>
			<section className="sign-in-panel">
				<span className="eyebrow">Local development</span>
				<h2>Choose your demo user</h2>
				{session.expired && (
					<p role="alert">Sign in again. Your unsent text is kept for this account in this tab.</p>
				)}
				<p className="muted">Use a synthetic identity to explore workspace roles.</p>
				<div className="user-list">
					{demoUsers.map((user) => (
						<Button
							type="button"
							key={user.id}
							aria-pressed={selected === user.id}
							variant="ghost"
							className="user-option"
							onClick={() => setSelected(user.id)}
						>
							<Avatar name={user.name} />
							<span>
								<strong>{user.name}</strong>
								<small>
									{user.id === "alex"
										? "Editor · Hackathon studio"
										: user.id === "sam"
											? "Viewer · Hackathon studio"
											: user.id === "jordan"
												? "Owner · Hackathon studio"
												: "Owner · Private sandbox"}
								</small>
							</span>
							<span className="radio" />
						</Button>
					))}
				</div>
				<Button
					variant="primary"
					className="wide"
					type="button"
					onClick={() => {
						if (session.reauthUserId && session.reauthUserId !== selected)
							void navigate({ to: "/" });
						session.signIn(selected);
					}}
				>
					Continue to studio <span>→</span>
				</Button>
				<small className="muted">Synthetic users during development. Clerk-ready for later.</small>
			</section>
		</main>
	);
}
