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

// IPC: Load transactions from local JSON file
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

// IPC: Save transactions to local JSON file
ipcMain.handle('save-transactions', async (_event, transactions) => {
  const dataFile = getDataFilePath();
  try {
    fs.writeFileSync(dataFile, JSON.stringify(transactions, null, 2), 'utf-8');
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
