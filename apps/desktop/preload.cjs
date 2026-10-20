// The web app reaches the desktop shell only through these messages.
const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("desktop", {
	toggleMini: () => ipcRenderer.send("mini:toggle"),
	hideMini: () => ipcRenderer.send("mini:hide"),
	openMain: (route) => ipcRenderer.send("main:open", String(route)),
	movePet: (dx, dy) => ipcRenderer.send("pet:move", Number(dx), Number(dy)),
});
