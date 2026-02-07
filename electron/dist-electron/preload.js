"use strict";
/**
 * Electron Preload Script
 *
 * Runs in a sandboxed renderer context before the web page loads.
 * Currently minimal — extend as needed to expose safe APIs via contextBridge.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
// Expose a minimal API to the renderer for future use
electron_1.contextBridge.exposeInMainWorld('electronAPI', {
    platform: process.platform,
    isElectron: true,
});
//# sourceMappingURL=preload.js.map