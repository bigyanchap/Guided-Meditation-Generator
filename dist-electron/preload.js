import { contextBridge, ipcRenderer } from 'electron';
contextBridge.exposeInMainWorld('electronAPI', {
    isElectron: true,
    openExternal: (url) => ipcRenderer.invoke('open-external', url),
    netFetch: (req) => ipcRenderer.invoke('electron-net-fetch', req),
});
