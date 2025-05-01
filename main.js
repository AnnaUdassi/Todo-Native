// FILE: main.js
const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');

let mainWindow;
const notesDir = path.join(app.getPath('userData'), 'notes');

// Ensure notes directory exists
function ensureNotesDirectory() {
  if (!fs.existsSync(notesDir)) {
    fs.mkdirSync(notesDir, { recursive: true });
  }
  
  // Make sure we have the folders directory
  const foldersPath = path.join(notesDir, 'folders');
  if (!fs.existsSync(foldersPath)) {
    fs.mkdirSync(foldersPath, { recursive: true });
    
    // Create default folder
    const defaultFolderPath = path.join(foldersPath, 'General');
    if (!fs.existsSync(defaultFolderPath)) {
      fs.mkdirSync(defaultFolderPath, { recursive: true });
    }
  }
}

function createWindow() {
  ensureNotesDirectory();
  
  mainWindow = new BrowserWindow({
    width: 900,
    height: 700,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  mainWindow.loadFile('index.html');
  // Open DevTools for debugging
  mainWindow.webContents.openDevTools();
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});

// Get all folders
ipcMain.handle('get-folders', async () => {
  const foldersPath = path.join(notesDir, 'folders');
  const folders = fs.readdirSync(foldersPath).filter(file => {
    return fs.statSync(path.join(foldersPath, file)).isDirectory();
  });
  return folders;
});

// Create a new folder
ipcMain.handle('create-folder', async (event, folderName) => {
  if (!folderName) return { success: false, message: 'Folder name is required' };
  
  const folderPath = path.join(notesDir, 'folders', folderName);
  if (fs.existsSync(folderPath)) {
    return { success: false, message: 'Folder already exists' };
  }
  
  try {
    fs.mkdirSync(folderPath, { recursive: true });
    return { success: true, folderName };
  } catch (error) {
    return { success: false, message: error.message };
  }
});

// Get notes from a folder
ipcMain.handle('get-notes', async (event, folderName) => {
  const folderPath = path.join(notesDir, 'folders', folderName || 'General');
  if (!fs.existsSync(folderPath)) {
    return [];
  }
  
  const notes = fs.readdirSync(folderPath)
    .filter(file => file.endsWith('.json'))
    .map(file => {
      const filePath = path.join(folderPath, file);
      try {
        const data = fs.readFileSync(filePath, 'utf8');
        const note = JSON.parse(data);
        return {
          id: note.id,
          title: note.title,
          preview: note.content.substring(0, 100) + (note.content.length > 100 ? '...' : ''),
          updatedAt: note.updatedAt
        };
      } catch (error) {
        return null;
      }
    })
    .filter(Boolean)
    .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
  
  return notes;
});

// Get a specific note
ipcMain.handle('get-note', async (event, { folder, id }) => {
  const folderPath = path.join(notesDir, 'folders', folder || 'General');
  const filePath = path.join(folderPath, `${id}.json`);
  
  if (!fs.existsSync(filePath)) {
    return null;
  }
  
  try {
    const data = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    return null;
  }
});

// Save a note
ipcMain.handle('save-note', async (event, { folder, note }) => {
  const folderPath = path.join(notesDir, 'folders', folder || 'General');
  if (!fs.existsSync(folderPath)) {
    fs.mkdirSync(folderPath, { recursive: true });
  }
  
  // Generate ID if it doesn't exist
  if (!note.id) {
    note.id = Date.now().toString();
  }
  
  // Update timestamp
  note.updatedAt = new Date().toISOString();
  if (!note.createdAt) {
    note.createdAt = note.updatedAt;
  }
  
  const filePath = path.join(folderPath, `${note.id}.json`);
  
  try {
    fs.writeFileSync(filePath, JSON.stringify(note, null, 2));
    return { success: true, note };
  } catch (error) {
    return { success: false, message: error.message };
  }
});

// Delete a note
ipcMain.handle('delete-note', async (event, { folder, id }) => {
  const folderPath = path.join(notesDir, 'folders', folder || 'General');
  const filePath = path.join(folderPath, `${id}.json`);
  
  if (!fs.existsSync(filePath)) {
    return { success: false, message: 'Note not found' };
  }
  
  try {
    fs.unlinkSync(filePath);
    return { success: true };
  } catch (error) {
    return { success: false, message: error.message };
  }
});

// Delete a folder
ipcMain.handle('delete-folder', async (event, folderName) => {
  if (folderName === 'General') {
    return { success: false, message: 'Cannot delete the General folder' };
  }
  
  const folderPath = path.join(notesDir, 'folders', folderName);
  if (!fs.existsSync(folderPath)) {
    return { success: false, message: 'Folder not found' };
  }
  
  try {
    fs.rmSync(folderPath, { recursive: true, force: true });
    return { success: true };
  } catch (error) {
    return { success: false, message: error.message };
  }
});