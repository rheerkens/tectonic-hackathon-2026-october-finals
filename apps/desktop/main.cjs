// Electron shell: starts the API on a free local port and shows the web app it serves.
const { app, BrowserWindow, dialog } = require("electron");
const { spawn } = require("node:child_process");
const { createServer } = require("node:net");
const { join, resolve } = require("node:path");

function freePort() {
	return new Promise((done, fail) => {
		const server = createServer().listen(0, "127.0.0.1", () => {
			const { port } = server.address();
			server.close(() => done(port));
		});
		server.on("error", fail);
	});
}

let api;
async function startApi() {
	const port = await freePort();
	const root = app.isPackaged
		? join(process.resourcesPath, "app-root")
		: resolve(__dirname, "../..");
	// Unpacked runs use Bun from PATH with the source; packaged runs use the compiled API.
	const [command, ...args] = app.isPackaged
		? [join(process.resourcesPath, "bin", process.platform === "win32" ? "api.exe" : "api")]
		: ["bun", join(root, "apps/api/src/index.ts")];
	api = spawn(command, args, {
		env: {
			...process.env,
			NODE_ENV: "development",
			AUTH_MODE: "dev",
			SERVE_STATIC: "1",
			API_PORT: String(port),
			APP_ROOT: root,
			DATABASE_PATH: join(app.getPath("userData"), "app.sqlite"),
			DEV_LAUNCHER_PID: String(process.pid),
		},
		stdio: ["ignore", "pipe", "inherit"],
	});
	return new Promise((done, fail) => {
		api.on("exit", (code) => fail(new Error(`API exited with code ${code}`)));
		api.stdout.on("data", (chunk) => {
			process.stdout.write(chunk);
			if (chunk.includes('"api_ready"')) done(`http://127.0.0.1:${port}`);
		});
	});
}

app.whenReady().then(async () => {
	try {
		const url = await startApi();
		const window = new BrowserWindow({ width: 1280, height: 860 });
		window.loadURL(url);
	} catch (error) {
		dialog.showErrorBox("Day One could not start", String(error));
		app.quit();
	}
});
app.on("window-all-closed", () => app.quit());
app.on("quit", () => api?.kill());
