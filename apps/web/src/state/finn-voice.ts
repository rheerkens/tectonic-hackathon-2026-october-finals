import { useCallback, useEffect, useRef, useState } from "react";

/** Local voice input: the desktop shell transcribes with whisper.cpp; nothing leaves the machine. */
type VoiceStatus = "idle" | "starting" | "recording" | "processing" | "error";
const MAX_SECONDS = 60;
const RATE = 16000;

// whisper.cpp reads 16 kHz mono 16-bit PCM WAV.
async function toWav(blob: Blob) {
	const context = new AudioContext();
	let decoded: AudioBuffer;
	try {
		decoded = await context.decodeAudioData(await blob.arrayBuffer());
	} finally {
		void context.close();
	}
	const length = Math.min(Math.ceil(decoded.duration * RATE), RATE * MAX_SECONDS);
	if (!length) throw new Error("The recording was empty. Try again.");
	const offline = new OfflineAudioContext(1, length, RATE);
	const source = offline.createBufferSource();
	source.buffer = decoded;
	source.connect(offline.destination);
	source.start();
	const samples = (await offline.startRendering()).getChannelData(0);
	const view = new DataView(new ArrayBuffer(44 + samples.length * 2));
	const text = (offset: number, value: string) => {
		for (const [index, char] of [...value].entries())
			view.setUint8(offset + index, char.charCodeAt(0));
	};
	text(0, "RIFF");
	view.setUint32(4, 36 + samples.length * 2, true);
	text(8, "WAVEfmt ");
	view.setUint32(16, 16, true);
	view.setUint16(20, 1, true);
	view.setUint16(22, 1, true);
	view.setUint32(24, RATE, true);
	view.setUint32(28, RATE * 2, true);
	view.setUint16(32, 2, true);
	view.setUint16(34, 16, true);
	text(36, "data");
	view.setUint32(40, samples.length * 2, true);
	for (const [index, sample] of samples.entries()) {
		const clamped = Math.max(-1, Math.min(1, sample));
		view.setInt16(44 + index * 2, clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff, true);
	}
	return new Uint8Array(view.buffer);
}

function explain(error: unknown) {
	const name = error instanceof DOMException ? error.name : "";
	if (name === "NotAllowedError" || name === "SecurityError")
		return "Microphone access is blocked. Allow it in Windows Settings › Privacy › Microphone.";
	if (name === "NotFoundError" || name === "OverconstrainedError") return "No microphone found.";
	if (name === "NotReadableError") return "The microphone is in use by another app.";
	// Electron prefixes errors from the shell with the IPC channel; keep only the message.
	const message = error instanceof Error ? error.message : "";
	return message.split("Error: ").at(-1) || "Voice input failed. Try again.";
}

/**
 * Records one short clip and hands the transcript to `onText` for the draft it started on.
 * Never sends anything to Finn; the user edits and sends the draft.
 */
export function useVoice(onText: (key: string, text: string) => void) {
	const available = Boolean(window.desktop?.transcribeSpeech && navigator.mediaDevices);
	const [status, setStatus] = useState<VoiceStatus>("idle");
	const [error, setError] = useState("");
	const [key, setKey] = useState<string | null>(null);
	const [seconds, setSeconds] = useState(0);
	// Every start or cancel bumps the token, so late permission grants and transcripts are ignored.
	const token = useRef(0);
	const recorder = useRef<MediaRecorder | null>(null);
	const stream = useRef<MediaStream | null>(null);
	const processing = useRef(false);
	const latestOnText = useRef(onText);
	latestOnText.current = onText;

	const release = useCallback(() => {
		for (const track of stream.current?.getTracks() ?? []) track.stop();
		stream.current = null;
	}, []);

	const cancel = useCallback(() => {
		token.current++;
		if (recorder.current && recorder.current.state !== "inactive") recorder.current.stop();
		recorder.current = null;
		release();
		// Frees the shell's single transcription slot instead of letting it run on unseen.
		if (processing.current) window.desktop?.cancelSpeech?.();
		processing.current = false;
		setStatus("idle");
		setError("");
		setKey(null);
	}, [release]);

	const stop = useCallback(() => {
		if (recorder.current?.state === "recording") recorder.current.stop();
	}, []);

	const start = useCallback(
		async (draftKey: string) => {
			if (!available) return;
			const mine = ++token.current;
			setKey(draftKey);
			setError("");
			setSeconds(0);
			setStatus("starting");
			const fail = (reason: unknown) => {
				if (token.current !== mine) return;
				release();
				recorder.current = null;
				processing.current = false;
				setError(explain(reason));
				setStatus("error");
			};
			let media: MediaStream;
			try {
				media = await navigator.mediaDevices.getUserMedia({ audio: true });
			} catch (reason) {
				return fail(reason);
			}
			if (token.current !== mine) {
				for (const track of media.getTracks()) track.stop();
				return;
			}
			stream.current = media;
			const chunks: Blob[] = [];
			let capture: MediaRecorder;
			try {
				capture = new MediaRecorder(media);
			} catch (reason) {
				// fail() also releases the stream acquired above.
				return fail(reason);
			}
			recorder.current = capture;
			capture.ondataavailable = (event) => chunks.push(event.data);
			capture.onerror = () => {
				fail(new Error("Recording failed. Try again."));
				// The recorder stops after an error; its onstop must not transcribe a broken clip.
				if (token.current === mine) token.current++;
			};
			capture.onstop = async () => {
				// Capture ends before the CPU work starts. Only this clip's microphone: after a quick
				// cancel and restart, stream.current already holds the next recording.
				for (const track of media.getTracks()) track.stop();
				if (stream.current === media) stream.current = null;
				if (token.current !== mine) return;
				recorder.current = null;
				setStatus("processing");
				processing.current = true;
				try {
					const wav = await toWav(new Blob(chunks, { type: capture.mimeType }));
					if (token.current !== mine) return;
					const text = (await window.desktop?.transcribeSpeech?.(wav))?.trim() ?? "";
					if (token.current !== mine) return;
					if (!text) throw new Error("Finn didn't catch that. Try again.");
					latestOnText.current(draftKey, text);
					processing.current = false;
					token.current++;
					setStatus("idle");
					setKey(null);
				} catch (reason) {
					fail(reason);
				}
			};
			try {
				capture.start();
			} catch (reason) {
				return fail(reason);
			}
			setStatus("recording");
		},
		[available, release],
	);

	useEffect(() => {
		if (status !== "recording") return;
		const timer = window.setInterval(() => setSeconds((value) => value + 1), 1000);
		return () => window.clearInterval(timer);
	}, [status]);
	useEffect(() => {
		if (seconds >= MAX_SECONDS) stop();
	}, [seconds, stop]);
	useEffect(() => cancel, [cancel]);

	return { available, status, error, key, seconds, start, stop, cancel };
}
