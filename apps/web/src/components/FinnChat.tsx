import { Link } from "@tanstack/react-router";
import {
	type CSSProperties,
	type ReactNode,
	type RefObject,
	useEffect,
	useRef,
	useState,
} from "react";
import { type FinnConversation, type FinnTurn, useFinn } from "../state/finn";
import { useVoice } from "../state/finn-voice";
import { usePetScale } from "../state/pet-scale";
import { FinnCall } from "./FinnCall";
import { Icon } from "./Icon";

/** Draft key for a chat that has not been sent yet. */
const NEW = "new";
type View = "launcher" | "new" | "chat";
type Voice = ReturnType<typeof useVoice>;

const working = (turn?: FinnTurn) => turn?.status === "thinking" || turn?.status === "searching";
const plain = (text: string) => text.replace(/\*\*/g, "").replace(/\s*\[S\d+\]/g, "");

function preview(conversation: FinnConversation) {
	const turn = conversation.turns.at(-1);
	if (turn?.status === "thinking") return "Thinking…";
	if (turn?.status === "searching") return "Checking sources…";
	if (turn?.message) return turn.message;
	if (turn?.status === "waiting" && turn.result?.nextStep.kind === "contact_person")
		return `Waiting for ${turn.result.nextStep.person} · call to confirm`;
	return turn?.result?.answer ? plain(turn.result.answer) : "I'm not sure yet.";
}

function StatusMark({ turn }: { turn?: FinnTurn | undefined }) {
	if (working(turn)) return <span className="finn-mark finn-mark-busy" aria-label="Working" />;
	if (turn?.status === "waiting")
		return (
			<span className="finn-mark finn-mark-waiting" aria-label="Waiting for a reply">
				<Icon name="clock" size={12} />
			</span>
		);
	if (turn?.message) return <span className="finn-mark finn-mark-failed" aria-label="No answer" />;
	return (
		<span className="finn-mark finn-mark-done" aria-label="Answered">
			<Icon name="check" size={11} />
		</span>
	);
}

// Two glyphs the shared Lucide sprite lacks (square-pen, audio-lines).
function Glyph({ name }: { name: "pen" | "voice" }) {
	return (
		<svg
			width="19"
			height="19"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth="1.8"
			strokeLinecap="round"
			strokeLinejoin="round"
			aria-hidden="true"
		>
			{name === "pen" ? (
				<>
					<path d="M12 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
					<path d="M18.375 2.625a1 1 0 0 1 3 3l-9.013 9.014a2 2 0 0 1-.853.505l-2.873.84a.5.5 0 0 1-.62-.62l.84-2.873a2 2 0 0 1 .506-.852z" />
				</>
			) : (
				<path d="M2 10v3M6 6v11M10 3v18M14 8v7M18 5v13M22 10v3" />
			)}
		</svg>
	);
}

function Answer({
	turn,
	inApp,
	onNavigate,
}: {
	turn: FinnTurn;
	inApp: boolean;
	onNavigate?: (() => void) | undefined;
}) {
	const [opening, setOpening] = useState(false);
	const [error, setError] = useState("");
	const result = turn.status === "done" || turn.status === "waiting" ? turn.result : null;
	if (!result) {
		return (
			<div className="mini-result-status" role="status">
				<p>{turn.message || (turn.status === "searching" ? "Checking sources…" : "Thinking…")}</p>
				{turn.message && <p>Try asking about payroll changes or sick leave.</p>}
			</div>
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
					? plain(result.answer)
					: "I'm not sure yet. I don't have enough confirmed information to answer."}
			</p>
			{result.nextStep.kind === "contact_person" && (
				<>
					<p className="mini-result-waiting">Waiting for {result.nextStep.person}.</p>
					<FinnCall result={result} compact />
				</>
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
				{window.desktop && !inApp ? (
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
						onClick={onNavigate}
					>
						{openLabel}
					</Link>
				)}
				{error && <p role="alert">{error}</p>}
			</details>
		</>
	);
}

function VoiceStatus({ voice }: { voice: Voice }) {
	const seconds = `0:${String(voice.seconds).padStart(2, "0")}`;
	const text = {
		idle: "",
		starting: "Waiting for the microphone…",
		recording: `Listening · ${voice.seconds >= 60 ? "1:00" : seconds} of 1:00`,
		processing: "Transcribing on this device…",
		error: voice.error,
	}[voice.status];
	return (
		<p
			className={voice.status === "error" ? "finn-voice-status is-error" : "finn-voice-status"}
			role={voice.status === "error" ? "alert" : "status"}
		>
			{voice.status === "recording" && <span className="finn-voice-dot" aria-hidden="true" />}
			<span>{text}</span>
			<button type="button" onClick={voice.cancel}>
				{voice.status === "error" ? "Dismiss" : "Cancel"}
			</button>
		</p>
	);
}

function Composer({
	draftKey,
	target,
	label,
	placeholder,
	blocked,
	voice,
	onMore,
	onSent,
	inputRef,
}: {
	draftKey: string;
	/** Explicit conversation to reply to; null always starts a new chat. */
	target: string | null;
	label: string;
	placeholder: string;
	blocked: boolean;
	voice: Voice;
	onMore?: () => void;
	onSent: () => void;
	inputRef: RefObject<HTMLTextAreaElement | null>;
}) {
	const finn = useFinn(true);
	const text = finn.drafts[draftKey] ?? "";
	const mine = voice.key === draftKey && voice.status !== "idle";
	const capturing = mine && (voice.status === "starting" || voice.status === "recording");
	const voiceBusy = voice.status !== "idle" && voice.status !== "error";
	// Sending waits for this draft's recording or transcript, so it cannot land in the next draft.
	const held = blocked || (mine && voiceBusy);
	return (
		<>
			<form
				className="finn-mini-composer"
				aria-busy={held}
				onSubmit={(event) => {
					event.preventDefault();
					if (!text.trim() || held) return;
					if (!finn.submitQuestion(text, target)) return;
					if (voice.key === draftKey) voice.cancel();
					finn.setDraft(draftKey, "");
					onSent();
				}}
			>
				{onMore && (
					<button
						type="button"
						className="finn-composer-more"
						aria-label="Show Finn controls and conversations"
						onClick={onMore}
					>
						<Icon name="x" size={18} />
					</button>
				)}
				<textarea
					ref={inputRef}
					rows={1}
					aria-label={label}
					placeholder={placeholder}
					value={text}
					onChange={(event) => finn.setDraft(draftKey, event.target.value)}
					onKeyDown={(event) => {
						// Enter sends like the old single-line field; Shift+Enter adds a line.
						if (event.key !== "Enter" || event.shiftKey || event.nativeEvent.isComposing) return;
						event.preventDefault();
						event.currentTarget.form?.requestSubmit();
					}}
					autoComplete="off"
				/>
				{voice.available &&
					(capturing ? (
						<button
							type="button"
							className="finn-composer-voice is-recording"
							aria-label="Stop recording and transcribe"
							disabled={voice.status === "starting"}
							onClick={voice.stop}
						>
							<span className="finn-stop" aria-hidden="true" />
						</button>
					) : (
						<button
							type="button"
							className="finn-composer-voice"
							aria-label="Speak instead of typing"
							disabled={voiceBusy}
							onClick={() => void voice.start(draftKey)}
						>
							<Glyph name="voice" />
						</button>
					))}
				<button
					type="submit"
					className="finn-mini-send"
					aria-label="Send question"
					disabled={held || !text.trim()}
				>
					<Icon name="arrow-right" size={18} />
				</button>
			</form>
			{mine && <VoiceStatus voice={voice} />}
		</>
	);
}

/**
 * Finn's compact chat, shared by the desktop mini window and the dock inside SDtrust:
 * Finn, a small toolbar, then activity rows, a new chat or one expanded conversation below.
 */
export function FinnChat({
	pet,
	open = true,
	inApp = false,
	className = "",
	onHide,
}: {
	pet: ReactNode;
	/** The dock keeps this mounted while closed so the view survives; the mini window is always open. */
	open?: boolean;
	// Inside SDtrust, results open in place instead of asking the shell for the main window.
	inApp?: boolean;
	className?: string;
	onHide?: () => void;
}) {
	const finn = useFinn(true);
	const scale = usePetScale();
	const root = useRef<HTMLElement>(null);
	const overSurface = useRef(false);
	const input = useRef<HTMLTextAreaElement>(null);
	const transcript = useRef<HTMLDivElement>(null);
	// Presentation is local to each surface; another window's selection never retargets it.
	const [view, setView] = useState<View>("launcher");
	const [rowsOpen, setRowsOpen] = useState(true);
	const [chatId, setChatId] = useState<string | null>(null);
	const [focused, setFocused] = useState(document.hasFocus());
	const [visible, setVisible] = useState(document.visibilityState === "visible");
	const voice = useVoice(finn.appendDraft);
	const chat = view === "chat" ? finn.conversations.find((item) => item.id === chatId) : undefined;
	const shownView: View = view === "chat" && !chat ? "launcher" : view;
	const visibleKey = !open ? null : shownView === "new" ? NEW : (chat?.id ?? null);
	const showRows = shownView === "launcher" && rowsOpen && finn.conversations.length > 0;
	const turns = chat?.turns ?? [];
	const engaged =
		Boolean(chat || (visibleKey && finn.drafts[visibleKey]?.trim())) ||
		(voice.status !== "idle" && voice.status !== "error");
	useEffect(() => {
		if (!inApp) window.desktop?.setMiniEngaged?.(engaged);
	}, [engaged, inApp]);
	useEffect(() => {
		const reset = () => {
			setView("launcher");
			setRowsOpen(false);
			setChatId(null);
			// The shell hid the window under the pointer; the next show starts click-through again.
			overSurface.current = false;
		};
		if (!open) reset();
		return window.desktop?.onMiniReset?.(reset);
	}, [open]);

	useEffect(() => {
		const focus = () => setFocused(true);
		const blur = () => setFocused(false);
		const visibility = () => setVisible(document.visibilityState === "visible");
		window.addEventListener("focus", focus);
		window.addEventListener("blur", blur);
		document.addEventListener("visibilitychange", visibility);
		return () => {
			window.removeEventListener("focus", focus);
			window.removeEventListener("blur", blur);
			document.removeEventListener("visibilitychange", visibility);
		};
	}, []);
	// Voice only runs for the composer on screen, in a focused, visible window: leaving it cancels
	// the recording or transcript, so no text is appended out of sight.
	useEffect(() => {
		const active = voice.status !== "idle" && voice.status !== "error";
		if (active && (voice.key !== visibleKey || !focused || !visible)) voice.cancel();
	}, [voice.status, voice.key, voice.cancel, visibleKey, focused, visible]);
	// An answer is read once its conversation is expanded in a focused, visible window.
	useEffect(() => {
		if (open && chat && focused && visible) finn.markRead(chat.id);
	}, [open, chat, focused, visible, finn.markRead]);
	useEffect(() => {
		if (open && (shownView === "new" || shownView === "chat")) input.current?.focus();
	}, [open, shownView]);
	useEffect(() => {
		if (transcript.current) transcript.current.scrollTop = transcript.current.scrollHeight;
	}, [turns.length, turns.at(-1)?.revision, chat?.id]);
	useEffect(() => {
		if (!open) return;
		const escape = (event: KeyboardEvent) => {
			const target = event.target as Node;
			if (event.key !== "Escape" || (target !== document.body && !root.current?.contains(target)))
				return;
			if (shownView === "launcher") onHide?.();
			else setView("launcher");
		};
		window.addEventListener("keydown", escape);
		return () => window.removeEventListener("keydown", escape);
	}, [open, shownView, onHide]);

	function openChat(id: string) {
		finn.selectConversation(id);
		setChatId(id);
		setView("chat");
	}
	function speak() {
		if (voice.status === "recording") return voice.stop();
		const key = shownView === "chat" && chat ? chat.id : NEW;
		if (key === NEW) setView("new");
		void voice.start(key);
	}

	const third = !finn.conversations.length ? null : showRows || shownView === "chat" ? (
		<button
			type="button"
			className="finn-collapse"
			aria-label="Hide conversations"
			onClick={() => {
				setView("launcher");
				setRowsOpen(false);
			}}
		>
			<Icon name="chevron-right" size={19} />
		</button>
	) : (
		<button
			type="button"
			className="finn-mini-bell"
			aria-label={`Conversations, ${finn.unreadCount} unread`}
			onClick={() => {
				setView("launcher");
				setRowsOpen(true);
			}}
		>
			<Icon name="bell" size={19} />
			{finn.unreadCount > 0 && <span className="finn-mini-count">{finn.unreadCount}</span>}
		</button>
	);

	return (
		<section
			ref={root}
			className={`finn-mini ${className}`}
			style={{ "--finn-scale": scale / 100 } as CSSProperties}
			aria-label="Chat with Finn"
			// Only the pills count as hover: on macOS the window spans the transparent gaps too.
			onMouseMove={(event) => {
				if (inApp) return;
				const inside = Boolean((event.target as Element).closest("[data-mini-surface]"));
				if (inside === overSurface.current) return;
				overSurface.current = inside;
				window.desktop?.setMiniHover?.(inside);
			}}
			onPointerLeave={() => {
				if (inApp) return;
				overSurface.current = false;
				window.desktop?.setMiniHover?.(false);
			}}
		>
			<div className="finn-mini-head">
				<div className="finn-mini-pet-slot">{pet}</div>
				{open && shownView !== "new" && (
					<div data-mini-surface className="finn-mini-toolbar" role="toolbar" aria-label="Finn">
						<button type="button" aria-label="New chat" onClick={() => setView("new")}>
							<Glyph name="pen" />
						</button>
						{voice.available && (
							<button
								type="button"
								className={voice.status === "recording" ? "is-recording" : undefined}
								aria-label={voice.status === "recording" ? "Stop recording" : "Ask by voice"}
								disabled={voice.status === "starting" || voice.status === "processing"}
								onClick={speak}
							>
								<Glyph name="voice" />
							</button>
						)}
						{third}
					</div>
				)}
			</div>
			{open && (showRows || shownView !== "launcher") && (
				<div data-mini-surface className="finn-mini-content">
					{showRows && (
						<ul className="finn-rows" aria-label="Conversations">
							{finn.conversations.map((conversation) => (
								<li key={conversation.id}>
									<button
										type="button"
										className="finn-row"
										onClick={() => openChat(conversation.id)}
									>
										<strong>
											<StatusMark turn={conversation.turns.at(-1)} />
											<span>{conversation.title}</span>
										</strong>
										<small>{preview(conversation)}</small>
										{conversation.unread && (
											<span className="finn-mini-unread" aria-label="Unread answer" />
										)}
									</button>
									<button
										type="button"
										className="finn-row-dismiss"
										aria-label={`Hide conversation: ${conversation.title}`}
										title="Hide from notifications"
										onClick={() => finn.hideConversation(conversation.id)}
									>
										<Icon name="x" size={15} />
									</button>
								</li>
							))}
						</ul>
					)}
					{shownView === "new" && (
						<Composer
							draftKey={NEW}
							target={null}
							label="Start a new chat"
							placeholder="Start a new chat"
							blocked={false}
							voice={voice}
							inputRef={input}
							onMore={() => {
								setView("launcher");
								setRowsOpen(true);
							}}
							onSent={() => {
								setView("launcher");
								setRowsOpen(true);
							}}
						/>
					)}
					{chat && (
						<section className="finn-card" aria-label={chat.title}>
							<button
								type="button"
								className="finn-card-close"
								aria-label="Back to conversations"
								onClick={() => {
									setView("launcher");
									setRowsOpen(true);
								}}
							>
								<Icon name="x" size={13} />
							</button>
							<header className="finn-card-title">
								<StatusMark turn={turns.at(-1)} />
								<h2 title={chat.title}>{chat.title}</h2>
							</header>
							<div className="finn-mini-transcript" ref={transcript}>
								{turns.map((turn) => (
									<article key={turn.id} className="finn-mini-turn">
										<p className="finn-mini-question">{turn.question}</p>
										<Answer turn={turn} inApp={inApp} onNavigate={onHide} />
									</article>
								))}
							</div>
							<Composer
								key={chat.id}
								draftKey={chat.id}
								target={chat.id}
								label="Ask Finn a follow-up"
								placeholder="Follow-up"
								blocked={working(turns.at(-1))}
								voice={voice}
								inputRef={input}
								onSent={() => {}}
							/>
						</section>
					)}
				</div>
			)}
		</section>
	);
}
