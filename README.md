# TikTok LIVE Chat Reader

A chat reader for TikTok LIVE utilizing TikTok-Live-Connector and Socket.IO. Built with TypeScript using Clean Architecture principles. Available as a web server or desktop application (Electron).

## 🏗️ Architecture

This project follows **Clean Architecture** principles with clear separation of concerns:

```
├── backend/                 # Node.js + TypeScript server
│   ├── domain/              # Business entities and interfaces (innermost layer)
│   │   ├── entities/        # Core business objects
│   │   ├── enums/           # Domain enumerations
│   │   └── repositories/    # Repository interfaces (contracts)
│   │
│   ├── application/         # Business logic and use cases
│   │   └── services/        # Application services
│   │
│   ├── infrastructure/      # External implementations
│   │   ├── tiktok/          # TikTok connection wrapper
│   │   └── rate-limiter/    # Rate limiting implementation
│   │
│   ├── presentation/        # UI/API layer
│   │   ├── handlers/        # Socket.IO event handlers
│   │   └── server/          # HTTP/WebSocket server
│   │
│   ├── config/              # Configuration management
│   ├── shared/              # Shared utilities and helpers
│   ├── __tests__/           # Unit and integration tests
│   ├── jest.config.js       # Jest test configuration
│   ├── tsconfig.json        # TypeScript configuration
│   └── main.ts              # Application entry point
│
├── frontend/                # React + TypeScript + Tailwind CSS
│   └── src/
│       ├── components/      # React components
│       ├── hooks/           # Custom React hooks
│       └── pages/           # Page components
│
├── electron/                # Electron desktop wrapper
│   ├── main.ts              # Electron main process
│   ├── preload.ts           # Preload script (context bridge)
│   └── tsconfig.json        # Electron TypeScript config
│
├── public-react/            # Built frontend assets (served by backend)
└── Makefile                 # Build orchestration
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

### Backend

| Script | Description |
|--------|-------------|
| `npm run build` | Compile TypeScript to JavaScript |
| `npm start` | Run the compiled application |
| `npm run dev` | Run with ts-node (development) |
| `npm run dev:watch` | Run with nodemon hot reload |
| `npm run lint` | Run ESLint |
| `npm run lint:fix` | Fix ESLint issues |
| `npm run clean` | Remove dist folder |
| `npm test` | Run tests |
| `npm run test:watch` | Run tests in watch mode |
| `npm run test:coverage` | Run tests with coverage report |

### Electron (Desktop App)

| Script | Description |
|--------|-------------|
| `npm run electron:dev` | Build and launch Electron in dev mode |
| `npm run electron:build-ts` | Compile Electron TypeScript |
| `npm run electron:dist` | Build distributable installers |

## 🛠️ Make Commands

For convenience, you can use `make` commands as shortcuts:

### Combined Commands

| Command | Description |
|---------|-------------|
| `make help` | Display all available commands |
| `make install` | Install all dependencies |
| `make build` | Build both backend and frontend |
| `make dev` | Start both dev servers |
| `make start` | Build and start production |
| `make lint` | Run linters on both projects |
| `make clean` | Clean all build artifacts |
| `make clean-all` | Clean artifacts + node_modules |
| `make test` | Run all tests |
| `make test-watch` | Run tests in watch mode |
| `make test-coverage` | Run tests with coverage report |
| `make info` | Display project information |

### Backend Commands

| Command | Description |
|---------|-------------|
| `make backend-install` | Install backend dependencies |
| `make backend-dev` | Start backend dev server (:8081) |
| `make backend-dev-watch` | Start with auto-reload |
| `make backend-build` | Compile TypeScript |
| `make backend-start` | Start production server |
| `make backend-lint` | Run ESLint |
| `make backend-lint-fix` | Run ESLint with auto-fix |
| `make backend-test` | Run backend tests |
| `make backend-test-coverage` | Run tests with coverage |
| `make backend-clean` | Remove build artifacts |

### Frontend Commands

| Command | Description |
|---------|-------------|
| `make frontend-install` | Install frontend dependencies |
| `make frontend-dev` | Start frontend dev server (:3000) |
| `make frontend-build` | Build for production |
| `make frontend-lint` | Run ESLint |
| `make frontend-clean` | Remove build artifacts |

### Electron Commands

| Command | Description |
|---------|-------------|
| `make electron-dev` | Build & launch Electron dev app |
| `make electron-build-ts` | Compile Electron TypeScript |
| `make electron-dist` | Build distributable installers |
| `make electron-clean` | Remove Electron build artifacts |

## 🧪 Testing

The project uses Jest for testing with ts-jest for TypeScript support.

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage report
npm run test:coverage
```

Test files are located in `backend/__tests__/` with the following structure:
- `unit/` - Unit tests for individual components
- `integration/` - Integration tests
- `mocks/` - Test mocks and fixtures

Coverage reports are generated in `./coverage/`.

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

## 🔧 Building Desktop Application (Electron)

Build standalone desktop applications for Windows and macOS using Electron:

```bash
# Build distributables (recommended)
npm run electron:dist
# Or using make
make electron-dist
# Or directly with the script
./build-exe-electron.sh
```

### What Gets Built

The build process creates installers in `./release/`:

| Platform | Format | Description |
|----------|--------|-------------|
| **macOS** | `.dmg` | Disk image installer (x64 + arm64) |
| **macOS** | `.zip` | Portable zip archive |
| **Windows** | `.exe` (NSIS) | Standard Windows installer |
| **Windows** | `.exe` (Portable) | Portable executable |

### Development Mode

```bash
# Launch Electron in development mode
npm run electron:dev
# Or
make electron-dev
```

This will:
1. Compile the backend TypeScript
2. Compile the Electron TypeScript
3. Launch the desktop app pointing to `localhost:8081`

### Build Configuration

The Electron build is configured via:
- [electron-builder.yml](electron-builder.yml) - Build targets, icons, and packaging options
- [electron/tsconfig.json](electron/tsconfig.json) - TypeScript config for Electron code

### Notes

- The desktop app bundles the backend server + frontend assets
- Configuration can be provided via a `.env` file next to the executable
- Cross-platform builds are supported (build Windows from macOS, etc.)

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
