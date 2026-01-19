const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
const logger = require('./utils/logger');
const requestLogger = require('./middlewares/requestLogger');
const discordBot = require('./services/discordBot');
const { setIo } = require('./utils/socketEmitter');
const { swaggerUi, specs } = require('./swagger');

const app = express();
const server = http.createServer(app);


// Trust proxy headers from nginx
app.set('trust proxy', 1); // Trust first proxy (nginx)
// Middleware to parse JSON request bodies
app.use(express.json());

// Request logging middleware (after json parsing, before routes)
app.use(requestLogger);

// Helmet security headers (before CORS)
app.use(helmet({
  contentSecurityPolicy: false, // We'll configure this later or via nginx
  crossOriginEmbedderPolicy: false, // Allows Google OAuth
}));

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

// Rate limiting middleware (AFTER CORS)
const { apiLimiter } = require('./middlewares/rateLimitMiddleware');
app.use('/api', apiLimiter);

// Fetch the frontend URL from the settings table
(async () => {

  // Serve static files
  const profilePicturesPath = path.join('/home', process.env.USER || 'default', 'images/profile-pictures');
  app.use('/images/profile-pictures', express.static(profilePicturesPath));

  console.log(`Serving profile pictures from ${profilePicturesPath}`);

  // Health check endpoint (before routes, no auth required)
  app.get('/api/health', (req, res) => {
    res.status(200).json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime()
    });
  });

  // Swagger API documentation
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs, {
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'Escalation League API Docs',
  }));

  // Routes
  const routes = require('./routes');
  app.use('/api', routes);

  // Initialize Socket.IO with CORS
  const io = new Server(server, {
    cors: {
      origin: allowedOrigins,
      credentials: true,
      methods: ['GET', 'POST']
    },
    path: '/socket.io/',
    transports: ['websocket', 'polling'], // WebSocket first for lower latency
    allowEIO3: true, // Support older clients
    pingTimeout: 5000,        // Faster timeout detection
    pingInterval: 10000,      // More frequent keepalive pings
    upgradeTimeout: 3000,     // Faster upgrade from polling to websocket
    maxHttpBufferSize: 1e6,   // 1MB message size limit
    perMessageDeflate: false  // Disable compression for lower latency
  });

  // Configure Redis adapter for horizontal scaling (production)
  if (process.env.NODE_ENV === 'production') {
    const { createAdapter } = require('@socket.io/redis-adapter');
    const { createClient } = require('redis');

    const pubClient = createClient({
      url: `redis://${process.env.REDIS_HOST || 'localhost'}:${process.env.REDIS_PORT || 6379}`
    });
    const subClient = pubClient.duplicate();

    Promise.all([pubClient.connect(), subClient.connect()]).then(() => {
      io.adapter(createAdapter(pubClient, subClient));
      console.log('[INFO] Socket.IO Redis adapter configured');
    }).catch((err) => {
      console.error('[ERROR] Failed to connect Redis adapter:', err);
      // Continue without Redis adapter (single instance mode)
    });
  }

  const isDev = process.env.NODE_ENV !== 'production';

  if (isDev) {
    console.log('[DEBUG] Socket.IO server created with transports:', ['websocket', 'polling']);
    console.log('[DEBUG] Allowed origins:', allowedOrigins);
  }

  // Log connection errors (useful in all environments)
  io.engine.on("connection_error", (err) => {
    logger.error('Socket.IO connection error', {
      code: err.code,
      message: err.message
    });
  });

  // Debug logging only in development
  if (isDev) {
    io.engine.on("connection", (rawSocket) => {
      console.log('[DEBUG] Socket.IO engine connection:', {
        id: rawSocket.id,
        transport: rawSocket.transport.name
      });
    });
  }

  // Make io accessible to controllers
  app.set('io', io);

  // Also set global io for non-Express contexts (Discord bot, etc.)
  setIo(io);

  // Debug: Log successful connections in development
  if (isDev) {
    io.on('connection', (socket) => {
      console.log('[DEBUG] Socket.IO connection successful:', socket.id);
    });
  }

  // Socket.IO connection handling
  const socketHandler = require('./services/socketHandler');
  socketHandler(io);

  // Start the server
  if (process.env.NODE_ENV !== 'test' && require.main === module) {
    const PORT = process.env.PORT || 4000;
    server.listen(PORT, async () => {
      logger.info('Server started', {
        port: PORT,
        environment: process.env.NODE_ENV || 'development',
        nodeVersion: process.version
      });
      console.log(`Server is running on http://localhost:${PORT}`);
      console.log(`WebSocket server is ready`);

      // Start Discord bot (non-blocking, logs its own status)
      try {
        await discordBot.startBot();
      } catch (error) {
        console.error('[Discord Bot] Failed to start:', error.message);
        // Don't crash the server if Discord fails
      }
    });
  }
})();

// Export for testing
module.exports = app;