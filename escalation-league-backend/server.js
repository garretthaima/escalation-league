const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();

// Middleware to parse JSON request bodies
app.use(express.json());


// CORS configuration - must be before routes
const allowedOrigins = [
  'http://frontend-prod',
  'http://localhost:3000',
  'http://localhost:3001',
  'http://localhost:4000',
  'https://escalationleague.com',
  'https://www.escalationleague.com',
  'https://dev.escalationleague.com',
  process.env.FRONTEND_URL, // Dynamic from .env
].filter(Boolean); // Remove undefined values

const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, curl, etc.)
    if (!origin) {
      return callback(null, true);
    }

    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.log(`CORS blocked origin: ${origin}`);
      console.log(`   Allowed origins:`, allowedOrigins);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['Content-Range', 'X-Content-Range'],
  maxAge: 86400, // 24 hours
  optionsSuccessStatus: 200,
  preflightContinue: false
};

app.use(cors(corsOptions));

// Fetch the frontend URL from the settings table
(async () => {

  // Serve static files
  const profilePicturesPath = path.join('/home', process.env.USER || 'default', 'images/profile-pictures');
  app.use('/images/profile-pictures', express.static(profilePicturesPath));

  console.log(`Serving profile pictures from ${profilePicturesPath}`);

  // Routes
  const routes = require('./routes');
  app.use('/api', routes);

  // Start the server
  if (process.env.NODE_ENV !== 'test' && require.main === module) {
    const PORT = process.env.PORT || 4000;
    app.listen(PORT, () => {
      console.log(`Server is running on http://localhost:${PORT}`);
    });
  }
})();

// Export for testing
module.exports = app;