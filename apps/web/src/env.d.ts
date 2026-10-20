interface ImportMeta {
	readonly env: { readonly VITE_AUTH_MODE: string; readonly VITE_CLERK_PUBLISHABLE_KEY?: string };
}
declare module "*.css";
// Present only inside the Electron app; see apps/desktop/preload.cjs.
interface Window {
	readonly desktop?: {
		openResult?(resultId: string): Promise<void>;
		showMini?(): void;
		setMiniHover?(inside: boolean): void;
		setMiniEngaged?(engaged: boolean): void;
		onMiniReset?(listener: () => void): () => void;
		onMiniCompose?(listener: () => void): () => void;
		toggleMini(): void;
		hideMini(): void;
		movePet(dx: number, dy: number): void;
		/** Subscribes to the main window closing so Finn can say goodbye; returns an unsubscribe. */
		onMainClosing?(listener: () => void): () => void;
		closeMain?(): void;
		/** Transcribes a 16 kHz mono WAV clip with the local Whisper engine. */
		transcribeSpeech?(wav: Uint8Array): Promise<string>;
		cancelSpeech?(): void;
		/** Finn's size in whole percent, 75 to 150 in steps of 5. */
		getPetScale?(): Promise<number>;
		setPetScale?(scale: number): Promise<void>;
		onPetScale?(listener: (scale: number) => void): () => void;
		onFinnLanded?(listener: () => void): () => void;
		onPose?(listener: (pose: string | null) => void): () => void;
		/** The shell saw a new Teams message that Finn should correct unasked. */
		onHeadsUp?(listener: () => void): () => void;
	};
}
