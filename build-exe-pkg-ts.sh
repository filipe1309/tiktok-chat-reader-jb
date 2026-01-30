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

# Step 4: Copy public-react files to dist
echo "📁 Copying public-react files..."
cp -r public-react dist/

# Step 5: Create a bundled server file with embedded static files
echo "📦 Embedding static files..."
node -e "
const fs = require('fs');
const path = require('path');

// Read the compiled server file
let serverCode = fs.readFileSync('dist/main.js', 'utf8');

// Function to recursively read all files in a directory
function readFilesRecursively(dir, basePath = '') {
  const files = {};
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    // Normalize path separators to forward slashes for cross-platform compatibility
    const relativePath = (basePath ? path.join(basePath, entry.name) : entry.name).replace(/\\\\/g, '/');
    
    if (entry.isDirectory()) {
      Object.assign(files, readFilesRecursively(fullPath, relativePath));
    } else {
      // Read binary files as base64, text files as utf8
      const ext = path.extname(entry.name).toLowerCase();
      const isBinary = ['.png', '.jpg', '.jpeg', '.gif', '.ico', '.woff', '.woff2', '.ttf', '.eot', '.svg'].includes(ext);
      
      if (isBinary) {
        files[relativePath] = { content: fs.readFileSync(fullPath).toString('base64'), binary: true };
      } else {
        files[relativePath] = { content: fs.readFileSync(fullPath, 'utf8'), binary: false };
      }
    }
  }
  return files;
}

// Read all public-react files
const publicFiles = readFilesRecursively('public-react');

// Create embedded files code - assign to globalThis so it survives esbuild bundling
// and can be accessed at runtime by HttpSocketServer.ts via getEmbeddedFiles()
const embeddedFilesCode = \`
// Embedded static files for pkg build - assigned to globalThis for runtime access
globalThis.EMBEDDED_FILES = \${JSON.stringify(publicFiles, null, 2)};
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
