# TikTok LIVE Chat Reader

A chat reader and poll application for TikTok LIVE streams utilizing TikTok-Live-Connector and Socket.IO. Built with TypeScript using Clean Architecture principles. Available as a web server or desktop application (Electron).

![TikTok LIVE Chat Reader (Demo)](docs/chatreaderjb.gif)

## 🚀 Quick Start

```bash
make install    # Install all dependencies
make dev        # Start development servers
```

## 🛠️ Make Commands

Run `make help` to see all available commands.

## 💻 Development

### Prerequisites

- Node.js 18+
- npm

### Running in Development Mode

```bash
make install          # Install all dependencies
make dev              # Start both backend and frontend dev servers
```

Or run them separately:

```bash
make backend-dev-watch   # Backend with auto-reload (:8081)
make frontend-dev        # Frontend dev server (:3000)
```

### Testing

```bash
make test             # Run all tests
make test-watch       # Run tests in watch mode
make test-coverage    # Run tests with coverage report
```

### Linting

```bash
make lint             # Run linters on both projects
make backend-lint-fix # Fix backend lint issues
```

## 📦 Building Desktop App (Electron)

Build standalone desktop applications for Windows and macOS:

```bash
make electron-dist    # Build distributable installers
```

### Build Output

Installers are created in `./release/`:

| Platform | Format |
|----------|--------|
| macOS | `.dmg`, `.zip` |
| Windows | `.exe` (NSIS installer + Portable) |

### Development Mode

```bash
make electron-dev     # Build & launch Electron in dev mode
```

## 🌐 Web Pages

| Page | URL |
|------|-----|
| Main | `http://localhost:8081/` |
| OBS Overlay | `http://localhost:8081/obs.html` |
| Live Poll | `http://localhost:8081/poll.html` |

## 🗳️ Poll Feature

The poll feature allows viewers to vote by typing numbers in chat.

![Poll Feature Demo](docs/tcrjb_poll.gif)

### How It Works

1. Connect to a TikTok live stream using the streamer's @username
2. Configure your poll with 2-10 options
3. Set the timer duration (10-300 seconds)
4. Start the poll
5. Viewers vote by typing numbers (1, 2, 3, etc.) in the chat
6. Results update in real-time

### Features

- **One vote per user** - Each viewer can only vote once per poll
- **Real-time results** - Vote counts and percentages update instantly
- **Vote logging** - Optional detailed log of each vote
- **Timer display** - Countdown shows remaining time


## 📝 License

MIT License

## 🙏 Credits

- [TikTok-Live-Connector](https://github.com/zerodytrash/TikTok-Live-Connector)
- Original project by [zerodytrash](https://github.com/zerodytrash/TikTok-Chat-Reader)
