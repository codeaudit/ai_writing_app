const { app, BrowserWindow, Menu, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const isDev = require('electron-is-dev');
const Store = require('electron-store');

// Initialize the store for app settings
const store = new Store();

// Keep a reference to the mainWindow to prevent it from being garbage collected
let mainWindow;

// Set the environment variable for next.config.js
process.env.ELECTRON = 'true';

function createWindow() {
  // Create the browser window
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    icon: path.join(__dirname, '../public/icon.png'),
    // Use native window frame on macOS, custom on Windows/Linux
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    autoHideMenuBar: false,
    // Set background color to match your app's theme
    backgroundColor: '#ffffff'
  });

  // Load the app
  const startUrl = isDev
    ? 'http://localhost:3000'
    : `file://${path.join(__dirname, '../.next/index.html')}`;

  mainWindow.loadURL(startUrl);

  // Open DevTools on development
  if (isDev) {
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  }

  // Handle window closed
  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Handle external links
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    // Open URLs in the default browser
    shell.openExternal(url);
    return { action: 'deny' };
  });

  // Create application menu
  createMenu();
}

function createMenu() {
  const isMac = process.platform === 'darwin';
  
  const template = [
    // App menu (macOS only)
    ...(isMac ? [{
      label: app.name,
      submenu: [
        { role: 'about' },
        { type: 'separator' },
        {
          label: 'Preferences',
          accelerator: 'CmdOrCtrl+,',
          click: () => {
            mainWindow.webContents.send('menu-preferences');
          }
        },
        { type: 'separator' },
        { role: 'services' },
        { type: 'separator' },
        { role: 'hide' },
        { role: 'hideOthers' },
        { role: 'unhide' },
        { type: 'separator' },
        { role: 'quit' }
      ]
    }] : []),
    
    // File menu
    {
      label: 'File',
      submenu: [
        {
          label: 'New Document',
          accelerator: 'CmdOrCtrl+N',
          click: () => {
            mainWindow.webContents.send('menu-new-document');
          }
        },
        { type: 'separator' },
        {
          label: 'Open File',
          accelerator: 'CmdOrCtrl+O',
          click: async () => {
            mainWindow.webContents.send('menu-open-file');
          }
        },
        {
          label: 'Open Folder',
          accelerator: 'CmdOrCtrl+Shift+O',
          click: async () => {
            mainWindow.webContents.send('menu-open-folder');
          }
        },
        { type: 'separator' },
        {
          label: 'Save',
          accelerator: 'CmdOrCtrl+S',
          click: () => {
            mainWindow.webContents.send('menu-save-document');
          }
        },
        {
          label: 'Save As',
          accelerator: 'CmdOrCtrl+Shift+S',
          click: () => {
            mainWindow.webContents.send('menu-save-as-document');
          }
        },
        { type: 'separator' },
        {
          label: 'Export',
          submenu: [
            {
              label: 'Export as PDF',
              click: () => {
                mainWindow.webContents.send('menu-export-pdf');
              }
            },
            {
              label: 'Export as HTML',
              click: () => {
                mainWindow.webContents.send('menu-export-html');
              }
            }
          ]
        },
        { type: 'separator' },
        isMac ? { role: 'close' } : { role: 'quit' }
      ]
    },
    
    // Edit menu
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'delete' },
        { type: 'separator' },
        {
          label: 'Find',
          accelerator: 'CmdOrCtrl+F',
          click: () => {
            mainWindow.webContents.send('menu-find');
          }
        },
        {
          label: 'Replace',
          accelerator: 'CmdOrCtrl+H',
          click: () => {
            mainWindow.webContents.send('menu-replace');
          }
        },
        { type: 'separator' },
        { role: 'selectAll' }
      ]
    },
    
    // View menu
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' },
        { type: 'separator' },
        {
          label: 'Toggle Left Panel',
          accelerator: 'CmdOrCtrl+B',
          click: () => {
            mainWindow.webContents.send('menu-toggle-left-panel');
          }
        },
        {
          label: 'Toggle Right Panel',
          accelerator: 'CmdOrCtrl+J',
          click: () => {
            mainWindow.webContents.send('menu-toggle-right-panel');
          }
        },
        { type: 'separator' },
        {
          label: 'Toggle Dark Mode',
          accelerator: 'CmdOrCtrl+Shift+D',
          click: () => {
            mainWindow.webContents.send('menu-toggle-dark-mode');
          }
        }
      ]
    },
    
    // Help menu
    {
      role: 'help',
      submenu: [
        {
          label: 'Learn More',
          click: async () => {
            await shell.openExternal('https://github.com/your-username/writing-app');
          }
        },
        {
          label: 'About',
          click: () => {
            dialog.showMessageBox(mainWindow, {
              title: 'About Writing App',
              message: 'Writing App',
              detail: `Version: ${app.getVersion()}\nElectron: ${process.versions.electron}\nChrome: ${process.versions.chrome}\nNode.js: ${process.versions.node}`
            });
          }
        }
      ]
    }
  ];
  
  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

// IPC handlers for file operations
ipcMain.handle('open-file-dialog', async () => {
  const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
    title: 'Open Document',
    filters: [
      { name: 'Markdown Files', extensions: ['md', 'markdown'] },
      { name: 'All Files', extensions: ['*'] }
    ],
    properties: ['openFile']
  });

  if (!canceled && filePaths.length > 0) {
    try {
      const filePath = filePaths[0];
      const content = fs.readFileSync(filePath, 'utf8');
      return {
        path: filePath,
        name: path.basename(filePath),
        content
      };
    } catch (error) {
      console.error('Error reading file:', error);
      return null;
    }
  }
  return null;
});

ipcMain.handle('open-folder-dialog', async () => {
  const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
    title: 'Open Folder',
    properties: ['openDirectory']
  });

  if (!canceled && filePaths.length > 0) {
    try {
      const folderPath = filePaths[0];
      
      // Read all markdown files in the folder
      const files = fs.readdirSync(folderPath)
        .filter(file => file.endsWith('.md') || file.endsWith('.markdown'))
        .map(file => {
          const filePath = path.join(folderPath, file);
          return {
            path: filePath,
            name: file,
            content: fs.readFileSync(filePath, 'utf8')
          };
        });
      
      return {
        path: folderPath,
        files
      };
    } catch (error) {
      console.error('Error reading folder:', error);
      return null;
    }
  }
  return null;
});

ipcMain.handle('save-file-dialog', async (event, { content, defaultPath, name }) => {
  if (!defaultPath) {
    // If no path is provided, show save dialog
    const { canceled, filePath } = await dialog.showSaveDialog(mainWindow, {
      title: 'Save Document',
      defaultPath: name || 'untitled.md',
      filters: [
        { name: 'Markdown Files', extensions: ['md'] },
        { name: 'All Files', extensions: ['*'] }
      ]
    });

    if (canceled) {
      return null;
    }
    
    defaultPath = filePath;
  }

  try {
    fs.writeFileSync(defaultPath, content, 'utf8');
    return {
      path: defaultPath,
      name: path.basename(defaultPath)
    };
  } catch (error) {
    console.error('Error saving file:', error);
    return null;
  }
});

// Export document
ipcMain.handle('export-document', async (event, { content, format, name }) => {
  const { canceled, filePath } = await dialog.showSaveDialog(mainWindow, {
    title: `Export as ${format.toUpperCase()}`,
    defaultPath: name ? name.replace(/\.[^/.]+$/, '') + '.' + format.toLowerCase() : `untitled.${format.toLowerCase()}`,
    filters: [
      { name: `${format.toUpperCase()} Files`, extensions: [format.toLowerCase()] },
      { name: 'All Files', extensions: ['*'] }
    ]
  });

  if (canceled) {
    return null;
  }

  try {
    // For PDF, use Electron's PDF generation
    if (format.toLowerCase() === 'pdf') {
      const pdfData = await mainWindow.webContents.printToPDF({
        marginsType: 0,
        printBackground: true,
        printSelectionOnly: false,
        landscape: false
      });

      fs.writeFileSync(filePath, pdfData);
    } else {
      // For other formats, just write the content directly
      fs.writeFileSync(filePath, content, 'utf8');
    }

    return {
      path: filePath,
      name: path.basename(filePath)
    };
  } catch (error) {
    console.error(`Error exporting as ${format}:`, error);
    return null;
  }
});

// App event handlers
app.on('ready', createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});

// Handle file associations (macOS)
app.on('open-file', (event, filePath) => {
  event.preventDefault();
  
  // If app is already running, open the file
  if (mainWindow) {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      mainWindow.webContents.send('file-opened', {
        path: filePath,
        name: path.basename(filePath),
        content
      });
    } catch (error) {
      console.error('Error opening file:', error);
    }
  } else {
    // Store the file path for later when the window is created
    global.fileToOpen = filePath;
  }
}); 