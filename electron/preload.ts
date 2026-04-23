import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  isElectron: true,
  netFetch: (req: {
    url: string;
    method: string;
    headers: Record<string, string>;
    body: string | null;
  }) => ipcRenderer.invoke('electron-net-fetch', req),
});
