"use strict";
/**
 * Electron Main Process
 *
 * Starts the backend Express/Socket.IO server and opens
 * a BrowserWindow pointing to it.
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
const path_1 = __importDefault(require("path"));
// The backend port — matches the default in backend/config/env.ts
const PORT = parseInt(process.env.PORT || '8081', 10);
const SERVER_URL = `http://localhost:${PORT}`;
let mainWindow = null;
/**
 * Boot the backend server by requiring the compiled main.js bundle.
 * The bundle starts Express + Socket.IO and begins listening.
 */
function startBackendServer() {
    // Point static files to the bundled public-react inside the app
    const staticPath = path_1.default.join(__dirname, '../public-react');
    process.env.STATIC_FILES_PATH = staticPath;
    // Import the compiled backend entry point — this starts the server
    require('../dist/main');
}
/**
 * Create the main application window.
 */
function createWindow() {
    mainWindow = new electron_1.BrowserWindow({
        width: 1280,
        height: 800,
        minWidth: 800,
        minHeight: 600,
        title: 'TikTok LIVE Chat Reader',
        icon: path_1.default.join(__dirname, '../public-react/favicon.ico'),
        webPreferences: {
            preload: path_1.default.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false,
        },
    });
    // Load the backend server URL
    mainWindow.loadURL(SERVER_URL);
    // Handle new window requests (e.g., pop-out pages, external links)
    mainWindow.webContents.setWindowOpenHandler(({ url, features }) => {
        // Local URLs (same server) → open in a new Electron window
        if (url.startsWith(SERVER_URL) || url.startsWith('/')) {
            // Parse window features (width, height, left, top) from the window.open() call
            const parseFeature = (name) => {
                const match = features.match(new RegExp(`${name}=(\\d+)`));
                return match ? parseInt(match[1], 10) : undefined;
            };
            return {
                action: 'allow',
                overrideBrowserWindowOptions: {
                    width: parseFeature('width') || 800,
                    height: parseFeature('height') || 600,
                    x: parseFeature('left'),
                    y: parseFeature('top'),
                    title: 'TikTok LIVE Chat Reader',
                    icon: path_1.default.join(__dirname, '../public-react/favicon.ico'),
                    webPreferences: {
                        preload: path_1.default.join(__dirname, 'preload.js'),
                        contextIsolation: true,
                        nodeIntegration: false,
                    },
                },
            };
        }
        // External URLs → open in the default browser
        if (url.startsWith('http')) {
            electron_1.shell.openExternal(url);
        }
        return { action: 'deny' };
    });
    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}
/**
 * Wait for the backend server to be ready before opening the window.
 */
async function waitForServer(url, retries = 30, delay = 500) {
    for (let i = 0; i < retries; i++) {
        try {
            const http = await Promise.resolve().then(() => __importStar(require('http')));
            await new Promise((resolve, reject) => {
                const req = http.get(url, (res) => {
                    res.resume();
                    if (res.statusCode && res.statusCode < 400) {
                        resolve();
                    }
                    else {
                        reject(new Error(`Status ${res.statusCode}`));
                    }
                });
                req.on('error', reject);
                req.setTimeout(1000, () => {
                    req.destroy();
                    reject(new Error('timeout'));
                });
            });
            return; // Server is ready
        }
        catch {
            await new Promise((r) => setTimeout(r, delay));
        }
    }
    throw new Error(`Backend server did not start within ${retries * delay}ms`);
}
// ─── App Lifecycle ───────────────────────────────────────────────────
electron_1.app.whenReady().then(async () => {
    // Start the backend first
    startBackendServer();
    // Wait until the server responds
    await waitForServer(SERVER_URL);
    // Now open the window
    createWindow();
    electron_1.app.on('activate', () => {
        // macOS: re-create window when dock icon is clicked
        if (electron_1.BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});
electron_1.app.on('window-all-closed', () => {
    // On macOS, apps typically stay active until Cmd+Q
    if (process.platform !== 'darwin') {
        electron_1.app.quit();
    }
});
//# sourceMappingURL=main.js.map