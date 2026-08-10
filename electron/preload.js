const { contextBridge, ipcRenderer } = require('electron');

// Expose a safe API to the renderer process via window.electronAPI
contextBridge.exposeInMainWorld('electronAPI', {
  isElectron: true,
  loadTransactions: () => ipcRenderer.invoke('load-transactions'),
  saveTransactions: (transactions) => ipcRenderer.invoke('save-transactions', transactions),
  loadAppData: () => ipcRenderer.invoke('load-app-data'),
  saveAppData: (data) => ipcRenderer.invoke('save-app-data', data),
  comdirectLoadConfig: () => ipcRenderer.invoke('comdirect-load-config'),
  comdirectSaveConfig: (config) => ipcRenderer.invoke('comdirect-save-config', config),
  comdirectStartLogin: (params) => ipcRenderer.invoke('comdirect-start-login', params),
  comdirectConfirmTan: () => ipcRenderer.invoke('comdirect-confirm-tan'),
  comdirectCancelFetch: () => ipcRenderer.invoke('comdirect-cancel-fetch'),
  onComdirectStatus: (callback) => {
    const listener = (_event, status) => callback(status);
    ipcRenderer.on('comdirect-status', listener);
    return () => ipcRenderer.removeListener('comdirect-status', listener);
  },
  onComdirectDebug: (callback) => {
    const listener = (_event, debugEvent, detail) => callback(debugEvent, detail);
    ipcRenderer.on('comdirect-debug', listener);
    return () => ipcRenderer.removeListener('comdirect-debug', listener);
  },
});
