// The web app reaches the desktop shell only through these fixed actions.
const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("desktop", {
	showMini: () => ipcRenderer.send("mini:show"),
	setMiniHover: (inside) => ipcRenderer.send("mini:hover", inside === true),
	setMiniEngaged: (engaged) => ipcRenderer.send("mini:engaged", engaged === true),
	onMiniReset: (listener) => {
		const handler = () => listener();
		ipcRenderer.on("mini:reset", handler);
		return () => ipcRenderer.removeListener("mini:reset", handler);
	},
	onMiniCompose: (listener) => {
		const handler = () => listener();
		ipcRenderer.on("mini:compose", handler);
		return () => ipcRenderer.removeListener("mini:compose", handler);
	},
	toggleMini: () => ipcRenderer.send("mini:toggle"),
	hideMini: () => ipcRenderer.send("mini:hide"),
	openMain: (route) => ipcRenderer.send("main:open", String(route)),
	movePet: (dx, dy) => ipcRenderer.send("pet:move", Number(dx), Number(dy)),
	openResult: (resultId) => ipcRenderer.invoke("main:open-result", resultId),
	// Finn's dock asks to hold the close while he waves and runs out of SDtrust.
	onMainClosing: (listener) => {
		const handler = () => listener();
		ipcRenderer.on("main:closing", handler);
		ipcRenderer.send("main:finn-dock", true);
		return () => {
			ipcRenderer.removeListener("main:closing", handler);
			ipcRenderer.send("main:finn-dock", false);
		};
	},
	closeMain: () => ipcRenderer.send("main:close"),
	// Finn's voice input: one 16 kHz mono WAV clip in, its local transcript out.
	transcribeSpeech: (wav) => ipcRenderer.invoke("speech:transcribe", wav),
	cancelSpeech: () => ipcRenderer.send("speech:cancel"),
	// Finn's size in percent; only SDtrust's Settings may change it.
	getPetScale: () => ipcRenderer.invoke("finn:get-scale"),
	setPetScale: (scale) => ipcRenderer.invoke("finn:set-scale", Number(scale)),
	onPetScale: (listener) => {
		const handler = (_event, scale) => listener(scale);
		ipcRenderer.on("finn:scale", handler);
		return () => ipcRenderer.removeListener("finn:scale", handler);
	},
	onFinnLanded: (listener) => {
		const handler = () => listener();
		ipcRenderer.on("finn:landed", handler);
		return () => ipcRenderer.removeListener("finn:landed", handler);
	},
	// The shell poses the desktop Finn while it jumps him between the desktop and SDtrust.
	onPose: (listener) => {
		const handler = (_event, pose) => listener(typeof pose === "string" ? pose : null);
		ipcRenderer.on("pet:pose", handler);
		return () => ipcRenderer.removeListener("pet:pose", handler);
	},
	onHeadsUp: (listener) => {
		const handler = () => listener();
		ipcRenderer.on("finn:heads-up", handler);
		return () => ipcRenderer.removeListener("finn:heads-up", handler);
	},
});
