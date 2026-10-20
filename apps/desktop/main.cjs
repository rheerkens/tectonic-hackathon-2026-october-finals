// Electron shell: starts the API on a free local port and shows the web app it serves,
// plus Finn, a desktop pet that opens a floating mini chat.
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

const webPreferences = {
	preload: join(__dirname, "preload.cjs"),
	contextIsolation: true,
	nodeIntegration: false,
	sandbox: true,
};
const PET_SIZE = { width: 96, height: 104 };
const settingsPath = () => join(app.getPath("userData"), "desktop.json");
let settings = { showPet: true, petPosition: null };
function saveSettings() {
	if (petOpen()) settings.petPosition = pet.getPosition();
	writeFileSync(settingsPath(), JSON.stringify(settings));
}

let pet;
let mini;
let miniHeight = 96;
let mainWindow;
let mainReady = Promise.resolve();
let appUrl;
let quitting = false;
let finnMenu;
let showPetItem;
const petOpen = () => pet && !pet.isDestroyed();

function reportOpenError(error) {
	dialog.showErrorBox("Could not open FINN", String(error));
}

async function openMain(path) {
	const create = !mainWindow || mainWindow.isDestroyed();
	if (create) {
		mainWindow = new BrowserWindow({ width: 1280, height: 860, show: false, webPreferences });
		const window = mainWindow;
		mainReady = Promise.resolve();
		window.on("closed", () => {
			if (mainWindow === window) mainWindow = null;
			if (!quitting && !petOpen()) {
				settings.showPet = true;
				showPetItem.checked = true;
				openPet(appUrl);
				saveSettings();
			}
		});
	}
	const window = mainWindow;
	if (create || path !== undefined) {
		const target = `${appUrl}${path ?? "/"}`;
		// Serialize repeated result clicks so one navigation cannot abort the other.
		mainReady = mainReady.catch(() => {}).then(() => window.loadURL(target));
	}
	await mainReady;
	if (window.isDestroyed() || quitting) throw new Error("FINN window was closed");
	if (window.isMinimized()) window.restore();
	window.show();
	window.focus();
}

function openPet(url) {
	if (petOpen()) {
		pet.showInactive();
		return;
	}
	const { workArea } = screen.getPrimaryDisplay();
	const [x, y] = settings.petPosition ?? [
		workArea.x + workArea.width - 136,
		workArea.y + workArea.height - 144,
	];
	pet = new BrowserWindow({
		x,
		y,
		// Half the 192 × 208 sprite cell keeps Finn small but sharp on retina screens.
		...PET_SIZE,
		transparent: true,
		frame: false,
		resizable: false,
		hasShadow: false,
		alwaysOnTop: true,
		skipTaskbar: true,
		show: false,
		webPreferences,
	});
	const window = pet;
	// Normalize constructor DPI rounding while hidden, before the first visible frame.
	window.setBounds({ x, y, ...PET_SIZE });
	window.once("ready-to-show", () => {
		if (!window.isDestroyed() && !quitting) window.showInactive();
	});
	pet.loadURL(`${url}/pet`);
	pet.on("closed", () => {
		pet = null;
	});
	pet.webContents.on("context-menu", () => finnMenu?.popup({ window: pet }));
}

function openMini(url) {
	mini = new BrowserWindow({
		width: 420,
		height: miniHeight,
		show: false,
		frame: false,
		transparent: true,
		resizable: false,
		hasShadow: false,
		alwaysOnTop: true,
		skipTaskbar: true,
		webPreferences: { ...webPreferences, enablePreferredSizeMode: true },
	});
	mini.webContents.on("preferred-size-changed", (_event, size) => {
		if (quitting || mini.isDestroyed()) return;
		miniHeight = Math.max(96, Math.ceil(size.height));
		positionMini();
	});
	mini.loadURL(`${url}/mini`);
	mini.on("blur", () => {
		mini.hiddenAt = Date.now();
		mini.hide();
	});
}

function positionMini() {
	const anchor = petOpen() ? pet.getBounds() : null;
	const { workArea } = screen.getDisplayMatching(anchor ?? screen.getCursorScreenPoint());
	const width = Math.min(420, workArea.width);
	const height = Math.min(miniHeight, workArea.height);
	const left = anchor ? anchor.x - width - 8 : workArea.x + (workArea.width - width) / 2;
	const x = anchor && left < workArea.x ? anchor.x + anchor.width + 8 : left;
	const top = anchor
		? anchor.y + anchor.height - height
		: workArea.y + (workArea.height - height) / 3;
	const y = Math.min(Math.max(top, workArea.y), workArea.y + workArea.height - height);
	mini.setBounds({
		x: Math.round(Math.min(Math.max(x, workArea.x), workArea.x + workArea.width - width)),
		y: Math.round(y),
		width,
		height,
	});
}

function toggleMini() {
	// ponytail: a click on Finn first blurs (and hides) Mini; a hide this recent means "close".
	if (mini.isVisible() || Date.now() - (mini.hiddenAt ?? 0) < 300) return mini.hide();
	positionMini();
	mini.show();
}

function addFinnMenu(url) {
	const menu = Menu.getApplicationMenu() ?? new Menu();
	finnMenu = Menu.buildFromTemplate([
		{ label: "Open mini chat", click: toggleMini },
		{ label: "Open SDtrust", click: () => openMain().catch(reportOpenError) },
		{
			label: "Show Finn",
			type: "checkbox",
			checked: true,
			click: async (item) => {
				try {
					if (!item.checked) await openMain();
					settings.showPet = item.checked;
					if (item.checked) openPet(url);
					saveSettings();
					if (!item.checked && petOpen()) pet.close();
				} catch (error) {
					item.checked = settings.showPet;
					reportOpenError(error);
				}
			},
		},
		{ type: "separator" },
		{ label: "Quit", click: () => app.quit() },
	]);
	showPetItem = finnMenu.items.find((item) => item.type === "checkbox");
	menu.append(new MenuItem({ label: "Finn", submenu: finnMenu }));
	Menu.setApplicationMenu(menu);
}

function trustedWindow(event, window, path) {
	if (
		!window ||
		window.isDestroyed() ||
		event.sender !== window.webContents ||
		event.senderFrame !== window.webContents.mainFrame
	)
		return false;
	try {
		const url = new URL(event.senderFrame.url);
		return (
			url.origin === appUrl &&
			event.senderFrame.url === window.webContents.getURL() &&
			(path === undefined || url.pathname === path)
		);
	} catch {
		return false;
	}
}

ipcMain.handle("main:open-result", async (event, resultId) => {
	if (
		!trustedWindow(event, pet, "/pet") &&
		!trustedWindow(event, mini, "/mini") &&
		!trustedWindow(event, mainWindow)
	)
		throw new Error("Untrusted result request");
	if (typeof resultId !== "string" || !/^[A-Za-z0-9][A-Za-z0-9_-]{0,127}$/.test(resultId)) {
		throw new Error("Invalid result ID");
	}
	await openMain(`/results/${encodeURIComponent(resultId)}`);
});

// Keep the existing local-route entry point alongside the narrower result action.
ipcMain.on("main:open", (event, route) => {
	if (
		!trustedWindow(event, pet, "/pet") &&
		!trustedWindow(event, mini, "/mini") &&
		!trustedWindow(event, mainWindow)
	)
		return;
	if (typeof route !== "string") return;
	try {
		const target = new URL(route, appUrl);
		if (target.origin !== appUrl) return;
		void openMain(`${target.pathname}${target.search}${target.hash}`).catch(reportOpenError);
	} catch {
		// Ignore malformed routes from renderer callers.
	}
});

ipcMain.on("mini:toggle", () => toggleMini());
ipcMain.on("mini:hide", () => mini?.hide());
ipcMain.on("pet:move", (event, dx, dy) => {
	if (!petOpen() || event.sender !== pet.webContents || !Number.isFinite(dx + dy)) return;
	const [x, y] = pet.getPosition();
	// setPosition reads back a rounded size, which can accumulate at fractional Windows DPI.
	pet.setBounds({ x: Math.round(x + dx), y: Math.round(y + dy), ...PET_SIZE });
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
		// A new launch is always reachable, even if Finn was hidden in the previous session.
		settings.showPet = true;
		openMini(url);
		addFinnMenu(url);
		openPet(url);
	} catch (error) {
		dialog.showErrorBox("Day One could not start", String(error));
		app.quit();
	}
});
app.on("before-quit", () => {
	quitting = true;
	saveSettings();
});
app.on("activate", () => {
	if (appUrl && !quitting) void openMain().catch(reportOpenError);
});
app.on("window-all-closed", () => app.quit());
app.once("quit", () => {
	api?.kill();
	api = undefined;
});
