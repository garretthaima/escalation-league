const jwt = require('jsonwebtoken');

// Replace this with your actual secret key from your `.env` file
const ACCESS_TOKEN_SECRET = '9c9d42916c6eeef1a1db36e54dd128b3eb9c86114ed26b57a3163394ccedb6f1';

// Hardcoded admin user payload
const payload = {
    id: 1, // Admin user ID (match the ID from the database)
    email: 'admin@escalationleague.com', // Admin username
    role_id: 1, // Admin role
};

const token = jwt.sign(payload, ACCESS_TOKEN_SECRET, { expiresIn: '7d' });

console.log('Generated Token:', token);