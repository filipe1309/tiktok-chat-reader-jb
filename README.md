# TikTok LIVE Chat Reader

A chat reader for TikTok LIVE utilizing TikTok-Live-Connector and Socket.IO. Built with TypeScript using Clean Architecture principles.

## 🏗️ Architecture

This project follows **Clean Architecture** principles with clear separation of concerns:

```
backend/
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

## 🛠️ Make Commands

For convenience, you can use `make` commands as shortcuts:

| Command | Description |
|---------|-------------|
| `make help` | Display all available commands |
| `make install` | Install project dependencies |
| `make build` | Compile TypeScript to JavaScript |
| `make clean` | Remove build artifacts |
| `make clean-all` | Remove build artifacts and node_modules |
| `make dev` | Run development server |
| `make dev-watch` | Run development server with auto-reload |
| `make start` | Build and start production server |
| `make lint` | Run ESLint |
| `make lint-fix` | Run ESLint with auto-fix |
| `make build-exe` | Build cross-platform executables |
| `make watch` | Watch for file changes and rebuild |
| `make verify` | Run linter and type check |
| `make all` | Clean, install, build, and verify |
| `make upgrade` | Update dependencies |
| `make outdated` | Check for outdated packages |
| `make info` | Display project information |

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

The poll feature allows viewers to vote by typing numbers in chat. Access it at `http://localhost:8081/poll.html`.

https://github.com/user-attachments/assets/bf57699b-470d-4bba-a128-340cf62bb431

### How It Works

1. **Connect** to a TikTok live stream using the streamer's @username
2. **Configure** your poll with 2-10 options
3. **Set** the timer duration (10-300 seconds)
4. **Start** the poll
5. **Viewers vote** by typing numbers (1, 2, 3, etc.) in the chat
6. **Results** update in real-time with animated progress bars

### Poll Configuration

| Setting | Range | Description |
|---------|-------|-------------|
| Number of Options | 2-10 | How many choices voters can pick from |
| Timer | 10-300 seconds | How long the poll stays open |
| Poll Question | Text | The question displayed to viewers |
| Option Labels | Text | Custom labels for each option |

### Poll Controls

| Button | Action |
|--------|--------|
| ▶️ Start Poll | Begin accepting votes and start the timer |
| ⏹️ Stop Poll | End voting early |
| 🔄 Reset Poll | Clear all votes and reset configuration |

### Features

- **One vote per user**: Each viewer can only vote once per poll
- **Real-time results**: Vote counts and percentages update instantly
- **Vote logging**: Optional detailed log of each vote with username and timestamp
- **Timer display**: Countdown shows remaining time
- **Total vote counter**: See how many people have participated

### Example Usage

1. Open `http://localhost:8081/poll.html`
2. Enter the streamer's username and click "Connect"
3. Set options like:
   - Question: "What game should I play next?"
   - Option 1: "Minecraft"
   - Option 2: "Fortnite"
   - Option 3: "Valorant"
4. Set timer to 60 seconds
5. Click "Start Poll"
6. Viewers type `1`, `2`, or `3` in chat to vote

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
