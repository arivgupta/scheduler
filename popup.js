// popup.js - main UI logic for Notes Scheduler
const STORAGE = {
  saved: 'savedNotes',
  scheduled: 'scheduledNotes',
  delivered: 'deliveredNotes',
  settings: 'extensionSettings'
};

// Auto-save timer
let autoSaveTimer = null;
const AUTO_SAVE_DELAY = 2000; // 2 seconds

// Initialize settings
const DEFAULT_SETTINGS = {
  autoSave: true,
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
};

// Helper functions
function getStorage(key) {
  return new Promise(res =>
    chrome.storage.local.get(key, obj => res(obj[key] || []))
  );
}

function setStorage(key, val) {
  return new Promise(res => chrome.storage.local.set({[key]: val}, res));
}

function updateStatusBar(message, type = 'info') {
  const statusBar = document.querySelector('.status-bar');
  statusBar.classList.remove('success', 'error');
  if (type !== 'info') statusBar.classList.add(type);
  statusBar.querySelector('.last-saved span').textContent = message;
}

function setLoading(element, isLoading) {
  if (isLoading) {
    element.classList.add('loading');
    element.disabled = true;
  } else {
    element.classList.remove('loading');
    element.disabled = false;
  }
}

// Tab management
function switchTab(tabName) {
  // Update tab buttons
  document.querySelectorAll('.tab-button').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === tabName);
  });
  
  // Update tab content
  document.querySelectorAll('.tab-content').forEach(content => {
    content.classList.toggle('active', content.id === `${tabName}-tab`);
  });
}

// Note rendering
function renderNoteList(listId, notes, actions) {
  const ul = document.getElementById(listId);
  ul.innerHTML = '';
  
  notes.forEach(note => {
    const li = document.createElement('li');
    const title = note.content.split('\n')[0].slice(0, 50) || 'Untitled';
    li.innerHTML = `
      <div class="note-content">
        <div class="note-title">${title}</div>
        ${note.time ? `<div class="note-time">${new Date(note.time).toLocaleString()}</div>` : ''}
      </div>
      <div class="note-actions"></div>
    `;
    const actionsDiv = li.querySelector('.note-actions');
    actions.forEach(action => {
      const btn = document.createElement('button');
      btn.className = action.class;
      btn.innerHTML = `<i class="fas fa-${action.icon}"></i> ${action.text}`;
      btn.onclick = () => action.handler(note);
      actionsDiv.appendChild(btn);
    });
    ul.append(li);
  });
}

// Initialize settings
async function initializeSettings() {
  const settings = await getStorage(STORAGE.settings) || DEFAULT_SETTINGS;
  await setStorage(STORAGE.settings, settings);
  
  // Update UI based on settings
  document.querySelector('.auto-save-status span').textContent = settings.autoSave ? 'On' : 'Off';
  document.querySelector('.timezone-info').textContent = settings.timezone;
}

// Auto-save functionality
function setupAutoSave() {
  const editor = document.getElementById('editor');
  editor.addEventListener('input', () => {
    if (autoSaveTimer) clearTimeout(autoSaveTimer);
    autoSaveTimer = setTimeout(async () => {
      const content = editor.innerText.trim();
      if (!content) return;
      
      const settings = await getStorage(STORAGE.settings);
      if (!settings.autoSave) return;
      
      const draft = {id: Date.now().toString(), content};
      const drafts = await getStorage(STORAGE.saved);
      drafts.push(draft);
      await setStorage(STORAGE.saved, drafts);
      updateStatusBar('Draft auto-saved', 'success');
    }, AUTO_SAVE_DELAY);
  });
}

// Toast notification
function showToast(message, type = 'info') {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.className = 'toast show';
  if (type === 'success') toast.style.background = 'var(--success-color)';
  else if (type === 'error') toast.style.background = 'var(--danger-color)';
  else toast.style.background = 'var(--primary-color)';
  setTimeout(() => { toast.className = 'toast'; }, 2500);
}

// Modal logic (extended for image drag/drop, preview, validation)
function showModal({title, label, placeholder, onOk, type = 'text'}) {
  const modal = document.getElementById('custom-modal');
  const modalTitle = document.getElementById('modal-title');
  const modalLabel = document.getElementById('modal-label');
  const modalInput = document.getElementById('modal-input');
  const okBtn = document.getElementById('modal-ok');
  const cancelBtn = document.getElementById('modal-cancel');
  const closeBtn = document.getElementById('modal-close');
  const dropArea = document.getElementById('image-drop-area');
  const imgPreview = document.getElementById('image-preview');

  modalTitle.textContent = title;
  modalLabel.textContent = label;
  modalInput.value = '';
  modalInput.placeholder = placeholder || '';
  modalInput.type = 'text';
  okBtn.disabled = true;
  imgPreview.style.display = 'none';
  dropArea.style.display = (type === 'image') ? 'block' : 'none';
  dropArea.classList.remove('dragover');
  let imageData = null;

  function validateInput(val) {
    if (type === 'link') {
      try {
        const u = new URL(val);
        return u.protocol === 'http:' || u.protocol === 'https:';
      } catch { return false; }
    }
    if (type === 'image') {
      return !!val || !!imageData;
    }
    return !!val;
  }

  function updateOkState() {
    okBtn.disabled = !validateInput(modalInput.value);
  }

  modalInput.oninput = updateOkState;

  // Drag & drop for images
  if (type === 'image') {
    dropArea.onclick = () => {
      const fileInput = document.createElement('input');
      fileInput.type = 'file';
      fileInput.accept = 'image/*';
      fileInput.onchange = (e) => {
        const file = e.target.files[0];
        if (file) handleImageFile(file);
      };
      fileInput.click();
    };
    dropArea.ondragover = (e) => {
      e.preventDefault();
      dropArea.classList.add('dragover');
    };
    dropArea.ondragleave = () => dropArea.classList.remove('dragover');
    dropArea.ondrop = (e) => {
      e.preventDefault();
      dropArea.classList.remove('dragover');
      const file = e.dataTransfer.files[0];
      if (file) handleImageFile(file);
    };
  }

  function handleImageFile(file) {
    if (!file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      imageData = e.target.result;
      imgPreview.src = imageData;
      imgPreview.style.display = 'block';
      modalInput.value = '';
      okBtn.disabled = false;
    };
    reader.readAsDataURL(file);
  }

  modal.style.display = 'flex';
  modalInput.focus();

  function cleanup() {
    modal.style.display = 'none';
    okBtn.onclick = null;
    cancelBtn.onclick = null;
    closeBtn.onclick = null;
    modalInput.onkeydown = null;
    modalInput.oninput = null;
    if (type === 'image') {
      dropArea.onclick = null;
      dropArea.ondragover = null;
      dropArea.ondragleave = null;
      dropArea.ondrop = null;
    }
  }

  okBtn.onclick = () => {
    if (type === 'image' && imageData) {
      onOk(imageData);
    } else {
      onOk(modalInput.value);
    }
    cleanup();
  };
  cancelBtn.onclick = cleanup;
  closeBtn.onclick = cleanup;
  modalInput.onkeydown = (e) => {
    if (e.key === 'Enter' && !okBtn.disabled) {
      if (type === 'image' && imageData) {
        onOk(imageData);
      } else {
        onOk(modalInput.value);
      }
      cleanup();
    } else if (e.key === 'Escape') {
      cleanup();
    }
  };
  updateOkState();
}

function setThemeIcon() {
  const html = document.documentElement;
  const moon = document.querySelector('.theme-toggle .fa-moon');
  const sun = document.querySelector('.theme-toggle .fa-sun');
  if (html.getAttribute('data-theme') === 'dark') {
    moon.style.display = '';
    sun.style.display = 'none';
  } else {
    moon.style.display = 'none';
    sun.style.display = '';
  }
}

// Initialize the popup
document.addEventListener('DOMContentLoaded', async () => {
  const editor = document.getElementById('editor');
  
  // Initialize settings
  await initializeSettings();
  
  // Setup auto-save
  setupAutoSave();
  
  // Tab switching
  document.querySelectorAll('.tab-button').forEach(btn => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab));
  });
  
  // Toolbar actions
  document.getElementById('bold').onclick = () => document.execCommand('bold');
  document.getElementById('italic').onclick = () => document.execCommand('italic');
  document.getElementById('link').onclick = () => {
    showModal({
      title: 'Insert Link',
      label: 'Enter URL',
      placeholder: 'https://...',
      onOk: (url) => {
        if (url) document.execCommand('createLink', false, url);
        showToast('Link inserted', 'success');
      },
      type: 'link'
    });
  };
  document.getElementById('image').onclick = () => {
    showModal({
      title: 'Insert Image',
      label: 'Paste image URL or drag & drop',
      placeholder: 'https://...',
      onOk: (imgSrc) => {
        if (imgSrc) {
          const img = document.createElement('img');
          img.src = imgSrc;
          img.style.maxWidth = '100%';
          img.style.borderRadius = '6px';
          editor.appendChild(img);
          showToast('Image inserted', 'success');
        }
      },
      type: 'image'
    });
  };
  document.getElementById('undo').onclick = () => document.execCommand('undo');
  document.getElementById('redo').onclick = () => document.execCommand('redo');
  document.getElementById('clear').onclick = () => { editor.innerText = ''; };
  
  // Post now
  document.getElementById('post').onclick = async () => {
    const content = editor.innerText.trim();
    if (!content) {
      updateStatusBar('Note is empty', 'error');
      return;
    }
    
    const button = document.getElementById('post');
    setLoading(button, true);
    
    try {
      const [tab] = await chrome.tabs.query({active: true, currentWindow: true});
      await chrome.tabs.sendMessage(tab.id, {action: 'postNote', note: {content}});
      updateStatusBar('Note posted successfully', 'success');
      editor.innerText = '';
    } catch (error) {
      updateStatusBar('Failed to post note', 'error');
      console.error('Posting failed:', error);
    } finally {
      setLoading(button, false);
    }
  };
  
  // Save draft
  document.getElementById('save').onclick = async () => {
    const content = editor.innerText.trim();
    if (!content) {
      updateStatusBar('Note is empty', 'error');
      return;
    }
    
    const button = document.getElementById('save');
    setLoading(button, true);
    
    try {
      const draft = {id: Date.now().toString(), content};
      const drafts = await getStorage(STORAGE.saved);
      drafts.push(draft);
      await setStorage(STORAGE.saved, drafts);
      updateStatusBar('Draft saved', 'success');
      renderList();
    } catch (error) {
      updateStatusBar('Failed to save draft', 'error');
      console.error('Saving failed:', error);
    } finally {
      setLoading(button, false);
    }
  };
  
  // Schedule note
  document.getElementById('add-schedule').onclick = async () => {
    const content = editor.innerText.trim();
    const timeInput = document.getElementById('scheduleTime').value;
    
    if (!content || !timeInput) {
      updateStatusBar('Content and time are required', 'error');
      return;
    }
    
    const button = document.getElementById('add-schedule');
    setLoading(button, true);
    
    try {
      const note = {
        id: Date.now().toString(),
        content,
        time: new Date(timeInput).toISOString()
      };
      
      const notes = await getStorage(STORAGE.scheduled);
      notes.push(note);
      await setStorage(STORAGE.scheduled, notes);
      updateStatusBar('Note scheduled', 'success');
      editor.innerText = '';
      renderList();
    } catch (error) {
      updateStatusBar('Failed to schedule note', 'error');
      console.error('Scheduling failed:', error);
    } finally {
      setLoading(button, false);
    }
  };
  
  // Settings button
  document.getElementById('settings').onclick = () => {
    chrome.runtime.openOptionsPage();
  };
  
  // Font size adjuster
  document.querySelectorAll('.font-size-btn').forEach(btn => {
    btn.onclick = () => {
      document.querySelectorAll('.font-size-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      editor.style.fontSize = btn.dataset.size + 'px';
    };
  });

  // Theme toggle
  document.getElementById('theme-toggle').onclick = () => {
    const html = document.documentElement;
    if (html.getAttribute('data-theme') === 'dark') {
      html.removeAttribute('data-theme');
      showToast('Light mode', 'info');
    } else {
      html.setAttribute('data-theme', 'dark');
      showToast('Dark mode', 'info');
    }
    setThemeIcon();
  };

  // Word/char count
  function updateCounts() {
    const text = editor.innerText;
    const words = text.trim().split(/\s+/).filter(Boolean).length;
    const chars = text.length;
    document.getElementById('word-count').textContent = `${words} word${words !== 1 ? 's' : ''}`;
    document.getElementById('char-count').textContent = `${chars} char${chars !== 1 ? 's' : ''}`;
  }
  editor.addEventListener('input', updateCounts);
  updateCounts();
  
  // Initial render
  renderList();
  setThemeIcon();
});

// Render all lists
async function renderList() {
  const [drafts, scheduled, delivered] = await Promise.all([
    getStorage(STORAGE.saved),
    getStorage(STORAGE.scheduled),
    getStorage(STORAGE.delivered)
  ]);
  
  renderNoteList('saved-list', drafts, [
    {
      class: 'secondary-button',
      icon: 'edit',
      text: 'Edit',
      handler: (note) => {
        document.getElementById('editor').innerText = note.content;
      }
    },
    {
      class: 'danger-button',
      icon: 'trash',
      text: 'Delete',
      handler: (note) => {
        setStorage(STORAGE.saved, drafts.filter(n => n.id !== note.id)).then(renderList);
      }
    }
  ]);
  
  renderNoteList('scheduled-list', scheduled, [
    {
      class: 'danger-button',
      icon: 'times',
      text: 'Cancel',
      handler: (note) => {
        setStorage(STORAGE.scheduled, scheduled.filter(n => n.id !== note.id)).then(renderList);
      }
    }
  ]);
  
  renderNoteList('delivered-list', delivered, [
    {
      class: 'secondary-button',
      icon: 'eye',
      text: 'View',
      handler: () => {
        window.open('https://substack.com/notes', '_blank');
      }
    }
  ]);
}