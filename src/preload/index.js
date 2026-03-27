import { contextBridge, ipcRenderer } from 'electron';
import { electronAPI } from '@electron-toolkit/preload';
// Expose a typed `api` object to the renderer via contextBridge.
// This keeps the renderer sandboxed while giving it access to IPC.
const api = {
    invoke: (channel, ...args) => ipcRenderer.invoke(channel, ...args)
};
if (process.contextIsolated) {
    try {
        contextBridge.exposeInMainWorld('electron', electronAPI);
        contextBridge.exposeInMainWorld('api', api);
    }
    catch (error) {
        console.error(error);
    }
}
else {
    // @ts-expect-error defined on the window in preload typings
    window.electron = electronAPI;
    window.api = api;
}
