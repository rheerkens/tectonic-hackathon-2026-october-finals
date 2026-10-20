import { ToastProvider } from "@day-one/ui/toast";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Outlet } from "@tanstack/react-router";
import { useEffect, useMemo } from "react";
import { useSession } from "./auth/context";
import { SignIn } from "./auth/SignIn";
import { RealtimeProvider } from "./state/realtime";
export function App() {
	const session = useSession();
	// An identity change receives an empty cache, including private chat history.
	const queries = useMemo(
		() =>
			new QueryClient({
				defaultOptions: {
					queries: { retry: false, staleTime: 10000 },
					mutations: { retry: false },
				},
			}),
		[session.user?.id],
	);
	useEffect(() => () => queries.clear(), [queries]);
	return (
		<QueryClientProvider client={queries}>
			{session.user ? (
				// Toasts live inside the identity key so an account change drops the previous user's messages.
				<div key={session.user.id}>
					<ToastProvider>
						<RealtimeProvider>
							<Outlet />
						</RealtimeProvider>
					</ToastProvider>
				</div>
			) : (
				<SignIn />
			)}
		</QueryClientProvider>
	);
}
