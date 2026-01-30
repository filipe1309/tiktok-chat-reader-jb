require('dotenv').config();

const path = require('path');
const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');
const { TikTokConnectionWrapper, getGlobalConnectionCount } = require('./connectionWrapper');
const { clientBlocked } = require('./limiter');

const app = express();
const httpServer = createServer(app);

// Enable cross origin resource sharing
const io = new Server(httpServer, {
  cors: {
    origin: '*'
  }
});


io.on('connection', (socket) => {
  let tiktokConnectionWrapper;

  console.info('New connection from origin', socket.handshake.headers['origin'] || socket.handshake.headers['referer']);

  socket.on('setUniqueId', (uniqueId, options) => {

    // Prohibit the client from specifying these options (for security reasons)
    if (typeof options === 'object' && options) {
      delete options.requestOptions;
      delete options.websocketOptions;
    } else {
      options = {};
    }

    // Session ID in .env file is optional
    if (process.env.SESSIONID) {
      options.sessionId = process.env.SESSIONID;
      console.info('Using SessionId');
    }

    // Check if rate limit exceeded
    if (process.env.ENABLE_RATE_LIMIT && clientBlocked(io, socket)) {
      socket.emit('tiktokDisconnected', 'You have opened too many connections or made too many connection requests. Please reduce the number of connections/requests or host your own server instance. The connections are limited to avoid that the server IP gets blocked by TokTok.');
      return;
    }

    // Connect to the given username (uniqueId)
    try {
      tiktokConnectionWrapper = new TikTokConnectionWrapper(uniqueId, options, true);
      tiktokConnectionWrapper.connect();
    } catch (err) {
      socket.emit('tiktokDisconnected', err.toString());
      return;
    }

    // Redirect wrapper control events once
    tiktokConnectionWrapper.once('connected', state => socket.emit('tiktokConnected', state));
    tiktokConnectionWrapper.once('disconnected', reason => socket.emit('tiktokDisconnected', reason));

    // Notify client when stream ends
    tiktokConnectionWrapper.connection.on('streamEnd', () => socket.emit('streamEnd'));

    // Redirect message events
    tiktokConnectionWrapper.connection.on('roomUser', msg => socket.emit('roomUser', msg));
    tiktokConnectionWrapper.connection.on('member', msg => socket.emit('member', msg));
    tiktokConnectionWrapper.connection.on('chat', msg => socket.emit('chat', msg));
    tiktokConnectionWrapper.connection.on('gift', msg => socket.emit('gift', msg));
    tiktokConnectionWrapper.connection.on('social', msg => socket.emit('social', msg));
    tiktokConnectionWrapper.connection.on('like', msg => socket.emit('like', msg));
    tiktokConnectionWrapper.connection.on('questionNew', msg => socket.emit('questionNew', msg));
    tiktokConnectionWrapper.connection.on('linkMicBattle', msg => socket.emit('linkMicBattle', msg));
    tiktokConnectionWrapper.connection.on('linkMicArmies', msg => socket.emit('linkMicArmies', msg));
    tiktokConnectionWrapper.connection.on('liveIntro', msg => socket.emit('liveIntro', msg));
    tiktokConnectionWrapper.connection.on('emote', msg => socket.emit('emote', msg));
    tiktokConnectionWrapper.connection.on('envelope', msg => socket.emit('envelope', msg));
    tiktokConnectionWrapper.connection.on('subscribe', msg => socket.emit('subscribe', msg));
  });

  socket.on('disconnect', () => {
    if (tiktokConnectionWrapper) {
      tiktokConnectionWrapper.disconnect();
    }
  });
});

// Emit global connection statistics
setInterval(() => {
  io.emit('statistic', { globalConnectionCount: getGlobalConnectionCount() });
}, 5000)

// Serve frontend files
// When running as pkg executable, files are in the snapshot
const fs = require('fs');

// Check if running as pkg executable
if (process.pkg) {
  console.info('Running as pkg executable - serving embedded files');

  // For pkg, we need to read files at build time using path.join with __dirname
  // These paths are statically analyzed by pkg when using the assets config
  // We'll serve the files that were embedded during the build process

  // Define the asset base path - pkg puts assets relative to where the script is
  const ASSET_BASE = path.join(__dirname, 'public-react');

  // Log for debugging
  console.info('Asset base path:', ASSET_BASE);

  // Serve assets folder
  app.get('/assets/:filename', (req, res) => {
    try {
      const filename = req.params.filename;
      const content = fs.readFileSync(path.join(__dirname, 'public-react', 'assets', filename), 'utf8');
      if (filename.endsWith('.js')) {
        res.type('js').send(content);
      } else if (filename.endsWith('.css')) {
        res.type('css').send(content);
      } else {
        res.send(content);
      }
    } catch (err) {
      console.error('Error loading asset:', err.message);
      res.status(404).send('Asset not found');
    }
  });

  app.get('/vite.svg', (req, res) => {
    try {
      const content = fs.readFileSync(path.join(__dirname, 'public-react', 'vite.svg'), 'utf8');
      res.type('image/svg+xml').send(content);
    } catch (err) {
      res.status(404).send('Not found');
    }
  });

  // SPA fallback - serve index.html for all routes
  app.get('*', (req, res) => {
    try {
      const content = fs.readFileSync(path.join(__dirname, 'public-react', 'index.html'), 'utf8');
      res.type('html').send(content);
    } catch (err) {
      console.error('Error loading index.html:', err.message);
      res.status(500).send('Error loading page: ' + err.message);
    }
  });
} else {
  // When running normally (development), serve from file system
  console.info('Running in development mode - serving files from file system');
  const publicPath = path.join(__dirname, 'public-react');
  app.use(express.static(publicPath));

  // SPA fallback - serve index.html for all non-file routes
  app.get('*', (req, res) => {
    res.sendFile(path.join(publicPath, 'index.html'));
  });
}

// Start http listener
const port = process.env.PORT || 8081;
httpServer.listen(port);
console.info(`Server running! Please visit http://localhost:${port}`);
