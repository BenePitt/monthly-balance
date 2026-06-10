const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');

const isDev = process.env.NODE_ENV === 'development';

function getDataFilePath() {
  return path.join(app.getPath('userData'), 'transactions.json');
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    title: 'Monatliche Bilanz',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  if (isDev) {
    win.loadURL('http://localhost:5173');
    win.webContents.openDevTools();
  } else {
    win.loadFile(path.join(__dirname, '../dist/index.html'));
  }
}

// IPC: Load transactions from local JSON file (legacy)
ipcMain.handle('load-transactions', async () => {
  const dataFile = getDataFilePath();
  try {
    if (fs.existsSync(dataFile)) {
      const raw = fs.readFileSync(dataFile, 'utf-8');
      return JSON.parse(raw);
    }
    return [];
  } catch {
    return [];
  }
});

// IPC: Save transactions to local JSON file (legacy)
ipcMain.handle('save-transactions', async (_event, transactions) => {
  const dataFile = getDataFilePath();
  try {
    fs.writeFileSync(dataFile, JSON.stringify(transactions, null, 2), 'utf-8');
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

function getAppDataFilePath() {
  return path.join(app.getPath('userData'), 'data.json');
}

const DEFAULT_APP_DATA = { transactions: [], startBalance: 0, currentBalance: 0, balanceMode: 'start' };

// IPC: Load full app data (transactions + balance settings)
ipcMain.handle('load-app-data', async () => {
  const appDataFile = getAppDataFilePath();
  try {
    if (fs.existsSync(appDataFile)) {
      const raw = fs.readFileSync(appDataFile, 'utf-8');
      const parsed = JSON.parse(raw);
      return { ...DEFAULT_APP_DATA, ...parsed };
    }
    // Migration: fall back to legacy transactions.json
    const legacyFile = getDataFilePath();
    if (fs.existsSync(legacyFile)) {
      const raw = fs.readFileSync(legacyFile, 'utf-8');
      const transactions = JSON.parse(raw);
      return { ...DEFAULT_APP_DATA, transactions: Array.isArray(transactions) ? transactions : [] };
    }
    return { ...DEFAULT_APP_DATA };
  } catch {
    return { ...DEFAULT_APP_DATA };
  }
});

// IPC: Save full app data (transactions + balance settings)
ipcMain.handle('save-app-data', async (_event, data) => {
  const appDataFile = getAppDataFilePath();
  try {
    fs.writeFileSync(appDataFile, JSON.stringify(data, null, 2), 'utf-8');
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
