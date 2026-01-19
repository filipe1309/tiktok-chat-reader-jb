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
  const ASSET_BASE = path.join(__dirname, 'public');

  // Log for debugging
  console.info('Asset base path:', ASSET_BASE);

  app.get('/', (req, res) => {
    try {
      // Use explicit path that pkg can statically analyze
      const content = fs.readFileSync(path.join(__dirname, 'public', 'index.html'), 'utf8');
      res.type('html').send(content);
    } catch (err) {
      console.error('Error loading index.html:', err.message);
      res.status(500).send('Error loading page: ' + err.message);
    }
  });

  app.get('/obs.html', (req, res) => {
    try {
      const content = fs.readFileSync(path.join(__dirname, 'public', 'obs.html'), 'utf8');
      res.type('html').send(content);
    } catch (err) {
      console.error('Error loading obs.html:', err.message);
      res.status(500).send('Error loading page: ' + err.message);
    }
  });

  app.get('/app.js', (req, res) => {
    try {
      const content = fs.readFileSync(path.join(__dirname, 'public', 'app.js'), 'utf8');
      res.type('js').send(content);
    } catch (err) {
      console.error('Error loading app.js:', err.message);
      res.status(500).send('Error loading file: ' + err.message);
    }
  });

  app.get('/connection.js', (req, res) => {
    try {
      const content = fs.readFileSync(path.join(__dirname, 'public', 'connection.js'), 'utf8');
      res.type('js').send(content);
    } catch (err) {
      console.error('Error loading connection.js:', err.message);
      res.status(500).send('Error loading file: ' + err.message);
    }
  });

  app.get('/style.css', (req, res) => {
    try {
      const content = fs.readFileSync(path.join(__dirname, 'public', 'style.css'), 'utf8');
      res.type('css').send(content);
    } catch (err) {
      console.error('Error loading style.css:', err.message);
      res.status(500).send('Error loading file: ' + err.message);
    }
  });
} else {
  // When running normally (development), serve from file system
  console.info('Running in development mode - serving files from file system');
  const publicPath = path.join(__dirname, 'public');
  app.use(express.static(publicPath));
}

// Start http listener
const port = process.env.PORT || 8081;
httpServer.listen(port);
console.info(`Server running! Please visit http://localhost:${port}`);
