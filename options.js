// options.js - settings management
const STORAGE = {
  settings: 'extensionSettings',
  saved: 'savedNotes',
  scheduled: 'scheduledNotes',
  delivered: 'deliveredNotes'
};

// Default settings
const DEFAULT_SETTINGS = {
  autoSave: true
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

function updateStatus(message, type = 'info') {
  const status = document.getElementById('status');
  status.textContent = message;
  status.className = `status-message ${type}`;
  setTimeout(() => {
    status.textContent = '';
    status.className = 'status-message';
  }, 3000);
}

// Initialize settings
async function initializeSettings() {
  const settings = await getStorage(STORAGE.settings) || DEFAULT_SETTINGS;
  document.getElementById('autoSave').checked = settings.autoSave;
  if (!(await getStorage(STORAGE.settings))) {
    await setStorage(STORAGE.settings, settings);
  }
}

// Save settings
async function saveSettings() {
  const settings = {
    autoSave: document.getElementById('autoSave').checked
  };
  await setStorage(STORAGE.settings, settings);
  updateStatus('Settings saved', 'success');
}

// Export data
async function exportData() {
  const [settings, saved, scheduled, delivered] = await Promise.all([
    getStorage(STORAGE.settings),
    getStorage(STORAGE.saved),
    getStorage(STORAGE.scheduled),
    getStorage(STORAGE.delivered)
  ]);
  
  const data = {
    settings,
    saved,
    scheduled,
    delivered,
    exportedAt: new Date().toISOString()
  };
  
  const blob = new Blob([JSON.stringify(data, null, 2)], {type: 'application/json'});
  const url = URL.createObjectURL(blob);
  
  const a = document.createElement('a');
  a.href = url;
  a.download = `substack-notes-backup-${new Date().toISOString().split('T')[0]}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  
  updateStatus('Data exported successfully', 'success');
}

// Import data
async function importData(file) {
  try {
    const text = await file.text();
    const data = JSON.parse(text);
    
    // Validate data structure
    if (!data.settings || !data.saved || !data.scheduled || !data.delivered) {
      throw new Error('Invalid backup file format');
    }
    
    // Import data
    await Promise.all([
      setStorage(STORAGE.settings, data.settings),
      setStorage(STORAGE.saved, data.saved),
      setStorage(STORAGE.scheduled, data.scheduled),
      setStorage(STORAGE.delivered, data.delivered)
    ]);
    
    // Reload settings
    await initializeSettings();
    updateStatus('Data imported successfully', 'success');
  } catch (error) {
    updateStatus('Failed to import data: ' + error.message, 'error');
  }
}

// Clear all data
async function clearData() {
  if (!confirm('Are you sure you want to clear all data? This cannot be undone.')) {
    return;
  }
  
  try {
    await Promise.all([
      setStorage(STORAGE.settings, DEFAULT_SETTINGS),
      setStorage(STORAGE.saved, []),
      setStorage(STORAGE.scheduled, []),
      setStorage(STORAGE.delivered, [])
    ]);
    
    await initializeSettings();
    updateStatus('All data cleared', 'success');
  } catch (error) {
    updateStatus('Failed to clear data', 'error');
  }
}

// Initialize the options page
document.addEventListener('DOMContentLoaded', async () => {
  // Initialize settings
  await initializeSettings();
  
  // Back button
  document.getElementById('back').onclick = () => {
    window.close();
  };
  
  // Auto-save toggle
  document.getElementById('autoSave').onchange = saveSettings;
  
  // Export button
  document.getElementById('export').onclick = exportData;
  
  // Import file input
  document.getElementById('import').onchange = (e) => {
    if (e.target.files.length > 0) {
      importData(e.target.files[0]);
      e.target.value = ''; // Reset input
    }
  };
  
  // Clear data button
  document.getElementById('clearData').onclick = clearData;
});