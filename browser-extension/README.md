# Lex Session Capture - Browser Extension

Chrome extension to capture Lex Autolease session cookies and CSRF token for the Broker Platform.

## Installation

1. Open Chrome and go to `chrome://extensions/`
2. Enable "Developer mode" (toggle in top right)
3. Click "Load unpacked"
4. Select the `browser-extension` folder

## Setup Icons

Before loading, create PNG icons in the `icons` folder:
- `icon16.png` (16x16)
- `icon48.png` (48x48)
- `icon128.png` (128x128)

You can use the `icon.svg` as a template or any icon generator.

Quick way to generate icons (if you have ImageMagick installed):
```bash
cd icons
convert -background none -resize 16x16 icon.svg icon16.png
convert -background none -resize 48x48 icon.svg icon48.png
convert -background none -resize 128x128 icon.svg icon128.png
```

Or use an online SVG to PNG converter.

## Usage

1. **Log in to Lex Autolease** at https://associate.lexautolease.co.uk
2. **Click the extension icon** in Chrome toolbar
3. **Check the status** - all three indicators should be green:
   - Lex Portal: Connected
   - Cookies: Found
   - CSRF Token: Found
4. **Enter your Broker Platform URL** (e.g., `http://localhost:3000`)
5. **Click "Capture Session"**
6. Success! The session is now saved and you can run quotes

## How It Works

1. **Content Script** (`content.js`) - Runs on Lex pages to extract the CSRF token
2. **Background Worker** (`background.js`) - Accesses cookies via Chrome API
3. **Popup** (`popup.html/js`) - UI to check status and trigger capture

The extension:
- Reads cookies for `associate.lexautolease.co.uk`
- Extracts the CSRF token from the page
- Sends both to your Broker Platform's `/api/lex-autolease/session` endpoint
- Sessions are valid for ~8 hours

## Troubleshooting

### "Not on Lex portal"
- Navigate to https://associate.lexautolease.co.uk first

### "No cookies"
- Make sure you're logged in to Lex
- Try refreshing the page

### "CSRF Token not found"
- Refresh the Lex page
- Make sure you're on a page after login (not the login page)

### "Failed to save session"
- Check that your Broker Platform is running
- Verify the URL is correct
- Check browser console for errors

## Permissions

The extension requires:
- `cookies` - To read Lex session cookies
- `storage` - To save your Broker Platform URL
- `activeTab` - To check if you're on the Lex portal
- Host permissions for Lex and your Broker Platform domains
