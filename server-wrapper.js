// Wrapper to set __dirname correctly for bundled executable
const path = require('path');

// Override __dirname to point to the executable's directory
global.__dirname = path.dirname(process.execPath);

// Load the actual server
require('./server.js');
