interface ImportMeta {
	readonly env: { readonly VITE_AUTH_MODE: string; readonly VITE_CLERK_PUBLISHABLE_KEY?: string };
}
declare module "*.css";
// Present only inside the Electron app; see apps/desktop/preload.cjs.
interface Window {
	readonly desktop?: {
		openResult?(resultId: string): Promise<void>;
		toggleMini(): void;
		hideMini(): void;
		openMain(route: string): void;
		movePet(dx: number, dy: number): void;
		/** Subscribes to the main window closing so Finn can say goodbye; returns an unsubscribe. */
		onMainClosing?(listener: () => void): () => void;
		closeMain?(): void;
		onFinnLanded?(listener: () => void): () => void;
		onPose?(listener: (pose: string | null) => void): () => void;
	};
}
