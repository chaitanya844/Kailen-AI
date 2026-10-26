// Kailen AI Windows desktop entry point (Electron).
// The Express app is hosted on an ephemeral localhost port inside this process.
const { app, BrowserWindow, shell } = require('electron');
const path = require('path');
// Store the encrypted vault in the current Windows user's app-data directory,
// not inside Electron's read-only packaged application archive.
process.env.KAILEN_DATA_DIR = path.join(app.getPath('userData'), 'data');
const expressApp = require('./server');

let mainWindow;
let httpServer;

function createWindow(url) {
  mainWindow = new BrowserWindow({
    width: 1500,
    height: 960,
    minWidth: 980,
    minHeight: 680,
    title: 'Kailen AI',
    icon: path.join(__dirname, 'public', 'icon.png'),
    backgroundColor: '#0b1020',
    autoHideMenuBar: true,
    show: false,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });
  mainWindow.loadURL(url);
  mainWindow.once('ready-to-show', () => mainWindow.show());
  setTimeout(() => {
    if (mainWindow && !mainWindow.isDestroyed() && !mainWindow.isVisible()) {
      mainWindow.show();
    }
  }, 1000);
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https://')) shell.openExternal(url);
    return { action: 'deny' };
  });
  mainWindow.on('closed', () => { mainWindow = null; });
}

app.whenReady().then(() => {
  // Use an ephemeral port so a separate local app on port 3000 cannot conflict.
  httpServer = expressApp.listen(0, '127.0.0.1', () => {
    const address = httpServer.address();
    createWindow(`http://127.0.0.1:${address.port}`);
  });
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0 && httpServer) {
      const address = httpServer.address();
      createWindow(`http://127.0.0.1:${address.port}`);
    }
  });
});

app.on('before-quit', () => {
  if (httpServer) httpServer.close();
});
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
