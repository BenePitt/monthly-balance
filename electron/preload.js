const { contextBridge, ipcRenderer } = require('electron');

// Expose a safe API to the renderer process via window.electronAPI
contextBridge.exposeInMainWorld('electronAPI', {
  isElectron: true,
  loadTransactions: () => ipcRenderer.invoke('load-transactions'),
  saveTransactions: (transactions) => ipcRenderer.invoke('save-transactions', transactions),
  loadAppData: () => ipcRenderer.invoke('load-app-data'),
  saveAppData: (data) => ipcRenderer.invoke('save-app-data', data),
});
