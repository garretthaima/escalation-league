require('dotenv').config();
const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;
const cors = require('cors');


// // Run migrations
// const createTables = require('./scripts/createTables');
// createTables();

// Middleware
app.use(express.json());
app.use(cors({ origin: 'http://localhost:3001' }));

// Routes
const routes = require('./routes');
app.use(routes);

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});