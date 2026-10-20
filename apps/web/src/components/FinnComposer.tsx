import type { RefObject } from "react";
import { useFinn } from "../state/finn";
import type { useVoice } from "../state/finn-voice";
import { Icon } from "./Icon";

type Voice = ReturnType<typeof useVoice>;

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

export function FinnComposer({
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
	onSent: (conversationId: string) => void;
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
					const sent = finn.submitQuestion(text, target);
					if (!sent) return;
					if (voice.key === draftKey) voice.cancel();
					finn.setDraft(draftKey, "");
					onSent(sent.conversationId);
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
							<Icon name="audio-lines" size={19} />
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
