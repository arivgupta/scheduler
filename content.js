// content.js - injected into Substack Notes page to handle posting
// Handle scheduling or immediate posting by calling Substack's Notes API directly
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.action === 'postNote' && msg.note && msg.note.content) {
    const text = msg.note.content;
    // Build the API payload
    const payload = {
      bodyJson: {
        type: 'doc',
        attrs: { schemaVersion: 'v1' },
        content: [
          {
            type: 'paragraph',
            content: [{ type: 'text', text }]
          }
        ]
      },
      tabId: 'for-you',
      surface: 'feed',
      replyMinimumRole: 'everyone'
    };
    // Call the Substack Notes API
    fetch('https://substack.com/api/v1/comment/feed', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
      .then(response => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.json();
      })
      .then(data => sendResponse({ success: true, data }))
      .catch(err => sendResponse({ success: false, error: err.message }));
  }
  // Keep the message channel open for async response
  return true;
});