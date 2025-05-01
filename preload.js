// FILE: preload.js
const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('api', {
  // Folder operations
  getFolders: () => ipcRenderer.invoke('get-folders'),
  createFolder: (folderName) => ipcRenderer.invoke('create-folder', folderName),
  deleteFolder: (folderName) => ipcRenderer.invoke('delete-folder', folderName),
  
  // Note operations
  getNotes: (folderName) => ipcRenderer.invoke('get-notes', folderName),
  getNote: (params) => ipcRenderer.invoke('get-note', params),
  saveNote: (params) => ipcRenderer.invoke('save-note', params),
  deleteNote: (params) => ipcRenderer.invoke('delete-note', params)
});