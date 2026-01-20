# TikTok LIVE Chat Reader

A chat reader for TikTok LIVE utilizing TikTok-Live-Connector and Socket.IO. Built with TypeScript using Clean Architecture principles.

## 🏗️ Architecture

This project follows **Clean Architecture** principles with clear separation of concerns:

```
src/
├── domain/              # Business entities and interfaces (innermost layer)
│   ├── entities/        # Core business objects
│   ├── enums/           # Domain enumerations
│   └── repositories/    # Repository interfaces (contracts)
│
├── application/         # Business logic and use cases
│   └── services/        # Application services
│
├── infrastructure/      # External implementations
│   ├── tiktok/          # TikTok connection wrapper
│   └── rate-limiter/    # Rate limiting implementation
│
├── presentation/        # UI/API layer
│   ├── handlers/        # Socket.IO event handlers
│   └── server/          # HTTP/WebSocket server
│
├── config/              # Configuration management
├── shared/              # Shared utilities and helpers
└── main.ts              # Application entry point
```

### Principles Applied

- **Dependency Inversion**: High-level modules don't depend on low-level modules
- **Single Responsibility**: Each class has one reason to change
- **Interface Segregation**: Clients depend only on interfaces they use
- **Open/Closed**: Open for extension, closed for modification

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- npm or yarn

### Installation

```bash
# Install dependencies
npm install

# Build TypeScript
npm run build

# Start the server
npm start
```

### Development

```bash
# Run in development mode with hot reload
npm run dev:watch

# Run TypeScript directly
npm run dev
```

## 📦 Scripts

| Script | Description |
|--------|-------------|
| `npm run build` | Compile TypeScript to JavaScript |
| `npm start` | Run the compiled application |
| `npm run dev` | Run with ts-node (development) |
| `npm run dev:watch` | Run with nodemon hot reload |
| `npm run lint` | Run ESLint |
| `npm run lint:fix` | Fix ESLint issues |
| `npm run clean` | Remove dist folder |
| `npm run build:exe` | Build standalone executables |

## ⚙️ Configuration

Create a `.env` file (see `.env.example`):

```env
# Server port (default: 8081)
PORT=8081

# TikTok Session ID (optional)
SESSIONID=your_session_id

# Rate limiting
ENABLE_RATE_LIMIT=false
MAX_CONNECTIONS=10
MAX_REQUESTS_PER_MINUTE=5

# Environment
NODE_ENV=development
```

## 🌐 Web Pages

| Page | URL | Description |
|------|-----|-------------|
| Main | `http://localhost:8081/` | Chat reader interface |
| OBS Overlay | `http://localhost:8081/obs.html` | Streaming overlay |
| Live Poll | `http://localhost:8081/poll.html` | Interactive voting |

## 🗳️ Poll Feature

The poll feature allows viewers to vote by typing numbers in chat:

1. Connect to a TikTok live stream
2. Configure poll options (2-10 choices)
3. Set timer duration
4. Start the poll
5. Viewers vote by typing 1, 2, 3, etc.
6. Results update in real-time

## 🔧 Building Executables

Build standalone executables for Windows and macOS:

```bash
# Using the new TypeScript build script
chmod +x build-exe-pkg-ts.sh
./build-exe-pkg-ts.sh

# Or using the legacy build script (JavaScript)
./build-exe-pkg.sh
```

Executables will be created in `./dist/`:
- `tiktok-chat-reader-win.exe` (Windows)
- `tiktok-chat-reader-macos` (macOS)

## 📚 API Events

### Socket.IO Events (Client → Server)

| Event | Description |
|-------|-------------|
| `setUniqueId` | Connect to a TikTok stream |

### Socket.IO Events (Server → Client)

| Event | Description |
|-------|-------------|
| `tiktokConnected` | Successfully connected |
| `tiktokDisconnected` | Connection lost |
| `streamEnd` | Live stream ended |
| `chat` | New chat message |
| `gift` | Gift received |
| `like` | Likes received |
| `member` | User joined |
| `social` | Follow/share event |
| `roomUser` | Viewer count update |
| `statistic` | Global statistics |

## 🛡️ Security Features

- **Rate Limiting**: Prevents abuse (configurable)
- **Input Sanitization**: XSS protection
- **Option Filtering**: Blocks unsafe connection options

## Screenshot

![TikTok LIVE Chat Reader (Demo)](https://user-images.githubusercontent.com/59258980/153956504-c585b14b-a50e-43f0-a994-64adcaface2e.png)

## 📝 License

MIT License

## 🙏 Credits

- [TikTok-Live-Connector](https://github.com/zerodytrash/TikTok-Live-Connector)
- Original project by [zerodytrash](https://github.com/zerodytrash/TikTok-Chat-Reader)
