import { contextBridge, ipcRenderer } from 'electron';
contextBridge.exposeInMainWorld('electronAPI', {
    isElectron: true,
    netFetch: (req) => ipcRenderer.invoke('electron-net-fetch', req),
});
