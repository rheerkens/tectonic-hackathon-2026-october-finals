import type { Turn } from "@day-one/chat/shared/contract";
import type { ChatStatus } from "@day-one/chat/status/contract";
import { Button } from "@day-one/ui/button";
import { TextareaField } from "@day-one/ui/field";
import { ChatMarkdown } from "../ChatMarkdown";

type Props = {
	status: ChatStatus;
	turns: Turn[];
	live: Turn | null;
	busy: boolean;
	error: string;
	fieldError: string;
	needsRefresh: boolean;
	onRefresh: () => Promise<void>;
	onRetry: () => void;
	draft: string;
	canSend: boolean;
	onDraft: (value: string) => void;
	onSend: (message?: string) => Promise<void>;
	onStop: () => void;
	onDismiss: () => void;
};
export function ChatPanel({
	status,
	turns,
	live,
	busy,
	error,
	draft,
	canSend,
	onDraft,
	onSend,
	onStop,
	onDismiss,
	fieldError,
	needsRefresh,
	onRefresh,
	onRetry,
}: Props) {
	return (
		<section className="chat-panel">
			<div className="panel-heading">
				<div className="panel-title">
					<span className="assistant-mark small-mark" aria-hidden="true">
						✳
					</span>
					<h1>Studio assistant</h1>
				</div>
				<span className={status.available ? "model-status ready" : "model-status"}>
					<i />
					{status.available ? "Ready" : "Needs sign-in"}
				</span>
			</div>
			<form
				className="composer"
				onSubmit={(e) => {
					e.preventDefault();
					void onSend();
				}}
			>
				<TextareaField
					id="message"
					label="Message"
					hideLabel
					error={fieldError}
					placeholder="Ask something, or save a note…"
					value={draft}
					onChange={(e) => onDraft(e.target.value)}
					disabled={busy || !status.available}
					rows={2}
				/>
				<div className="composer-footer">
					<span>Your conversation is private.</span>
					{busy ? (
						<Button type="button" variant="primary" onClick={() => onStop()}>
							Stop
						</Button>
					) : (
						<Button
							type="submit"
							variant="primary"
							disabled={!canSend || !status.available}
							aria-label="Send message"
						>
							Send
						</Button>
					)}
				</div>
			</form>
			<div className="messages" aria-live="polite">
				{!turns.length && !live && (
					<div className="empty-chat">
						<span className="assistant-mark" aria-hidden="true">
							✳
						</span>
						<h3>What are we working on?</h3>
						<p>I can read your workspace notes and save a new one when you ask.</p>
						<div className="suggestions">
							<Button
								type="button"
								disabled={!status.available}
								onClick={() => void onSend("Show my workspace notes.")}
							>
								Show my notes <span>↗</span>
							</Button>
							<Button
								type="button"
								disabled={!status.available}
								onClick={() => onDraft("Save a note: Demo ready for review.")}
							>
								Save an idea <span>↗</span>
							</Button>
						</div>
					</div>
				)}
				{[...turns, ...(live ? [live] : [])].map((turn) => (
					<article className="turn" key={turn.id}>
						<div className="user-message">{turn.message}</div>
						<div className="assistant-message">
							<span className="assistant-mark small-mark" aria-hidden="true">
								✳
							</span>
							<div className="assistant-body">
								{turn.reply ? (
									<ChatMarkdown text={turn.reply} />
								) : (
									<span className="muted working">Working…</span>
								)}
								{turn.tools.map((tool) => (
									<details key={tool.id} className="tool-result" data-status={tool.status}>
										<summary>
											{tool.name === "list_notes" ? "Read workspace notes" : "Save workspace note"}
											<span>{tool.status}</span>
										</summary>
										{tool.status !== "running" && <pre>{tool.result}</pre>}
									</details>
								))}
								{turn.status !== "completed" && turn.status !== "pending" && (
									<small className="muted">{turn.status}. Send a new message to continue.</small>
								)}
							</div>
						</div>
					</article>
				))}
			</div>
			{!status.available && (
				<p className="notice">
					<span>{status.message}</span>
					<Button type="button" variant="ghost" onClick={onRetry}>
						Check again
					</Button>
				</p>
			)}
			{error && (
				<p role="alert" className="error">
					<span>{error}</span>
					<Button
						type="button"
						variant="ghost"
						aria-label="Dismiss error"
						onClick={() => onDismiss()}
					>
						×
					</Button>
				</p>
			)}
			{needsRefresh && (
				<div className="panel-actions">
					<Button type="button" variant="secondary" onClick={() => void onRefresh()}>
						Refresh saved progress
					</Button>
				</div>
			)}
		</section>
	);
}
