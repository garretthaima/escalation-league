const jwt = require('jsonwebtoken');
require('dotenv').config();

// Use secret key from environment variable
const ACCESS_TOKEN_SECRET = process.env.JWT_SECRET || process.env.SECRET_KEY;

if (!ACCESS_TOKEN_SECRET) {
    console.error('ERROR: JWT_SECRET or SECRET_KEY not found in environment variables');
    process.exit(1);
}

// Hardcoded admin user payload
const payload = {
    id: 1, // Admin user ID (match the ID from the database)
    email: 'admin@escalationleague.com', // Admin username
    role_id: 1, // Admin role
};

const token = jwt.sign(payload, ACCESS_TOKEN_SECRET, { expiresIn: '7d' });

console.log('Generated Token:', token);