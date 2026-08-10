const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const {
  loginAndRequestTan,
  confirmTan,
  fetchAccountsAndTransactions,
  ComdirectApiError,
} = require('./comdirectClient');

const isDev = process.env.NODE_ENV === 'development';

// Holds state between the two comdirect IPC round-trips (start-login and
// confirm-tan): the challenge must be confirmed by the user in the comdirect
// app before the second call, so it can't happen within a single handler.
let pendingComdirectFlow = null;
let comdirectFlowGeneration = 0;

function comdirectErrorResult(error) {
  const isApiError = error instanceof ComdirectApiError;
  return {
    success: false,
    error: isApiError ? error.message : 'Der Abruf ist fehlgeschlagen.',
    step: isApiError ? error.step : undefined,
    httpStatus: isApiError ? error.httpStatus : undefined,
    expired: isApiError ? error.expired : undefined,
  };
}

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

const DEFAULT_APP_DATA = {
  transactions: [],
  startBalance: 0,
  currentBalance: 0,
  balanceMode: 'start',
  accounts: [],
  selectedAccountId: null,
};

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

function getBankConfigFilePath() {
  return path.join(app.getPath('userData'), 'bank-config.json');
}

// IPC: Load saved comdirect API client-id/secret (never login credentials)
ipcMain.handle('comdirect-load-config', async () => {
  const configFile = getBankConfigFilePath();
  try {
    if (fs.existsSync(configFile)) {
      const raw = fs.readFileSync(configFile, 'utf-8');
      return { ...{ clientId: '', clientSecret: '' }, ...JSON.parse(raw) };
    }
    return { clientId: '', clientSecret: '' };
  } catch {
    return { clientId: '', clientSecret: '' };
  }
});

// IPC: Save comdirect API client-id/secret
ipcMain.handle('comdirect-save-config', async (_event, config) => {
  const configFile = getBankConfigFilePath();
  try {
    fs.writeFileSync(
      configFile,
      JSON.stringify(
        { clientId: config?.clientId || '', clientSecret: config?.clientSecret || '' },
        null,
        2
      ),
      'utf-8'
    );
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// IPC: Log in and request a TAN challenge (does NOT wait for/poll the TAN
// confirmation — comdirect invalidates a PushTAN the moment a premature
// confirmation attempt is made, so the renderer must wait for the user to
// explicitly confirm before calling comdirect-confirm-tan).
ipcMain.handle('comdirect-start-login', async (event, params) => {
  const myGeneration = ++comdirectFlowGeneration;
  const onDebug = (debugEvent, detail) => event.sender.send('comdirect-debug', debugEvent, detail);
  try {
    event.sender.send('comdirect-status', 'login');
    const result = await loginAndRequestTan({
      clientId: params.clientId,
      clientSecret: params.clientSecret,
      username: params.username,
      password: params.password,
      onDebug,
    });
    if (myGeneration !== comdirectFlowGeneration) {
      return { success: false, error: 'Abgebrochen.' };
    }
    pendingComdirectFlow = {
      ...result,
      clientId: params.clientId,
      clientSecret: params.clientSecret,
      startDate: params.startDate,
      endDate: params.endDate,
      iban: params.iban,
    };
    event.sender.send('comdirect-status', 'awaiting_confirmation');
    return { success: true, challengeType: result.challengeType };
  } catch (error) {
    return comdirectErrorResult(error);
  }
});

// IPC: Make exactly one TAN-confirmation attempt for the pending challenge.
// On success, continues on to fetch accounts/transactions in the same call.
ipcMain.handle('comdirect-confirm-tan', async (event) => {
  if (!pendingComdirectFlow) {
    return { success: false, error: 'Keine aktive TAN-Anfrage. Bitte neu starten.' };
  }
  const flow = pendingComdirectFlow;
  const onDebug = (debugEvent, detail) => event.sender.send('comdirect-debug', debugEvent, detail);

  try {
    await confirmTan({
      accessToken: flow.accessToken,
      sessionId: flow.sessionId,
      session: flow.session,
      challengeId: flow.challengeId,
      onDebug,
    });
  } catch (error) {
    if (error instanceof ComdirectApiError && error.expired) {
      pendingComdirectFlow = null;
    }
    return comdirectErrorResult(error);
  }

  try {
    event.sender.send('comdirect-status', 'authorizing');
    const { transactions, balanceEUR } = await fetchAccountsAndTransactions({
      clientId: flow.clientId,
      clientSecret: flow.clientSecret,
      preAuthAccessToken: flow.accessToken,
      sessionId: flow.sessionId,
      iban: flow.iban,
      startDate: flow.startDate,
      endDate: flow.endDate,
      onDebug,
    });
    pendingComdirectFlow = null;
    event.sender.send('comdirect-status', 'done');
    return { success: true, transactions, balanceEUR };
  } catch (error) {
    pendingComdirectFlow = null;
    return comdirectErrorResult(error);
  }
});

// IPC: Cancel an in-progress comdirect flow (e.g. while waiting for the user
// to confirm the TAN in the app).
ipcMain.handle('comdirect-cancel-fetch', async () => {
  comdirectFlowGeneration++;
  pendingComdirectFlow = null;
  return { success: true };
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
