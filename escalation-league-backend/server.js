const path = require('path');

// Dynamically load the correct .env file based on NODE_ENV
const envFile = process.env.NODE_ENV === 'production' ? '.env.prod' : '.env.dev';
require('dotenv').config({ path: path.resolve(__dirname, `../${envFile}`) });

const express = require('express');
const cors = require('cors');
// const { getSetting } = require('./utils/settingsUtils');

const app = express();
const PORT = process.env.PORT || 4000;

// Middleware to parse JSON request bodies
app.use(express.json());

// Fetch the frontend URL from the settings table
(async () => {
  const allowedOrigins = [
    'http://frontend-prod',
    'http://localhost:3001',
    'https://escalationleague.com',
    'https://www.escalationleague.com',
  ];

  app.use(cors({
    origin: function (origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
  }));

  // Serve static files
  const profilePicturesPath = path.join('/home', process.env.USER || 'default', 'images/profile-pictures');
  app.use('/images/profile-pictures', express.static(profilePicturesPath));

  console.log(`Serving profile pictures from ${profilePicturesPath}`);

  // Routes
  const routes = require('./routes');
  app.use('/api', routes);

  // Start the server
  app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
  });
})();