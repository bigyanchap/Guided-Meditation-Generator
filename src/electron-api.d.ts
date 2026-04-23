export type ElectronNetFetchRequest = {
  url: string;
  method: string;
  headers: Record<string, string>;
  body: string | null;
};

export type ElectronNetFetchResult = {
  ok: boolean;
  status: number;
  statusText: string;
  headers: Record<string, string>;
  body: ArrayBuffer;
};

export type ElectronAPI = {
  isElectron: true;
  netFetch: (req: ElectronNetFetchRequest) => Promise<ElectronNetFetchResult>;
};

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}

export {};
