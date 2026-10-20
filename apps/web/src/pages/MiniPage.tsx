import { Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Icon } from "../components/Icon";
import { type FinnConversation, type FinnTurn, useFinn } from "../state/finn";

function statusText(conversation: FinnConversation) {
	const turn = conversation.turns.at(-1);
	if (turn?.status === "thinking") return "Thinking…";
	if (turn?.status === "searching") return "Checking sources…";
	if (turn?.status === "waiting") return "Waiting for a reply · simulated";
	if (turn?.message) return "No matching demo answer";
	return "Answer ready";
}

function Answer({ turn }: { turn: FinnTurn }) {
	const [opening, setOpening] = useState(false);
	const [error, setError] = useState("");
	const result = turn.status === "done" || turn.status === "waiting" ? turn.result : null;
	if (!result) {
		return (
			<p className="mini-result-status" role="status">
				{turn.message || (turn.status === "searching" ? "Checking sources…" : "Thinking…")}
			</p>
		);
	}
	const sources = result.sources.filter((source) => source.supports);
	const openLabel = (
		<>
			<span>
				<strong>{opening ? "Opening…" : "Open full result"}</strong>
				<small>All sources, reasoning and next step</small>
			</span>
			<Icon name="arrow-right" size={18} />
		</>
	);
	return (
		<>
			<p className="mini-result-answer">
				{result.answer
					? result.answer.replace(/\*\*/g, "").replace(/\s*\[S\d+\]/g, "")
					: "I'm not sure yet. I don't have enough confirmed information to answer."}
			</p>
			{result.nextStep.kind === "contact_person" && (
				<p className="mini-result-waiting">
					Waiting for {result.nextStep.person}. Contact is simulated.
				</p>
			)}
			<div className="mini-result-meta">
				<span>{Math.round(result.trust.score * 100)}% trust</span>
				{sources.map((source) => (
					<span key={source.code} title={source.title} className="mini-result-source">
						{source.code}
					</span>
				))}
			</div>
			<details className="mini-result-details">
				<summary>
					View details <Icon name="chevron-right" size={16} />
				</summary>
				<div className="mini-result-evidence">
					<ul>
						{result.trust.reasons.slice(0, 2).map((reason) => (
							<li key={reason}>{reason}</li>
						))}
					</ul>
					{sources.map((source) => (
						<p key={source.code}>
							<strong>
								{source.code} · {source.title}
							</strong>
							<br />
							{source.excerpt}
						</p>
					))}
				</div>
				{window.desktop ? (
					window.desktop.openResult && (
						<button
							type="button"
							className="mini-result-open"
							disabled={opening}
							onClick={() => {
								setOpening(true);
								setError("");
								void window.desktop
									?.openResult?.(result.id)
									.catch(() => setError("Could not open the result. Try again."))
									.finally(() => setOpening(false));
							}}
						>
							{openLabel}
						</button>
					)
				) : (
					<Link
						className="mini-result-open"
						to="/results/$resultId"
						params={{ resultId: result.id }}
					>
						{openLabel}
					</Link>
				)}
				{error && <p role="alert">{error}</p>}
			</details>
		</>
	);
}

export function MiniPage() {
	const finn = useFinn(true);
	const input = useRef<HTMLInputElement>(null);
	const transcript = useRef<HTMLDivElement>(null);
	const [view, setView] = useState<"launcher" | "new" | "chat" | "list">("launcher");
	const [focused, setFocused] = useState(document.hasFocus());
	const [drafts, setDrafts] = useState<Record<string, string>>({});
	const active = finn.activeConversation;
	const draftKey = view === "new" ? "new" : (active?.id ?? "new");
	const question = drafts[draftKey] ?? "";
	const busy = finn.status === "thinking" || finn.status === "searching";
	const turns = active?.turns ?? [];
	const notifications = finn.conversations
		.filter(
			(conversation) =>
				conversation.unread ||
				["thinking", "searching"].includes(conversation.turns.at(-1)?.status ?? ""),
		)
		.slice(0, 2);

	useEffect(() => {
		document.documentElement.classList.add("finn-mini-window");
		const focus = () => setFocused(true);
		const blur = () => setFocused(false);
		const close = (event: KeyboardEvent) => {
			if (event.key !== "Escape") return;
			if (view === "launcher") window.desktop?.hideMini();
			else setView("launcher");
		};
		window.addEventListener("keydown", close);
		window.addEventListener("focus", focus);
		window.addEventListener("blur", blur);
		return () => {
			document.documentElement.classList.remove("finn-mini-window");
			window.removeEventListener("keydown", close);
			window.removeEventListener("focus", focus);
			window.removeEventListener("blur", blur);
		};
	}, [view]);
	useEffect(() => {
		if (view === "new" || view === "chat") input.current?.focus();
	}, [view]);
	useEffect(() => {
		if (focused && view === "chat" && active) finn.markRead(active.id);
	}, [focused, view, active, finn.markRead]);
	useEffect(() => {
		if (transcript.current) transcript.current.scrollTop = transcript.current.scrollHeight;
	}, [turns.length, finn.status, view]);

	function newChat() {
		finn.newChat();
		setDrafts((current) => ({ ...current, new: "" }));
		setView("new");
	}
	function openChat(id: string) {
		finn.selectConversation(id);
		setView("chat");
	}
	function conversationRow(conversation: (typeof finn.conversations)[number]) {
		return (
			<button
				type="button"
				key={conversation.id}
				className="finn-mini-conversation"
				onClick={() => openChat(conversation.id)}
			>
				<span>
					<strong>{conversation.title}</strong>
					<small>{statusText(conversation)}</small>
				</span>
				{conversation.unread ? (
					<span className="finn-mini-unread" aria-label="Unread answer" />
				) : (
					<Icon name="chevron-right" size={16} />
				)}
			</button>
		);
	}

	return (
		<main className="finn-mini" aria-label="Chat with Finn">
			<div className="finn-mini-content">
				{view === "launcher" && notifications.length > 0 && (
					<section
						data-mini-surface
						className="mini-result finn-mini-notifications"
						aria-label="Recent activity"
					>
						{notifications.map(conversationRow)}
					</section>
				)}
				{view === "list" && (
					<section
						data-mini-surface
						className="mini-result finn-mini-history"
						aria-label="Conversations"
					>
						<header className="finn-mini-heading">
							<h1>Conversations</h1>
							<small>This app session</small>
						</header>
						{finn.conversations.length ? (
							finn.conversations.map(conversationRow)
						) : (
							<p className="mini-result-status">
								No conversations yet. Start a new chat with Finn.
							</p>
						)}
					</section>
				)}
				{view === "chat" && active && (
					<section
						data-mini-surface
						className="mini-result finn-mini-thread"
						aria-label="Current conversation"
					>
						<header className="finn-mini-heading">
							<h1 title={active.title}>{active.title}</h1>
							<small>
								{turns.length} {turns.length === 1 ? "question" : "questions"}
							</small>
						</header>
						<div className="finn-mini-transcript" ref={transcript}>
							{turns.map((turn) => (
								<article key={turn.id} className="finn-mini-turn">
									<p className="finn-mini-question">{turn.question}</p>
									<Answer turn={turn} />
								</article>
							))}
						</div>
					</section>
				)}
				{(view === "new" || view === "chat") && (
					<>
						{view === "new" && (
							<p data-mini-surface className="finn-mini-new-label">
								New chat
							</p>
						)}
						<form
							data-mini-surface
							className="finn-mini-composer"
							aria-busy={busy && view === "chat"}
							onSubmit={(event) => {
								event.preventDefault();
								if (!question.trim() || (busy && view === "chat")) return;
								const submitted = finn.submitQuestion(
									question,
									view === "new" ? null : (active?.id ?? null),
								);
								if (!submitted) return;
								setDrafts((current) => ({ ...current, [draftKey]: "" }));
								setView("chat");
							}}
						>
							<input
								ref={input}
								id="mini-question"
								aria-label={view === "new" ? "Start a new chat" : "Reply to this chat"}
								placeholder={view === "new" ? "Start a new chat…" : "Reply to this chat…"}
								value={question}
								onChange={(event) =>
									setDrafts((current) => ({ ...current, [draftKey]: event.target.value }))
								}
								autoComplete="off"
							/>
							<button
								type="submit"
								className="finn-mini-send"
								aria-label="Send question"
								disabled={!question.trim() || (busy && view === "chat")}
							>
								<Icon name="arrow-right" size={18} />
							</button>
						</form>
					</>
				)}
			</div>
			<div className="finn-mini-pet-slot" aria-hidden="true">
				{!window.desktop && <img src="/pet/idle.png" alt="" />}
			</div>
			<div data-mini-surface className="finn-mini-toolbar" aria-label="Finn controls">
				<button type="button" onClick={newChat} title="Start a new chat">
					<Icon name="file-text" size={18} />
					<span>New chat</span>
				</button>
				<button
					type="button"
					className="finn-mini-bell"
					onClick={() => setView(view === "list" ? "launcher" : "list")}
					aria-label={`Conversations, ${finn.unreadCount} unread`}
					aria-expanded={view === "list"}
				>
					<Icon name="bell" size={18} />
					{finn.unreadCount > 0 && <span className="finn-mini-count">{finn.unreadCount}</span>}
				</button>
				<button
					type="button"
					aria-label={view === "launcher" ? "Hide Finn controls" : "Collapse conversation"}
					onClick={() => (view === "launcher" ? window.desktop?.hideMini() : setView("launcher"))}
				>
					<Icon name="chevron-right" size={18} />
				</button>
			</div>
			<span data-mini-surface className="finn-mini-disclaimer">
				Demo · this app session
			</span>
		</main>
	);
}
