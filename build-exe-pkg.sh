#!/bin/bash

# Build cross-platform executables using pkg
# Can be run from macOS to build Windows, Linux, and macOS executables

set -e

echo "🔨 Building cross-platform executables with pkg..."

# Install pkg if not already installed
if ! command -v pkg &> /dev/null; then
    echo "📦 Installing pkg..."
    npm install -g pkg
fi

# Create dist directory if it doesn't exist
mkdir -p dist

# Copy public files to dist so they can be bundled properly
echo "📁 Copying public files to dist..."
rm -rf dist/public
cp -r public dist/

# Copy required modules to dist for bundling
echo "📁 Copying required modules to dist..."
cp connectionWrapper.js dist/
cp limiter.js dist/

# Step 1: Create a server file with embedded static files
echo "📦 Step 1: Embedding static files..."
node -e "
const fs = require('fs');
const path = require('path');

// Read the original server file
let serverCode = fs.readFileSync('server-pkg.js', 'utf8');

// Read all public files
const publicFiles = {
  'index.html': fs.readFileSync('public/index.html', 'utf8'),
  'obs.html': fs.readFileSync('public/obs.html', 'utf8'),
  'app.js': fs.readFileSync('public/app.js', 'utf8'),
  'connection.js': fs.readFileSync('public/connection.js', 'utf8'),
  'style.css': fs.readFileSync('public/style.css', 'utf8')
};

// Create embedded files object as a string
const embeddedFilesCode = 'const EMBEDDED_FILES = ' + JSON.stringify(publicFiles, null, 2) + ';';

// Replace the pkg block with embedded version
const newPkgBlock = \`
// Serve frontend files
const fs = require('fs');

\${embeddedFilesCode}

// Check if running as pkg executable
if (process.pkg) {
  console.info('Running as pkg executable - serving embedded files');

  app.get('/', (req, res) => {
    res.type('html').send(EMBEDDED_FILES['index.html']);
  });

  app.get('/obs.html', (req, res) => {
    res.type('html').send(EMBEDDED_FILES['obs.html']);
  });

  app.get('/app.js', (req, res) => {
    res.type('js').send(EMBEDDED_FILES['app.js']);
  });

  app.get('/connection.js', (req, res) => {
    res.type('js').send(EMBEDDED_FILES['connection.js']);
  });

  app.get('/style.css', (req, res) => {
    res.type('css').send(EMBEDDED_FILES['style.css']);
  });
} else {
  // When running normally (development), serve from file system
  console.info('Running in development mode - serving files from file system');
  const publicPath = path.join(__dirname, 'public');
  app.use(express.static(publicPath));
}
\`;

// Find and replace the static file serving section
const startMarker = '// Serve frontend files';
const endMarker = '// Start http listener';

const startIndex = serverCode.indexOf(startMarker);
const endIndex = serverCode.indexOf(endMarker);

if (startIndex !== -1 && endIndex !== -1) {
  serverCode = serverCode.substring(0, startIndex) + newPkgBlock + '\n\n' + serverCode.substring(endIndex);
}

fs.writeFileSync('dist/server-embedded.js', serverCode);
console.log('Created dist/server-embedded.js with embedded files');
"

# Step 2: Bundle with esbuild 
echo "📦 Step 2: Bundling with esbuild..."
npx esbuild dist/server-embedded.js \
  --bundle \
  --platform=node \
  --target=node18 \
  --external:express \
  --external:socket.io \
  --external:dotenv \
  --outfile=dist/server-bundled.js

# Build for multiple platforms
echo "🏗️  Step 3: Building executables..."

# Windows
echo "  → Building for Windows (x64)..."
pkg dist/server-bundled.js \
  --targets node18-win-x64 \
  --output dist/tiktok-chat-reader-win.exe \
  --public-packages "*"

# macOS
echo "  → Building for macOS (x64)..."
pkg dist/server-bundled.js \
  --targets node18-macos-x64 \
  --output dist/tiktok-chat-reader-macos \
  --public-packages "*"

# Linux
# echo "  → Building for Linux (x64)..."
# pkg dist/server-bundled.js --targets node18-linux-x64 --output dist/tiktok-chat-reader-linux

echo ""
echo "✅ Done! Executables created in ./dist/"
echo "  - dist/tiktok-chat-reader-win.exe (Windows)"
echo "  - dist/tiktok-chat-reader-macos (macOS)"
# echo "  - dist/tiktok-chat-reader-linux (Linux)"
echo ""
echo "✨ Public files are now embedded directly in the executable!"
echo "⚠️  Note: You can optionally include a .env file for configuration (SESSIONID, PORT, etc.)"
echo ""
