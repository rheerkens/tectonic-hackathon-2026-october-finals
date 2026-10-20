import { tanstackRouter } from "@tanstack/router-plugin/vite";
import react from "@vitejs/plugin-react";
import { defineConfig, type Plugin } from "vite";
import { readWebConfig } from "./src/config.ts";

const config = readWebConfig(process.env);
// The dev server listens on every interface for Tailscale previews, and dev auth trusts a header.
// Only this machine and the tailnet (100.64.0.0/10, fd7a:115c:a1e0::/48) may reach it, not the venue Wi-Fi.
const trusted = (address = "") => {
	const ip = address.replace(/^::ffff:/, "");
	if (ip === "127.0.0.1" || ip === "::1" || ip.startsWith("fd7a:115c:a1e0:")) return true;
	const [a, b] = ip.split(".").map(Number);
	return a === 100 && b !== undefined && b >= 64 && b <= 127;
};
const tailnetOnly: Plugin = {
	name: "tailnet-only",
	configureServer(server) {
		server.middlewares.use((req, res, next) => {
			if (trusted(req.socket.remoteAddress)) return next();
			res.statusCode = 403;
			res.end("Forbidden");
		});
		server.httpServer?.on("upgrade", (req, socket) => {
			if (!trusted(req.socket.remoteAddress)) socket.destroy();
		});
	},
};
export default defineConfig({
	plugins: [tailnetOnly, tanstackRouter({ target: "react", autoCodeSplitting: true }), react()],
	define: { "import.meta.env.VITE_AUTH_MODE": JSON.stringify(config.mode) },
	server: {
		strictPort: true,
		allowedHosts: [".ts.net"],
		proxy: {
			// ws: live updates upgrade at /api/realtime through the same proxy.
			"/api": {
				target: `http://127.0.0.1:${process.env.API_PORT || 3001}`,
				changeOrigin: true,
				ws: true,
			},
		},
	},
	build: { target: "esnext" },
});
