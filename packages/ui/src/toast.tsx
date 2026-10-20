// Ported from Tectonic apps/web/src/components/Toasts.tsx. Toasts confirm finished work; errors that
// need a decision or keep input stay inline beside the form that owns them.
import {
	createContext,
	type ReactNode,
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import { Button } from "./button";

export type ToastKind = "success" | "info" | "warning" | "error";
export type Toast = { id: number; kind: ToastKind; title: string; message?: string };
type ToastApi = { push: (toast: Omit<Toast, "id">) => void; dismiss: (id: number) => void };

const ToastContext = createContext<ToastApi | null>(null);
const VISIBLE = 4;

export function useToasts() {
	const api = useContext(ToastContext);
	if (!api) throw new Error("Toast provider is missing.");
	return api;
}

export function ToastProvider({ children }: { children: ReactNode }) {
	const [toasts, setToasts] = useState<Toast[]>([]);
	const nextId = useRef(1);
	const timers = useRef(new Map<number, ReturnType<typeof setTimeout>>());
	const dismiss = useCallback((id: number) => {
		clearTimeout(timers.current.get(id));
		timers.current.delete(id);
		setToasts((old) => old.filter((toast) => toast.id !== id));
	}, []);
	const push = useCallback(
		(toast: Omit<Toast, "id">) => {
			const id = nextId.current++;
			setToasts((old) => [...old.slice(1 - VISIBLE), { ...toast, id }]);
			timers.current.set(
				id,
				setTimeout(() => dismiss(id), toast.kind === "error" ? 8000 : 4000),
			);
		},
		[dismiss],
	);
	useEffect(() => {
		const pending = timers.current;
		return () => {
			for (const timer of pending.values()) clearTimeout(timer);
			pending.clear();
		};
	}, []);
	const api = useMemo(() => ({ push, dismiss }), [push, dismiss]);
	return (
		<ToastContext.Provider value={api}>
			{children}
			<section className="ui-toasts" aria-label="Notifications" aria-live="polite">
				{toasts.map((toast) => (
					<div key={toast.id} className={`ui-toast ui-toast-${toast.kind}`}>
						<div className="ui-toast-body">
							<strong>{toast.title}</strong>
							{toast.message && <span>{toast.message}</span>}
						</div>
						<Button
							variant="ghost"
							aria-label="Dismiss notification"
							onClick={() => dismiss(toast.id)}
						>
							×
						</Button>
					</div>
				))}
			</section>
		</ToastContext.Provider>
	);
}
