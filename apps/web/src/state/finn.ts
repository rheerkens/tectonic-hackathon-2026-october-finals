import { useSyncExternalStore } from "react";
import { type FinnResult, finnScenarios } from "./finn-scenarios";

/** Mock FINN flow (issue #2). The scripted agent replaces `ask` later; the hook and state stay the same. */
export type FinnStatus = "idle" | "thinking" | "searching" | "done" | "waiting";

export type FinnState = {
	status: FinnStatus;
	question: string;
	/** While searching, how many of `result.steps` are visible. Show the answer only once done or waiting. */
	stepsShown: number;
	result: FinnResult | null;
	/** Set when the question matches no demo scenario. */
	message: string;
};

const idle: FinnState = { status: "idle", question: "", stepsShown: 0, result: null, message: "" };

// Every window shares one origin, so the window that asks plays the flow and broadcasts each state.
const channelName = "day-one:finn";
let state = idle;
let channel: BroadcastChannel | null = null;
let run = 0;
const listeners = new Set<() => void>();

function apply(next: FinnState) {
	state = next;
	for (const listener of listeners) listener();
}

function set(next: FinnState) {
	apply(next);
	channel?.postMessage(next);
}

function subscribe(listener: () => void) {
	if (!channel) {
		channel = new BroadcastChannel(channelName);
		channel.onmessage = (event: MessageEvent<FinnState | "sync">) => {
			if (event.data === "sync") {
				if (state.status !== "idle") channel?.postMessage(state);
				return;
			}
			// Another window started a question: stop playing ours.
			if (event.data.status === "thinking") run++;
			apply(event.data);
		};
		// A window that opens mid-flow asks the others for the current state.
		channel.postMessage("sync");
	}
	listeners.add(listener);
	return () => listeners.delete(listener);
}

// ponytail: keyword match on the demo questions, the scripted agent matches properly in phase 2.
function match(question: string) {
	const text = question.toLowerCase();
	if (/sick/.test(text)) return finnScenarios["d2-sick-leave"];
	if (/november|next month/.test(text)) return finnScenarios["d1-payroll-changes-november"];
	if (/payroll|submit/.test(text)) return finnScenarios["d1-payroll-changes"];
}

const wait = (ms: number) => new Promise((resolve) => window.setTimeout(resolve, ms));

async function ask(question: string) {
	const id = ++run;
	const result = match(question);
	set({ ...idle, status: "thinking", question });
	await wait(700);
	if (id !== run) return;
	if (!result) {
		set({ ...state, status: "done", message: "I can only answer the demo questions right now." });
		return;
	}
	for (let shown = 1; shown <= result.steps.length; shown++) {
		set({ ...state, status: "searching", result, stepsShown: shown });
		await wait(900);
		if (id !== run) return;
	}
	set({ ...state, status: result.nextStep.kind === "contact_person" ? "waiting" : "done" });
}

function reset() {
	run++;
	set(idle);
}

export function useFinn() {
	const current = useSyncExternalStore(subscribe, () => state);
	return { ...current, ask, reset };
}

/** For the result page: `/results/<id>` loads a fixture directly. */
export function getFinnResult(id: string): FinnResult | undefined {
	return finnScenarios[id];
}
