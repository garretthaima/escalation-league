require('dotenv').config();
const express = require('express');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(cors({ origin: 'http://localhost:3001' }));

// Serve static files from the WSL home directory
const profilePicturesPath = path.join('/home', process.env.USER, 'images/profile-pictures');
app.use('/images/profile-pictures', express.static(profilePicturesPath));

// Log the static file path for debugging
console.log(`Serving profile pictures from ${profilePicturesPath}`);

// Routes
const routes = require('./routes');
app.use(routes);

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});