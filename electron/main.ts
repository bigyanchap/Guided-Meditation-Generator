import { app, BrowserWindow, ipcMain, net } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const isDev = !app.isPackaged;

/** Hosts the renderer is allowed to reach via main-process fetch (CORS-safe packaged builds). */
const NET_FETCH_ALLOWED_HOSTS = new Set([
  'api.openai.com',
  'api-inference.huggingface.co',
  'router.huggingface.co',
  'api.elevenlabs.io',
  'generativelanguage.googleapis.com',
]);

function assertNetFetchUrl(urlString: string): void {
  let u: URL;
  try {
    u = new URL(urlString);
  } catch {
    throw new Error('Invalid URL');
  }
  const proto = u.protocol.toLowerCase();
  if (proto !== 'https:' && proto !== 'http:') {
    throw new Error(`Blocked fetch protocol: ${proto}`);
  }
  const host = u.hostname.toLowerCase();
  if (!NET_FETCH_ALLOWED_HOSTS.has(host)) {
    throw new Error(`Blocked fetch host: ${host}`);
  }
}

type NetFetchPayload = {
  url: string;
  method: string;
  headers: Record<string, string>;
  body: string | null;
};

ipcMain.handle('electron-net-fetch', async (_event, payload: NetFetchPayload) => {
  assertNetFetchUrl(payload.url);
  const res = await net.fetch(payload.url, {
    method: payload.method,
    headers: payload.headers,
    body: payload.body ?? undefined,
  });
  const body = await res.arrayBuffer();
  const headers: Record<string, string> = {};
  res.headers.forEach((value, key) => {
    headers[key.toLowerCase()] = value;
  });
  return {
    ok: res.ok,
    status: res.status,
    statusText: res.statusText,
    headers,
    body,
  };
});

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    title: 'ZenGM - Guided Meditation Generator',
    backgroundColor: '#f7f7f7',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  if (isDev) {
    const port = process.env.VITE_PORT || '3000';
    win.loadURL(`http://localhost:${port}`);
  } else {
    win.loadFile(path.join(__dirname, '../dist/index.html'));
  }
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
