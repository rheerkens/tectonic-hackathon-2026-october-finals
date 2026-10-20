import { useEffect, useRef, useState } from "react";
import type { FinnStatus } from "./finn";

/** Animations in public/pet, exported from docs/design/finn_pet. */
export type PetAnimation =
	| "idle"
	| "waving"
	| "waiting"
	| "running"
	| "running-left"
	| "running-right"
	| "jumping"
	| "failed"
	| "review";

// Every window of the desktop app shares one origin, so chats tell the pet their mood without IPC.
const channel = "day-one:pet";

export function petMood(chat: { busy: boolean; error: string; draft: string }): PetAnimation {
	if (chat.busy) return "running";
	if (chat.error) return "failed";
	return chat.draft.trim() ? "waiting" : "idle";
}

/** Announces chat mood changes. A send that settles without an error makes Finn jump. */
export function useAnnouncePetMood(chat: { busy: boolean; error: string; draft: string }) {
	const mood = petMood(chat);
	const previous = useRef<PetAnimation>("idle");
	useEffect(() => {
		announce(previous.current === "running" && mood === "idle" ? "jumping" : mood);
		previous.current = mood;
	}, [mood]);
	useEffect(() => () => announce("idle"), []);
}
const finnMoods: Record<FinnStatus, PetAnimation> = {
	idle: "idle",
	thinking: "review",
	searching: "running",
	done: "jumping",
	waiting: "waiting",
};

/** Finn follows the FINN flow. A question FINN cannot answer makes Finn fail until the next one. */
export function useAnnounceFinnMood(finn: { status: FinnStatus; message: string }) {
	const mood = finn.message ? "failed" : finnMoods[finn.status];
	const greeted = useRef(false);
	useEffect(() => {
		// Let the opening wave play instead of announcing the initial idle.
		if (greeted.current) announce(mood);
		greeted.current = true;
	}, [mood]);
}

function announce(mood: PetAnimation) {
	const sender = new BroadcastChannel(channel);
	sender.postMessage(mood);
	sender.close();
}

// Greetings and celebrations play for a moment, then Finn rests.
const brief: Partial<Record<PetAnimation, number>> = { waving: 1400, jumping: 1680 };

export function usePetMood() {
	const [mood, setMood] = useState<PetAnimation>("waving");
	useEffect(() => {
		const receiver = new BroadcastChannel(channel);
		receiver.onmessage = (event: MessageEvent<PetAnimation>) => setMood(event.data);
		return () => receiver.close();
	}, []);
	useEffect(() => {
		const duration = brief[mood];
		if (!duration) return;
		const timer = window.setTimeout(() => setMood("idle"), duration);
		return () => window.clearTimeout(timer);
	}, [mood]);
	return mood;
}
