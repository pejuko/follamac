const { app, Menu, BrowserWindow, shell } = require('electron');
const path = require('path');

const Store = require('electron-store');
const store = new Store();

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require('electron-squirrel-startup')) {
  app.quit();
}

// Opens link in a default browser
const openExternalLink = (link) => {
  return shell.openExternal(link);
};

let windowConfig = {
  width: 1024,
  height: 768,
};

const createWindow = () => {
  Object.assign(windowConfig, store.get("winBounds"));
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: windowConfig.width,
    height: windowConfig.height,
    icon: path.join(__dirname, 'build/icons/icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  mainWindow.on('close', () => {
    store.set('winBounds', mainWindow.getBounds());
  });

  mainWindow.webContents.on('will-navigate', (e, url) => {
    openExternalLink(url);
    e.preventDefault();
  });

  mainWindow.webContents.on('before-input-event', (event, input) => {
    if (input.control && input.key.toLowerCase() === 'i') {
      mainWindow.webContents.openDevTools();
      event.preventDefault()
    }
  });

  // and load the index.html of the app.
  mainWindow.loadFile(`src/dist/index.html`);
};

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', createWindow);

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and import them here.

app.whenReady().then(() => {
  Menu.setApplicationMenu(null);
});