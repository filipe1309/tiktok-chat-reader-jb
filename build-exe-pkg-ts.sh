#!/bin/bash

# Build cross-platform executables using pkg
# Can be run from macOS to build Windows, Linux, and macOS executables

set -e

echo "🔨 Building TikTok Chat Reader (TypeScript)..."

# Step 0: Clean previous build
echo "🧹 Cleaning previous build..."
rm -rf dist

# Step 1: Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Step 2: Compile TypeScript
echo "📝 Compiling TypeScript..."
npm run build

# Step 3: Install pkg if not already installed
if ! command -v pkg &> /dev/null; then
    echo "📦 Installing pkg..."
    npm install -g pkg
fi

# Step 4: Copy public files to dist
echo "📁 Copying public files..."
cp -r public dist/

# Step 5: Create a bundled server file with embedded static files
echo "📦 Embedding static files..."
node -e "
const fs = require('fs');
const path = require('path');

// Read the compiled server file
let serverCode = fs.readFileSync('dist/main.js', 'utf8');

// Read all public files
const publicFiles = {
  'index.html': fs.readFileSync('public/index.html', 'utf8'),
  'obs.html': fs.readFileSync('public/obs.html', 'utf8'),
  'poll.html': fs.readFileSync('public/poll.html', 'utf8'),
  'app.js': fs.readFileSync('public/app.js', 'utf8'),
  'connection.js': fs.readFileSync('public/connection.js', 'utf8'),
  'poll.js': fs.readFileSync('public/poll.js', 'utf8'),
  'style.css': fs.readFileSync('public/style.css', 'utf8'),
  'poll.css': fs.readFileSync('public/poll.css', 'utf8')
};

// Create embedded files code
const embeddedFilesCode = \`
// Embedded static files for pkg build
const EMBEDDED_FILES = \${JSON.stringify(publicFiles, null, 2)};

// Override static file serving for pkg
if (process.pkg) {
  const express = require('express');
  const app = require('./presentation/server/HttpSocketServer').HttpSocketServer.prototype;
  const originalSetupMiddleware = app.setupMiddleware;
  
  app.setupMiddleware = function() {
    this.app.get('/', (req, res) => res.type('html').send(EMBEDDED_FILES['index.html']));
    this.app.get('/index.html', (req, res) => res.type('html').send(EMBEDDED_FILES['index.html']));
    this.app.get('/obs.html', (req, res) => res.type('html').send(EMBEDDED_FILES['obs.html']));
    this.app.get('/poll.html', (req, res) => res.type('html').send(EMBEDDED_FILES['poll.html']));
    this.app.get('/app.js', (req, res) => res.type('js').send(EMBEDDED_FILES['app.js']));
    this.app.get('/connection.js', (req, res) => res.type('js').send(EMBEDDED_FILES['connection.js']));
    this.app.get('/poll.js', (req, res) => res.type('js').send(EMBEDDED_FILES['poll.js']));
    this.app.get('/style.css', (req, res) => res.type('css').send(EMBEDDED_FILES['style.css']));
    this.app.get('/poll.css', (req, res) => res.type('css').send(EMBEDDED_FILES['poll.css']));
  };
}
\`;

// Prepend embedded files to the main bundle
serverCode = embeddedFilesCode + '\\n\\n' + serverCode;

fs.writeFileSync('dist/server-embedded.js', serverCode);
console.log('Created dist/server-embedded.js with embedded files');
"

# Step 6: Bundle with esbuild
# Note: We bundle axios and other transitive dependencies to avoid pkg resolution issues
echo "📦 Bundling with esbuild..."
npx esbuild dist/server-embedded.js \
  --bundle \
  --platform=node \
  --target=node18 \
  --outfile=dist/server-bundled.js

# Step 7: Build executables
echo "🏗️  Building executables..."

# Windows
echo "  → Building for Windows (x64)..."
pkg dist/server-bundled.js \
  --targets node18-win-x64 \
  --output dist/tiktok-chat-reader-win.exe

# macOS
echo "  → Building for macOS (x64)..."
pkg dist/server-bundled.js \
  --targets node18-macos-x64 \
  --output dist/tiktok-chat-reader-macos

# Linux (optional)
# echo "  → Building for Linux (x64)..."
# pkg dist/server-bundled.js --targets node18-linux-x64 --output dist/tiktok-chat-reader-linux

echo ""
echo "✅ Done! Executables created in ./dist/"
echo "  - dist/tiktok-chat-reader-win.exe (Windows)"
echo "  - dist/tiktok-chat-reader-macos (macOS)"
echo ""
echo "✨ Public files are embedded directly in the executable!"
echo "⚠️  Note: You can optionally include a .env file for configuration"
echo ""
