// Electron shell: starts the API on a free local port and shows the web app it serves,
// plus Finn, a desktop pet that opens a floating mini chat. The main window opens on demand.
const { app, BrowserWindow, dialog, ipcMain, Menu, MenuItem, screen } = require("electron");
const { spawn } = require("node:child_process");
const { readFileSync, writeFileSync } = require("node:fs");
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

const webPreferences = { preload: join(__dirname, "preload.cjs") };
const settingsPath = () => join(app.getPath("userData"), "desktop.json");
let settings = { showPet: true, petPosition: null };
function saveSettings() {
	if (petOpen()) settings.petPosition = pet.getPosition();
	writeFileSync(settingsPath(), JSON.stringify(settings));
}

let appUrl;
let main;
let pet;
let mini;
let quitting = false;
const petOpen = () => pet && !pet.isDestroyed();
function openPet(url) {
	const { workArea } = screen.getPrimaryDisplay();
	const [x, y] = settings.petPosition ?? [
		workArea.x + workArea.width - 136,
		workArea.y + workArea.height - 144,
	];
	pet = new BrowserWindow({
		x,
		y,
		// Half the 192 × 208 sprite cell keeps Finn small but sharp on retina screens.
		width: 96,
		height: 104,
		transparent: true,
		frame: false,
		resizable: false,
		hasShadow: false,
		alwaysOnTop: true,
		skipTaskbar: true,
		webPreferences,
	});
	pet.loadURL(`${url}/pet`);
	// The pet window has no menu bar on Windows, so right-clicking Finn offers the essentials.
	pet.webContents.on("context-menu", () =>
		Menu.buildFromTemplate([...finnActions, { type: "separator" }, { role: "quit" }]).popup({
			window: pet,
		}),
	);
}

function openMain(url) {
	main = new BrowserWindow({ width: 1280, height: 860, show: false, webPreferences });
	main.loadURL(url);
	// Closing only hides the window; quit from the Finn menu.
	main.on("close", (event) => {
		if (quitting) return;
		event.preventDefault();
		main.hide();
	});
}

/** Shows the main window, on `route` when given. */
function showMain(route) {
	if (route) {
		const target = new URL(route, appUrl);
		if (target.origin !== new URL(appUrl).origin) return;
		if (main.webContents.getURL() !== target.href) main.loadURL(target.href);
	}
	main.show();
	main.focus();
}

function openMini(url) {
	mini = new BrowserWindow({
		width: 420,
		height: 600,
		show: false,
		frame: false,
		alwaysOnTop: true,
		skipTaskbar: true,
		webPreferences,
	});
	mini.loadURL(`${url}/mini`);
	mini.on("blur", () => {
		mini.hiddenAt = Date.now();
		mini.hide();
	});
}

function toggleMini() {
	// ponytail: a click on Finn first blurs (and hides) Mini; a hide this recent means "close".
	if (mini.isVisible() || Date.now() - (mini.hiddenAt ?? 0) < 300) return mini.hide();
	const anchor = petOpen() ? pet.getBounds() : null;
	const { workArea } = screen.getDisplayMatching(anchor ?? screen.getCursorScreenPoint());
	const [width, height] = mini.getSize();
	const left = anchor ? anchor.x - width - 8 : workArea.x + (workArea.width - width) / 2;
	const x = anchor && left < workArea.x ? anchor.x + anchor.width + 8 : left;
	const top = anchor
		? anchor.y + anchor.height - height
		: workArea.y + (workArea.height - height) / 3;
	const y = Math.min(Math.max(top, workArea.y), workArea.y + workArea.height - height);
	mini.setPosition(Math.round(x), Math.round(y));
	mini.show();
}

const finnActions = [
	{ label: "Open SDtrust", click: () => showMain() },
	{ label: "Open mini chat", click: toggleMini },
];

function addFinnMenu(url) {
	const menu = Menu.getApplicationMenu() ?? new Menu();
	menu.append(
		new MenuItem({
			label: "Finn",
			submenu: [
				...finnActions,
				{
					label: "Show Finn",
					type: "checkbox",
					checked: settings.showPet,
					click: (item) => {
						settings.showPet = item.checked;
						if (item.checked) openPet(url);
						saveSettings();
						if (item.checked || !petOpen()) return;
						pet.close();
						// Without Finn, keep a window on screen to come back from.
						showMain();
					},
				},
				{ type: "separator" },
				{ role: "quit" },
			],
		}),
	);
	Menu.setApplicationMenu(menu);
}

ipcMain.on("mini:toggle", () => toggleMini());
ipcMain.on("mini:hide", () => mini?.hide());
ipcMain.on("main:open", (_event, route) => {
	if (main && typeof route === "string") showMain(route);
});
ipcMain.on("pet:move", (event, dx, dy) => {
	if (!petOpen() || event.sender !== pet.webContents || !Number.isFinite(dx + dy)) return;
	const [x, y] = pet.getPosition();
	pet.setPosition(Math.round(x + dx), Math.round(y + dy));
});

app.whenReady().then(async () => {
	try {
		settings = { ...settings, ...JSON.parse(readFileSync(settingsPath(), "utf8")) };
	} catch {
		// First launch or unreadable settings: keep the defaults.
	}
	try {
		const url = await startApi();
		appUrl = url;
		openMain(url);
		openMini(url);
		if (settings.showPet) openPet(url);
		addFinnMenu(url);
	} catch (error) {
		dialog.showErrorBox("Day One could not start", String(error));
		app.quit();
	}
});
app.on("before-quit", () => {
	quitting = true;
	saveSettings();
});
// Clicking the dock icon (macOS) brings the main window back.
app.on("activate", () => main && showMain());
app.on("window-all-closed", () => app.quit());
app.on("quit", () => api?.kill());
