// FILE: renderer.js
document.addEventListener('DOMContentLoaded', () => {
  // DOM Elements
  const foldersList = document.getElementById('folders-list');
  const newFolderInput = document.getElementById('new-folder-input');
  const addFolderBtn = document.getElementById('add-folder-btn');
  const currentFolderHeader = document.getElementById('current-folder');
  const notesList = document.getElementById('notes-list');
  const newNoteBtn = document.getElementById('new-note-btn');
  const noteTitle = document.getElementById('note-title');
  const noteContent = document.getElementById('note-content');
  const saveNoteBtn = document.getElementById('save-note-btn');
  const deleteNoteBtn = document.getElementById('delete-note-btn');
  const statusMessage = document.getElementById('status-message');
  
  // State
  let folders = [];
  let notes = [];
  let currentFolder = 'General';
  let currentNote = null;
  let unsavedChanges = false;
  
  // Initialize
  init();
  
  async function init() {
    await loadFolders();
    await loadNotes(currentFolder);
    setupEventListeners();
  }
  
  // Folders
  async function loadFolders() {
    try {
      folders = await window.api.getFolders();
      renderFolders();
    } catch (error) {
      showStatus('Failed to load folders', 'error');
    }
  }
  
  function renderFolders() {
    foldersList.innerHTML = '';
    
    folders.forEach(folder => {
      const folderElement = document.createElement('div');
      folderElement.className = `folder ${folder === currentFolder ? 'active' : ''}`;
      folderElement.dataset.folder = folder;
      
      const folderName = document.createElement('span');
      folderName.textContent = folder;
      folderElement.appendChild(folderName);
      
      if (folder !== 'General') {
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'delete-btn';
        deleteBtn.textContent = '×';
        deleteBtn.dataset.folder = folder;
        folderElement.appendChild(deleteBtn);
      }
      
      foldersList.appendChild(folderElement);
    });
  }
  
  async function createFolder(folderName) {
    try {
      const result = await window.api.createFolder(folderName);
      if (result.success) {
        await loadFolders();
        showStatus(`Folder '${folderName}' created`);
      } else {
        showStatus(result.message, 'error');
      }
    } catch (error) {
      showStatus('Failed to create folder', 'error');
    }
  }
  
  async function deleteFolder(folderName) {
    try {
      const result = await window.api.deleteFolder(folderName);
      if (result.success) {
        if (currentFolder === folderName) {
          currentFolder = 'General';
        }
        await loadFolders();
        await loadNotes(currentFolder);
        showStatus(`Folder '${folderName}' deleted`);
      } else {
        showStatus(result.message, 'error');
      }
    } catch (error) {
      showStatus('Failed to delete folder', 'error');
    }
  }
  
  // Notes
  async function loadNotes(folderName) {
    try {
      notes = await window.api.getNotes(folderName);
      currentFolder = folderName;
      currentFolderHeader.textContent = folderName;
      renderNotes();
    } catch (error) {
      showStatus('Failed to load notes', 'error');
    }
  }
  
  function renderNotes() {
    notesList.innerHTML = '';
    
    if (notes.length === 0) {
      const emptyMessage = document.createElement('div');
      emptyMessage.className = 'note-item';
      emptyMessage.textContent = 'No notes in this folder';
      notesList.appendChild(emptyMessage);
      return;
    }
    
    notes.forEach(note => {
      const noteElement = document.createElement('div');
      noteElement.className = `note-item ${currentNote?.id === note.id ? 'active' : ''}`;
      noteElement.dataset.id = note.id;
      
      const title = document.createElement('div');
      title.className = 'note-title';
      title.textContent = note.title || 'Untitled';
      
      const preview = document.createElement('div');
      preview.className = 'note-preview';
      preview.textContent = note.preview || '';
      
      const date = document.createElement('div');
      date.className = 'note-date';
      date.textContent = formatDate(note.updatedAt);
      
      noteElement.appendChild(title);
      noteElement.appendChild(preview);
      noteElement.appendChild(date);
      
      notesList.appendChild(noteElement);
    });
  }
  
  async function loadNote(id) {
    if (unsavedChanges) {
      const confirm = window.confirm('You have unsaved changes. Are you sure you want to discard them?');
      if (!confirm) return;
    }
    
    try {
      const note = await window.api.getNote({ folder: currentFolder, id });
      if (note) {
        currentNote = note;
        noteTitle.value = note.title || '';
        noteContent.value = note.content || '';
        unsavedChanges = false;
        
        // Update UI
        document.querySelectorAll('.note-item').forEach(el => {
          el.classList.remove('active');
          if (el.dataset.id === id) {
            el.classList.add('active');
          }
        });
      }
    } catch (error) {
      showStatus('Failed to load note', 'error');
    }
  }
  
  async function saveNote() {
    const title = noteTitle.value.trim() || 'Untitled';
    const content = noteContent.value.trim();
    
    try {
      const note = currentNote || { title: '', content: '' };
      note.title = title;
      note.content = content;
      
      const result = await window.api.saveNote({
        folder: currentFolder,
        note
      });
      
      if (result.success) {
        currentNote = result.note;
        unsavedChanges = false;
        await loadNotes(currentFolder);
        showStatus('Note saved successfully');
      } else {
        showStatus(result.message, 'error');
      }
    } catch (error) {
      showStatus('Failed to save note', 'error');
    }
  }
  
  async function deleteNote() {
    if (!currentNote) return;
    
    const confirm = window.confirm('Are you sure you want to delete this note?');
    if (!confirm) return;
    
    try {
      const result = await window.api.deleteNote({
        folder: currentFolder,
        id: currentNote.id
      });
      
      if (result.success) {
        currentNote = null;
        noteTitle.value = '';
        noteContent.value = '';
        await loadNotes(currentFolder);
        showStatus('Note deleted successfully');
      } else {
        showStatus(result.message, 'error');
      }
    } catch (error) {
      showStatus('Failed to delete note', 'error');
    }
  }
  
  function createNewNote() {
    if (unsavedChanges) {
      const confirm = window.confirm('You have unsaved changes. Are you sure you want to discard them?');
      if (!confirm) return;
    }
    
    currentNote = null;
    noteTitle.value = '';
    noteContent.value = '';
    unsavedChanges = false;
    
    document.querySelectorAll('.note-item').forEach(el => {
      el.classList.remove('active');
    });
  }
  
  // Utility functions
  function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  
  function showStatus(message, type = 'success') {
    statusMessage.textContent = message;
    statusMessage.style.backgroundColor = type === 'error' ? '#d33' : 'rgba(0, 0, 0, 0.7)';
    statusMessage.classList.add('show');
    
    setTimeout(() => {
      statusMessage.classList.remove('show');
    }, 3000);
  }
  
  // Event Listeners
  function setupEventListeners() {
    // Folder events
    foldersList.addEventListener('click', (e) => {
      const folderEl = e.target.closest('.folder');
      const deleteBtn = e.target.closest('.delete-btn');
      
      if (deleteBtn) {
        deleteFolder(deleteBtn.dataset.folder);
        return;
      }
      
      if (folderEl) {
        const folderName = folderEl.dataset.folder;
        if (folderName !== currentFolder) {
          loadNotes(folderName);
        }
      }
    });
    
    addFolderBtn.addEventListener('click', () => {
      const folderName = newFolderInput.value.trim();
      if (folderName) {
        createFolder(folderName);
        newFolderInput.value = '';
      }
    });
    
    newFolderInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        const folderName = newFolderInput.value.trim();
        if (folderName) {
          createFolder(folderName);
          newFolderInput.value = '';
        }
      }
    });
    
    // Note events
    notesList.addEventListener('click', (e) => {
      const noteEl = e.target.closest('.note-item');
      if (noteEl && noteEl.dataset.id) {
        loadNote(noteEl.dataset.id);
      }
    });
    
    newNoteBtn.addEventListener('click', createNewNote);
    
    saveNoteBtn.addEventListener('click', saveNote);
    
    deleteNoteBtn.addEventListener('click', deleteNote);
    
    // Track unsaved changes
    noteTitle.addEventListener('input', () => {
      unsavedChanges = true;
    });
    
    noteContent.addEventListener('input', () => {
      unsavedChanges = true;
    });
    
    // Check for unsaved changes before closing
    window.onbeforeunload = () => {
      if (unsavedChanges) {
        return 'You have unsaved changes. Are you sure you want to leave?';
      }
    };
  }
});