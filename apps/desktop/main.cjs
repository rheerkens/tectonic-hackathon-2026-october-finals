// Electron shell: starts the API on a free local port and shows the web app it serves,
// plus Finn, a desktop pet that opens a floating mini chat.
const {
	app,
	BrowserWindow,
	dialog,
	globalShortcut,
	ipcMain,
	Menu,
	MenuItem,
	nativeTheme,
	Notification,
	screen,
	session,
	shell,
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
			// ponytail: the demo build signs in with synthetic users on a loopback-only API;
			// ship NODE_ENV=production with AUTH_MODE=clerk before real customer data goes in.
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
		const timeout = setTimeout(
			() => fail(new Error("API did not start within 30 seconds")),
			30_000,
		);
		api.on("error", fail);
		api.on("exit", (code) => fail(new Error(`API exited with code ${code}`)));
		// The ready line can arrive split over two chunks, so match on everything read so far.
		let output = "";
		api.stdout.on("data", (chunk) => {
			process.stdout.write(chunk);
			if (output.includes('"api_ready"')) return;
			output += chunk;
			if (!output.includes('"api_ready"')) return;
			clearTimeout(timeout);
			done(`http://127.0.0.1:${port}`);
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
	// While Finn is mid-jump or inside SDtrust, his desktop spot is the one remembered before.
	if (petOpen() && !flying && pet.isVisible()) settings.petPosition = pet.getPosition();
	try {
		writeFileSync(settingsPath(), JSON.stringify(settings));
	} catch (error) {
		// A read-only or full profile must not crash the app; Finn just forgets his spot.
		console.error("Could not save desktop settings", error);
	}
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
let miniHideTimer;
let miniVisibilityVersion = 0;
let miniEngaged = false;
// Whether the pointer is over one of Mini's pills, as last reported by its page.
let miniOverSurface = false;
let mainWindow;
let mainReady = Promise.resolve();
let appUrl;
let quitting = false;
let finnMenu;
let showPetItem;
const petOpen = () => pet && !pet.isDestroyed();
const mainOpen = () => mainWindow && !mainWindow.isDestroyed();
let flying = false;
let jumpVersion = 0;
function cancelJump() {
	jumpVersion++;
	flying = false;
	if (!quitting && petOpen()) pet.webContents.send("pet:pose", null);
}
function homeBounds() {
	const [x, y] = settings.petPosition ?? pet.getPosition();
	return clampPet({ x, y, ...petSize() });
}

// Use the compact dock's actual slot: its position also depends on the open conversation.
async function dockBounds(window) {
	const content = window.getContentBounds();
	const slot = await window.webContents.executeJavaScript(`(async () => {
		// The new renderer reads the saved scale through IPC after mounting.
		// Wait briefly for that render before choosing the native landing point.
		for (let attempt = 0; attempt < 30; attempt++) {
			const slot = document.querySelector('.finn-dock .finn-mini-pet-slot');
			if (!slot) return null;
			const rect = slot.getBoundingClientRect();
			if (Math.abs(rect.width - ${petSize().width}) < 1 || attempt === 29)
				return { x: rect.x, y: rect.y };
			await new Promise(resolve => setTimeout(resolve, 32));
		}
	})()`);
	return {
		x: Math.round(content.x + (slot?.x ?? content.width - 24 - petSize().width)),
		y: Math.round(content.y + (slot?.y ?? content.height - 21 - petSize().height)),
	};
}

// Jumps the desktop pet window along an arc, the same curve as the walk-in prototype.
function jumpPet(to, onLanded) {
	const version = ++jumpVersion;
	const window = pet;
	const [fx, fy] = pet.getPosition();
	const dist = Math.hypot(to.x - fx, to.y - fy);
	const duration = Math.min(1000, Math.max(550, dist / 0.9));
	const arc = Math.min(200, Math.max(60, dist * 0.35));
	flying = true;
	pet.webContents.send("pet:pose", "crouch");
	setTimeout(() => {
		if (version !== jumpVersion || quitting || window.isDestroyed()) return;
		pet.webContents.send("pet:pose", "jumping");
		const start = Date.now();
		const timer = setInterval(() => {
			if (version !== jumpVersion || quitting || window.isDestroyed()) {
				clearInterval(timer);
				if (version === jumpVersion) flying = false;
				return;
			}
			const t = Math.min(1, (Date.now() - start) / duration);
			const x = fx + (to.x - fx) * t;
			const y = fy + (to.y - fy) * t - arc * 4 * t * (1 - t);
			window.setBounds({ x: Math.round(x), y: Math.round(y), ...petSize() });
			if (t < 1) return;
			clearInterval(timer);
			flying = false;
			pet.webContents.send("pet:pose", null);
			onLanded();
		}, 16);
	}, 140);
}

// Once SDtrust shows and its dock is mounted, the desktop Finn jumps into his spot there.
async function jumpIn(window) {
	if (!window.pendingJump || !window.finnDock || !window.isVisible()) return;
	window.pendingJump = false;
	const landed = () => {
		if (!window.isDestroyed()) window.webContents.send("finn:landed");
	};
	if (!petOpen() || !pet.isVisible() || flying) {
		if (petOpen()) pet.hide();
		return landed();
	}
	settings.petPosition = pet.getPosition();
	saveSettings();
	const target = await dockBounds(window);
	if (window.isDestroyed() || quitting || !petOpen()) return;
	jumpPet(target, () => {
		pet.hide();
		landed();
	});
}

// Closing SDtrust: the desktop Finn takes over at the dock and jumps back to his own spot.
async function jumpHome(window) {
	if (!petOpen()) return window.close();
	// Already back on the desktop because SDtrust was in the background: nothing to jump.
	if (pet.isVisible() && !flying) {
		window.returningHome = true;
		return window.close();
	}
	// A close can interrupt the incoming jump; its stale callback must not hide Finn later.
	const interrupted = flying;
	cancelJump();
	const [x, y] = pet.getPosition();
	const from = interrupted ? { x, y } : await dockBounds(window);
	if (window.isDestroyed() || quitting) return;
	if (!petOpen()) return window.close();
	window.returningHome = true;
	const home = homeBounds();
	settings.petPosition = [home.x, home.y];
	pet.setBounds({ ...from, ...petSize() });
	pet.showInactive();
	jumpPet(home, () => {
		pet.webContents.send("pet:pose", "waving");
		setTimeout(() => petOpen() && pet.webContents.send("pet:pose", null), 1400);
		saveSettings();
	});
	setTimeout(() => {
		if (!window.isDestroyed()) window.close();
	}, 200);
}

function reportOpenError(error) {
	dialog.showErrorBox("Could not open FINN", String(error));
}

async function openMain(path) {
	const create = !mainWindow || mainWindow.isDestroyed();
	if (create) {
		mainWindow = new BrowserWindow({
			width: 1280,
			height: 860,
			show: false,
			webPreferences,
			// SDtrust draws its own top bar: macOS traffic lights sit inside the sidebar card,
			// Windows/Linux window buttons float transparent over the top right.
			titleBarStyle: "hidden",
			...(process.platform === "darwin"
				? { trafficLightPosition: { x: 30, y: 30 } }
				: {
						titleBarOverlay: {
							color: "#00000000",
							symbolColor: nativeTheme.shouldUseDarkColors ? "#ffffff" : "#1f1f1f",
							height: 36,
						},
					}),
		});
		const window = mainWindow;
		mainReady = Promise.resolve();
		// While SDtrust is open Finn lives inside it; he jumps in once it shows and back out on close.
		window.pendingJump = true;
		hideMini();
		window.webContents.on("dom-ready", () => {
			void window.webContents.executeJavaScript(
				`document.documentElement.classList.add("desktop-frameless", "desktop-${process.platform === "darwin" ? "mac" : "win"}")`,
			);
		});
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
		// While SDtrust is in the background Finn waits on the desktop; he goes back in when it returns.
		window.on("blur", () => {
			setTimeout(() => {
				if (quitting || window.isDestroyed() || window.finnLeaving || !window.finnDock) return;
				if (BrowserWindow.getFocusedWindow() || flying || !petOpen() || pet.isVisible()) return;
				window.pendingJump = false;
				window.finnOut = true;
				pet.setBounds(homeBounds());
				pet.showInactive();
				pet.webContents.send("pet:pose", "waving");
				setTimeout(() => petOpen() && !flying && pet.webContents.send("pet:pose", null), 1400);
			}, 100);
		});
		window.on("focus", () => {
			if (!window.finnOut) return;
			window.finnOut = false;
			if (!petOpen() || !pet.isVisible() || flying) return;
			hideMini();
			saveSettings();
			pet.hide();
		});
		window.on("closed", () => {
			if (mainWindow === window) mainWindow = null;
			if (!quitting) {
				if (!window.returningHome) {
					cancelJump();
					if (petOpen()) pet.setBounds(homeBounds());
				}
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
	await jumpIn(window);
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
		// The transparent chat overlaps Finn's native bounds; keep his animation painting.
		webPreferences: { ...webPreferences, backgroundThrottling: false },
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
	mini.on("blur", hideMini);
}

function hideMini() {
	clearTimeout(miniHideTimer);
	miniVisibilityVersion++;
	miniEngaged = false;
	miniOverSurface = false;
	if (!mini || mini.isDestroyed()) return;
	mini.hiddenAt = Date.now();
	mini.hide();
	mini.webContents.send("mini:reset");
}

function setMiniHover(inside) {
	clearTimeout(miniHideTimer);
	if (!inside) {
		// Leave enough time to cross the transparent gap from Finn to the controls.
		// Only the hover preview closes this way; a clicked-into Mini closes on blur.
		miniHideTimer = setTimeout(() => {
			if (!miniEngaged && !mini?.isFocused()) hideMini();
		}, 400);
	}
}

async function positionMini() {
	const window = mini;
	if (!window || window.isDestroyed() || quitting) return;
	const version = ++miniLayoutVersion;
	const anchor = petOpen() ? pet.getBounds() : null;
	const { workArea } = screen.getDisplayMatching(anchor ?? screen.getCursorScreenPoint());
	const width = Math.min(420, workArea.width);
	// Without Finn on screen there is nothing to anchor to: the controls open as a side panel.
	const shaped = Boolean(anchor);
	const above = anchor ? anchor.y - workArea.y : 440;
	const below = anchor ? workArea.y + workArea.height - anchor.y - anchor.height : 440;
	// Controls and activity sit above Finn, flipping below him near the top of the screen.
	const placement = !shaped ? "side" : above < 240 && below > above ? "below" : "above";
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
			root.style.setProperty('--mini-anchor-offset', '0px');
			const head = root.querySelector('.finn-mini-head').getBoundingClientRect();
			const anchor = ${JSON.stringify(anchor)};
			const area = ${JSON.stringify(workArea)};
			const width = ${width};
			const left = anchor ? Math.min(Math.max(anchor.x + anchor.width / 2 - width / 2, area.x), area.x + area.width - width) : area.x + (area.width - width) / 2;
			if (anchor && ${Boolean(shaped)}) {
				const centre = Math.min(Math.max(anchor.x + anchor.width / 2 - left, head.width / 2 + 3), width - head.width / 2 - 3);
				root.style.setProperty('--mini-anchor-offset', (centre - head.x - head.width / 2) + 'px');
			}
			const content = root.querySelector('.finn-mini-content')?.getBoundingClientRect();
			const slot = root.querySelector('.finn-mini-pet-slot').getBoundingClientRect();
			// Focusing the composer can scroll the page while the window is still too short;
			// measure from the document top, where the resized window starts.
			const sy = window.scrollY;
			return { height: Math.ceil(root.getBoundingClientRect().height), slotY: slot.y + sy,
				surfaces: [...root.querySelectorAll('[data-mini-surface]')].map(el => {
					const r = el.getBoundingClientRect();
					const inContent = content && el.closest('.finn-mini-content');
					const top = inContent ? Math.max(r.top, content.top) : r.top;
					const bottom = inContent ? Math.min(r.bottom, content.bottom) : r.bottom;
					return { x: Math.floor(r.x - 3), y: Math.floor(top + sy - 3), width: Math.ceil(r.width + 6), height: Math.ceil(bottom - top + 6) };
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
		// Clicks outside the pills reach Finn and the desktop: Windows cuts the window to the pills,
		// macOS has no setShape, so the window ignores the mouse until the pointer is over a pill.
		// A relayout keeps the pill under the pointer clickable: the page only reports changes.
		window.shaped = shaped;
		if (process.platform === "win32") {
			if (shaped) window.setShape(layout.surfaces);
		} else window.setIgnoreMouseEvents(shaped && !miniOverSurface, { forward: true });
	} catch (error) {
		if (!window.isDestroyed() && !quitting)
			console.error("Could not position FINN controls", error);
	}
}

async function showMiniOnHover() {
	setMiniHover(true);
	if (!petOpen() || !pet.isVisible() || flying || mini?.isVisible()) return;
	const version = ++miniVisibilityVersion;
	await positionMini();
	if (
		version === miniVisibilityVersion &&
		!quitting &&
		petOpen() &&
		pet.isVisible() &&
		mini &&
		!mini.isDestroyed()
	)
		mini.showInactive();
}

function toggleMini() {
	// A hover preview becomes an active chat on click without closing first.
	// A click opens straight into the new-chat field; a hover only previews the toolbar.
	if (mini.isVisible() && !mini.isFocused()) {
		mini.webContents.send("mini:compose");
		return mini.show();
	}
	// ponytail: a click on Finn first blurs (and hides) Mini; a hide this recent means "close".
	if (mini.isVisible() || Date.now() - (mini.hiddenAt ?? 0) < 300) return hideMini();
	mini.webContents.send("mini:compose");
	void positionMini().then(() => {
		if (!quitting && mini && !mini.isDestroyed()) mini.show();
	});
}

// Demo trigger: a Teams message contradicts what Finn knows, and he speaks up unasked.
const HEADS_UP_KEY = "CommandOrControl+Alt+T";
function teamsHeadsUp() {
	if (Notification.isSupported())
		new Notification({
			title: "Microsoft Teams · Atlas payroll",
			body: "I thought Atlas could submit until the 25th this time?",
		}).show();
	setTimeout(() => {
		if (quitting) return;
		// Finn answers where he is: inside SDtrust, or on the desktop while SDtrust is in the background.
		if (mainOpen() && !(petOpen() && pet.isVisible()))
			return mainWindow.webContents.send("finn:heads-up");
		if (!mini || mini.isDestroyed() || !petOpen()) return;
		mini.webContents.send("finn:heads-up");
		if (!flying) {
			pet.webContents.send("pet:pose", "waving");
			setTimeout(() => petOpen() && !flying && pet.webContents.send("pet:pose", null), 1400);
		}
		void positionMini().then(() => {
			if (!quitting && mini && !mini.isDestroyed() && petOpen() && pet.isVisible())
				mini.showInactive();
		});
	}, 1500);
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
		{ label: "Simulate Teams message", accelerator: HEADS_UP_KEY, click: teamsHeadsUp },
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

ipcMain.on("mini:toggle", (event) => {
	if (anyTrusted(event)) toggleMini();
});
ipcMain.on("mini:show", (event) => {
	if (trustedWindow(event, pet, "/pet")) void showMiniOnHover().catch(reportOpenError);
});
ipcMain.on("mini:hover", (event, inside) => {
	if (trustedWindow(event, pet, "/pet") || trustedWindow(event, mini, "/mini"))
		setMiniHover(inside === true);
	if (!trustedWindow(event, mini, "/mini")) return;
	miniOverSurface = inside === true;
	if (process.platform !== "win32" && mini.shaped)
		mini.setIgnoreMouseEvents(!miniOverSurface, { forward: true });
});
ipcMain.on("mini:engaged", (event, engaged) => {
	if (trustedWindow(event, mini, "/mini")) miniEngaged = engaged === true;
});
ipcMain.on("mini:layout", (event) => {
	if (trustedWindow(event, mini, "/mini")) void positionMini();
});
ipcMain.on("mini:hide", (event) => {
	if (anyTrusted(event)) hideMini();
});
ipcMain.on("main:finn-dock", (event, active) => {
	if (!trustedWindow(event, mainWindow)) return;
	mainWindow.finnDock = active === true;
	void jumpIn(mainWindow).catch(reportOpenError);
});
ipcMain.on("main:close", (event) => {
	if (trustedWindow(event, mainWindow) && mainWindow.finnLeaving)
		void jumpHome(mainWindow).catch(reportOpenError);
});
ipcMain.on("pet:move", (event, dx, dy) => {
	if (!petOpen() || event.sender !== pet.webContents || !Number.isFinite(dx + dy)) return;
	const [x, y] = pet.getPosition();
	// setPosition reads back a rounded size, which can accumulate at fractional Windows DPI.
	pet.setBounds(clampPet({ x: Math.round(x + dx), y: Math.round(y + dy), ...petSize() }));
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
	// Packaged builds carry the icon in the bundle; `electron .` needs it set on the dock.
	if (!app.isPackaged && process.platform === "darwin")
		app.dock.setIcon(join(__dirname, "icon.png"));
	// Microphone only, for Finn's voice input on the app's own pages; other permissions as before.
	session.defaultSession.setPermissionRequestHandler((contents, permission, grant, details) => {
		const own = Boolean(appUrl && details.requestingUrl?.startsWith(`${appUrl}/`));
		// Copying text and fullscreen are all the pages use besides the microphone.
		if (permission !== "media")
			return grant(own && ["clipboard-sanitized-write", "fullscreen"].includes(permission));
		const audioOnly =
			details.mediaTypes?.length && details.mediaTypes.every((type) => type === "audio");
		grant(Boolean(own && audioOnly));
	});
	try {
		const url = await startApi();
		appUrl = url;
		// A new launch is always reachable, even if Finn was hidden in the previous session.
		settings.showPet = true;
		openMini(url);
		addFinnMenu(url);
		openPet(url);
		globalShortcut.register(HEADS_UP_KEY, teamsHeadsUp);
	} catch (error) {
		dialog.showErrorBox("SDtrust could not start", String(error));
		app.quit();
	}
});
// Windows only ever show the app itself: links elsewhere open in the browser, never in Electron.
app.on("web-contents-created", (_event, contents) => {
	const external = (url) => {
		if (url.startsWith("https://")) void shell.openExternal(url);
	};
	contents.on("will-navigate", (event, url) => {
		if (appUrl && new URL(url).origin === appUrl) return;
		event.preventDefault();
		external(url);
	});
	contents.setWindowOpenHandler(({ url }) => {
		external(url);
		return { action: "deny" };
	});
});
app.on("before-quit", () => {
	quitting = true;
	clearTimeout(miniHideTimer);
	saveSettings();
	cancelJump();
});
app.on("activate", () => {
	if (appUrl && !quitting) void openMain().catch(reportOpenError);
});
app.on("will-quit", () => globalShortcut.unregisterAll());
app.on("window-all-closed", () => app.quit());
app.once("quit", () => {
	api?.kill();
	api = undefined;
});
