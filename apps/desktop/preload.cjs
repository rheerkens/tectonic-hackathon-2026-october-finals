// The web app reaches the desktop shell only through these fixed actions.
const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("desktop", {
	toggleMini: () => ipcRenderer.send("mini:toggle"),
	hideMini: () => ipcRenderer.send("mini:hide"),
	movePet: (dx, dy) => ipcRenderer.send("pet:move", Number(dx), Number(dy)),
	openResult: (resultId) => ipcRenderer.invoke("main:open-result", resultId),
});
