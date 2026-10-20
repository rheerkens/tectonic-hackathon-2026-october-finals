import { tanstackRouter } from "@tanstack/router-plugin/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { readWebConfig } from "./src/config.ts";

const config = readWebConfig(process.env);
export default defineConfig({
	plugins: [tanstackRouter({ target: "react", autoCodeSplitting: true }), react()],
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
