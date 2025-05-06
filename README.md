# Substack Notes Scheduler Chrome Extension

This Chrome extension lets you schedule your Substack Notes posts directly from the browser.  It supports:

- Writing and formatting notes (bold, italic, links, images)
- Saving drafts
- Scheduling posts for a future date/time
- Automatic posting at scheduled time (requires an open tab)
- Customizable options (time zone override, auto-save)

## Installation (Developer Mode)
1. Clone or download this repository.
2. Open Chrome and navigate to `chrome://extensions/`.
3. Enable **Developer mode**.
4. Click **Load unpacked** and select this project folder.
5. Pin the extension icon in the toolbar.

## Usage
1. Navigate to your Substack Notes page: `https://yourname.substack.com/notes`.
2. Click the extension icon to open the popup.
3. Write your note in the editor.
4. Use the toolbar to format text or insert links/images.
5. To post immediately, click **Post Now**.
6. To save a draft, click **Save Draft** and manage drafts in the list.
7. To schedule, pick a date/time and click **Add to Schedule**.
8. Keep the notes page tab open; the extension will post at the scheduled time.

## Settings
Click the gear icon in the popup (or open the **Options** page) to adjust:
- Time Zone Override
- Auto-Save behavior

## Development
- Popup: `popup.html`, `popup.js`, `popup.css`
- Background scheduler: `background.js`
- Content script (posting): `content.js`
- Options page: `options.html`, `options.js`, `options.css`

## TODO / Customization
- Improve CSS for a prettier UI
- Refine content script selectors to match Substack changes
- Add template/YAML import feature
- Fetch delivered notes metrics via API or page scraping

Feel free to customize and contribute!