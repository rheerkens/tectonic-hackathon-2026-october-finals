// Electron shell: starts the API on a free local port and shows the web app it serves,
// plus Finn, a desktop pet that opens a floating mini chat.
const {
	app,
	BrowserWindow,
	dialog,
	ipcMain,
	Menu,
	MenuItem,
	screen,
	session,
} = require("electron");
const { spawn } = require("node:child_process");
const { readFileSync, writeFileSync } = require("node:fs");
const { createServer } = require("node:net");
const { join, resolve } = require("node:path");
const speech = require("./speech.cjs");

function freePort() {
	return new Promise((done, fail) => {
		const server = createServer().listen(0, "127.0.0.1", () => {
			const { port } = server.address();
			server.close(() => done(port));
		});
		server.on("error", fail);
	});
}

const appRoot = () =>
	app.isPackaged ? join(process.resourcesPath, "app-root") : resolve(__dirname, "../..");

let api;
async function startApi() {
	const port = await freePort();
	const root = appRoot();
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
// Half the 192 × 208 sprite cell keeps Finn small but sharp on retina screens; that is 100%.
const PET_BASE = { width: 96, height: 104 };
// Finn's size in whole percent, chosen in Settings: 75 to 150 in steps of 5.
const validScale = (value) =>
	Number.isInteger(value) && value >= 75 && value <= 150 && value % 5 === 0;
// Always derived from the stored percentage, never read back from a window, so DPI rounding
// cannot accumulate.
const petSize = () => ({
	width: Math.round((PET_BASE.width * settings.petScale) / 100),
	height: Math.round((PET_BASE.height * settings.petScale) / 100),
});
const settingsPath = () => join(app.getPath("userData"), "desktop.json");
let settings = { showPet: true, petPosition: null, petScale: 100 };
function saveSettings() {
	if (petOpen()) settings.petPosition = pet.getPosition();
	writeFileSync(settingsPath(), JSON.stringify(settings));
}
// Keeps the whole pet on the screen it is on.
function clampPet({ x, y, width, height }) {
	const { workArea } = screen.getDisplayMatching({ x, y, width, height });
	return {
		x: Math.round(Math.min(Math.max(x, workArea.x), workArea.x + workArea.width - width)),
		y: Math.round(Math.min(Math.max(y, workArea.y), workArea.y + workArea.height - height)),
		width,
		height,
	};
}

let pet;
let mini;
let miniHeight = 96;
let miniLayoutVersion = 0;
let mainWindow;
let mainReady = Promise.resolve();
let appUrl;
let quitting = false;
let finnMenu;
let showPetItem;
const petOpen = () => pet && !pet.isDestroyed();
const mainOpen = () => mainWindow && !mainWindow.isDestroyed();

function reportOpenError(error) {
	dialog.showErrorBox("Could not open FINN", String(error));
}

async function openMain(path) {
	const create = !mainWindow || mainWindow.isDestroyed();
	if (create) {
		mainWindow = new BrowserWindow({ width: 1280, height: 860, show: false, webPreferences });
		const window = mainWindow;
		mainReady = Promise.resolve();
		// While SDtrust is open Finn lives inside it; closing it sends Finn back to the desktop.
		if (petOpen()) pet.hide();
		mini?.hide();
		window.on("close", (event) => {
			if (quitting || !window.finnDock || window.finnLeaving) return;
			event.preventDefault();
			window.finnLeaving = true;
			window.webContents.send("main:closing");
			// Close anyway if the page cannot finish Finn's goodbye.
			setTimeout(() => {
				if (!window.isDestroyed()) window.close();
			}, 2500);
		});
		window.on("closed", () => {
			if (mainWindow === window) mainWindow = null;
			if (!quitting) {
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
		if (!mainOpen()) pet.showInactive();
		return;
	}
	const { workArea } = screen.getPrimaryDisplay();
	const size = petSize();
	const [x, y] = settings.petPosition ?? [
		workArea.x + workArea.width - size.width - 40,
		workArea.y + workArea.height - size.height - 40,
	];
	const bounds = clampPet({ x, y, ...size });
	pet = new BrowserWindow({
		...bounds,
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
	window.setBounds(bounds);
	window.once("ready-to-show", () => {
		if (!window.isDestroyed() && !quitting && !mainOpen()) window.showInactive();
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
	mini.webContents.on("preferred-size-changed", () => {
		if (quitting || mini.isDestroyed()) return;
		void positionMini();
	});
	mini.loadURL(`${url}/mini`);
	mini.on("blur", () => {
		mini.hiddenAt = Date.now();
		mini.hide();
	});
}

async function positionMini() {
	const window = mini;
	if (!window || window.isDestroyed() || quitting) return;
	const version = ++miniLayoutVersion;
	const anchor = petOpen() ? pet.getBounds() : null;
	const { workArea } = screen.getDisplayMatching(anchor ?? screen.getCursorScreenPoint());
	const width = Math.min(420, workArea.width);
	// Keep the existing side layout on platforms where this presentation has not been validated.
	const shaped = anchor && process.platform === "win32";
	const above = anchor ? anchor.y - workArea.y : 440;
	const below = anchor ? workArea.y + workArea.height - anchor.y - anchor.height : 440;
	// Controls and activity sit below Finn, flipping above him near the bottom of the screen.
	const placement = !shaped ? "side" : below < 240 && above > below ? "above" : "below";
	// About 90 px of the room goes to the toolbar, gaps and padding around the activity.
	const contentHeight = Math.max(
		80,
		Math.min(440, (placement === "above" ? above : shaped ? below : workArea.height / 2) - 90),
	);
	try {
		const layout = await window.webContents.executeJavaScript(`(() => {
			const root = document.querySelector('.finn-mini');
			if (!root) return null;
			root.dataset.placement = ${JSON.stringify(placement)};
			root.style.setProperty('--mini-content-height', '${contentHeight}px');
			const content = root.querySelector('.finn-mini-content')?.getBoundingClientRect();
			const slot = root.querySelector('.finn-mini-pet-slot').getBoundingClientRect();
			return { height: Math.ceil(root.getBoundingClientRect().height), slotY: slot.y,
				surfaces: [...root.querySelectorAll('[data-mini-surface]')].map(el => {
					const r = el.getBoundingClientRect();
					const inContent = content && el.closest('.finn-mini-content');
					const top = inContent ? Math.max(r.top, content.top) : r.top;
					const bottom = inContent ? Math.min(r.bottom, content.bottom) : r.bottom;
					return { x: Math.floor(r.x - 3), y: Math.floor(top - 3), width: Math.ceil(r.width + 6), height: Math.ceil(bottom - top + 6) };
				}).filter(r => r.width > 6 && r.height > 6) };
		})()`);
		if (!layout || version !== miniLayoutVersion || window.isDestroyed() || quitting) return;
		miniHeight = Math.min(layout.height, workArea.height);
		const x = anchor
			? anchor.x + anchor.width / 2 - width / 2
			: workArea.x + (workArea.width - width) / 2;
		const y = shaped
			? anchor.y - layout.slotY
			: anchor
				? anchor.y + anchor.height - miniHeight
				: workArea.y + (workArea.height - miniHeight) / 3;
		window.setBounds({
			x: Math.round(Math.min(Math.max(x, workArea.x), workArea.x + workArea.width - width)),
			y: Math.round(Math.min(Math.max(y, workArea.y), workArea.y + workArea.height - miniHeight)),
			width,
			height: miniHeight,
		});
		if (shaped) window.setShape(layout.surfaces);
	} catch (error) {
		if (!window.isDestroyed() && !quitting)
			console.error("Could not position FINN controls", error);
	}
}

function toggleMini() {
	// ponytail: a click on Finn first blurs (and hides) Mini; a hide this recent means "close".
	if (mini.isVisible() || Date.now() - (mini.hiddenAt ?? 0) < 300) return mini.hide();
	void positionMini().then(() => {
		if (!quitting && mini && !mini.isDestroyed()) mini.show();
	});
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

ipcMain.handle("speech:transcribe", async (event, wav) => {
	if (!trustedWindow(event, mini, "/mini") && !trustedWindow(event, mainWindow))
		throw new Error("Untrusted speech request");
	// A closed, reloaded or crashed page cannot clean up itself; free the engine for it.
	const owner = event.sender;
	const id = owner.id;
	const stop = () => speech.cancel(id);
	const gone = ["destroyed", "did-navigate", "render-process-gone"];
	for (const name of gone) owner.on(name, stop);
	try {
		return await speech.transcribe(appRoot(), wav, id);
	} finally {
		if (!owner.isDestroyed()) for (const name of gone) owner.removeListener(name, stop);
	}
});
ipcMain.on("speech:cancel", (event) => speech.cancel(event.sender.id));

ipcMain.on("mini:toggle", () => toggleMini());
ipcMain.on("mini:hide", () => mini?.hide());
ipcMain.on("main:finn-dock", (event, active) => {
	if (trustedWindow(event, mainWindow)) mainWindow.finnDock = active === true;
});
ipcMain.on("main:close", (event) => {
	if (trustedWindow(event, mainWindow) && mainWindow.finnLeaving) mainWindow.close();
});
ipcMain.on("pet:move", (event, dx, dy) => {
	if (!petOpen() || event.sender !== pet.webContents || !Number.isFinite(dx + dy)) return;
	const [x, y] = pet.getPosition();
	// setPosition reads back a rounded size, which can accumulate at fractional Windows DPI.
	pet.setBounds({ x: Math.round(x + dx), y: Math.round(y + dy), ...petSize() });
	if (mini?.isVisible()) void positionMini();
});

const anyTrusted = (event) =>
	trustedWindow(event, pet, "/pet") ||
	trustedWindow(event, mini, "/mini") ||
	trustedWindow(event, mainWindow);
ipcMain.handle("finn:get-scale", (event) => {
	if (!anyTrusted(event)) throw new Error("Untrusted size request");
	return settings.petScale;
});
let saveTimer;
let scaleAnchor = null;
// Settings in SDtrust resize Finn live; the file is written once the slider rests.
ipcMain.handle("finn:set-scale", (event, scale) => {
	if (!trustedWindow(event, mainWindow)) throw new Error("Untrusted size request");
	if (!validScale(scale)) throw new Error("Invalid size");
	if (scale === settings.petScale) return;
	// Uses the canonical old size, not the window's DPI-rounded read-back, so slider moves cannot drift.
	const before = petSize();
	settings.petScale = scale;
	if (petOpen()) {
		// Grow and shrink around Finn's feet, then keep him on screen. While the slider moves and
		// Finn stays put, the same unrounded anchor is reused so steps back and forth cannot drift.
		const [x, y] = pet.getPosition();
		const anchor =
			scaleAnchor?.x === x && scaleAnchor.y === y
				? scaleAnchor
				: { centre: x + before.width / 2, feet: y + before.height };
		const size = petSize();
		pet.setBounds(
			clampPet({ x: anchor.centre - size.width / 2, y: anchor.feet - size.height, ...size }),
		);
		const [nx, ny] = pet.getPosition();
		scaleAnchor = { ...anchor, x: nx, y: ny };
	}
	for (const window of [pet, mini, mainWindow]) {
		if (window && !window.isDestroyed()) window.webContents.send("finn:scale", scale);
	}
	if (mini?.isVisible()) void positionMini();
	clearTimeout(saveTimer);
	saveTimer = setTimeout(saveSettings, 400);
});

app.whenReady().then(async () => {
	try {
		settings = { ...settings, ...JSON.parse(readFileSync(settingsPath(), "utf8")) };
	} catch {
		// First launch or unreadable settings: keep the defaults.
	}
	if (!validScale(settings.petScale)) settings.petScale = 100;
	// Microphone only, for Finn's voice input on the app's own pages; other permissions as before.
	session.defaultSession.setPermissionRequestHandler((contents, permission, grant, details) => {
		if (permission !== "media") return grant(true);
		const audioOnly =
			details.mediaTypes?.length && details.mediaTypes.every((type) => type === "audio");
		grant(Boolean(appUrl && audioOnly && details.requestingUrl?.startsWith(`${appUrl}/`)));
	});
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
