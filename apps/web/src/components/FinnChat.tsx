import { type CSSProperties, type ReactNode, useEffect, useRef, useState } from "react";
import { type FinnConversation, type FinnTurn, useFinn } from "../state/finn";
import { useVoice } from "../state/finn-voice";
import { usePetScale } from "../state/pet-scale";
import { FinnAnswer, plain } from "./FinnAnswer";
import { FinnComposer } from "./FinnComposer";
import { Icon } from "./Icon";

/** Draft key for a chat that has not been sent yet. */
const NEW = "new";
type View = "launcher" | "new" | "chat";

const working = (turn?: FinnTurn) => turn?.status === "thinking" || turn?.status === "searching";

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

/**
 * Finn's compact chat, shared by the desktop mini window and the dock inside SDtrust:
 * Finn, a small toolbar, then activity rows, a new chat or one expanded conversation below.
 */
export function FinnChat({
	pet,
	open = true,
	inApp = false,
	className = "",
	composeKey = 0,
	onHide,
}: {
	pet: ReactNode;
	/** The dock keeps this mounted while closed so the view survives; the mini window is always open. */
	open?: boolean;
	// Inside SDtrust, results open in place instead of asking the shell for the main window.
	inApp?: boolean;
	className?: string;
	/** Bumped when Finn is clicked open: a click lands in the new-chat field, a hover only shows the toolbar. */
	composeKey?: number;
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
		if (composeKey) setView("new");
	}, [composeKey]);
	useEffect(() => window.desktop?.onMiniCompose?.(() => setView("new")), []);

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

	// Only the active surface gets this from the shell, so the correction is posted once.
	useEffect(
		() =>
			window.desktop?.onHeadsUp?.(() => {
				const id = finn.headsUp();
				if (!id) return;
				setChatId(id);
				setView("chat");
			}),
		[finn.headsUp],
	);

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
							<Icon name="square-pen" size={19} />
						</button>
						{voice.available && (
							<button
								type="button"
								className={voice.status === "recording" ? "is-recording" : undefined}
								aria-label={voice.status === "recording" ? "Stop recording" : "Ask by voice"}
								disabled={voice.status === "starting" || voice.status === "processing"}
								onClick={speak}
							>
								<Icon name="audio-lines" size={19} />
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
											{conversation.unread && (
												<span className="finn-mini-unread" aria-label="Unread answer" />
											)}
										</strong>
										<small>{preview(conversation)}</small>
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
						<FinnComposer
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
							onSent={openChat}
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
										<FinnAnswer turn={turn} inApp={inApp} onNavigate={onHide} />
									</article>
								))}
							</div>
							<FinnComposer
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
