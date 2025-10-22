Assets for the Electron main process (window/tray icons, etc.).

Recommended formats:
- Windows: .ico or .png for BrowserWindow icon.
- macOS: .icns, .png.

Place files here and reference with:

const path = require('path');
const iconPath = path.join(__dirname, 'assets', 'app-icon.png');
// new BrowserWindow({ icon: iconPath });