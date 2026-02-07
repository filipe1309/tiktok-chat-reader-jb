#!/bin/bash

# Build cross-platform desktop apps using Electron + electron-builder
# Can be run from macOS to build Windows and macOS installers

set -e

echo "🔨 Building TikTok Chat Reader (Electron)..."

# Step 0: Clean previous Electron build
echo "🧹 Cleaning previous Electron build..."
rm -rf dist-electron release

# Step 1: Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Step 2: Compile backend TypeScript
echo "📝 Compiling backend TypeScript..."
npm run build

# Step 3: Compile Electron TypeScript
echo "📝 Compiling Electron TypeScript..."
npm run electron:build-ts

# Step 4: Build Electron distributables
echo "🏗️  Building Electron distributables..."

# Detect platform and build accordingly
case "$(uname -s)" in
  Darwin*)
    echo "  → Detected macOS — building macOS + Windows targets..."
    npx electron-builder --mac --win
    ;;
  Linux*)
    echo "  → Detected Linux — building Linux + Windows targets..."
    npx electron-builder --linux --win
    ;;
  MINGW*|MSYS*|CYGWIN*)
    echo "  → Detected Windows — building Windows target..."
    npx electron-builder --win
    ;;
  *)
    echo "  → Unknown platform — building for current platform..."
    npx electron-builder
    ;;
esac

echo ""
echo "✅ Done! Electron distributables created in ./release/"
echo ""
echo "📦 Contents:"
ls -lh release/ 2>/dev/null || echo "  (check release/ directory)"
echo ""
echo "⚠️  Note: You can optionally include a .env file next to the executable for configuration"
echo ""
