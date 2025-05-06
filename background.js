// background.js - service worker for scheduling
const STORAGE_KEYS = {
  scheduled: 'scheduledNotes',
  delivered: 'deliveredNotes'
};

// Initialize alarms on startup
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.get(STORAGE_KEYS.scheduled, (res) => {
    const notes = res[STORAGE_KEYS.scheduled] || [];
    notes.forEach(scheduleNote);
  });
});

// Listen for storage changes to reschedule alarms
chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== 'local' || !changes[STORAGE_KEYS.scheduled]) return;
  const newNotes = changes[STORAGE_KEYS.scheduled].newValue || [];
  // Clear all alarms
  chrome.alarms.clearAll(() => {
    newNotes.forEach(scheduleNote);
  });
});

// Alarm handler: trigger posting
chrome.alarms.onAlarm.addListener((alarm) => {
  const noteId = alarm.name;
  chrome.storage.local.get(STORAGE_KEYS.scheduled, (res) => {
    const notes = res[STORAGE_KEYS.scheduled] || [];
    const note = notes.find(n => n.id === noteId);
    if (!note) return;
    // Call Substack API directly from background to post the note
    const payload = {
      bodyJson: {
        type: 'doc',
        attrs: { schemaVersion: 'v1' },
        content: [
          { type: 'paragraph', content: [{ type: 'text', text: note.content }] }
        ]
      },
      tabId: 'for-you',
      surface: 'feed',
      replyMinimumRole: 'everyone'
    };
    fetch('https://substack.com/api/v1/comment/feed', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
      .then(res => {
        if (!res.ok) throw new Error(`Status ${res.status}`);
        return res.json();
      })
      .then(data => {
        // Move note from scheduled to delivered
        chrome.storage.local.get([STORAGE_KEYS.scheduled, STORAGE_KEYS.delivered], (all) => {
          const scheduled = all[STORAGE_KEYS.scheduled] || [];
          const delivered = all[STORAGE_KEYS.delivered] || [];
          const remaining = scheduled.filter(n => n.id !== noteId);
          delivered.push({...note, postedAt: Date.now(), status: data});
          chrome.storage.local.set({
            [STORAGE_KEYS.scheduled]: remaining,
            [STORAGE_KEYS.delivered]: delivered
          });
        });
      })
      .catch(err => console.error('Scheduled post failed:', err));
  });
});

// Helper: schedule a note via chrome.alarms
function scheduleNote(note) {
  if (!note.id || !note.time) return;
  const when = new Date(note.time).getTime();
  if (when <= Date.now()) return;
  chrome.alarms.create(note.id, {when});
}