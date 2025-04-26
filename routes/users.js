const express = require('express');
const router = express.Router();
const { registerUser, loginUser, googleAuth } = require('../controllers/usersController');

// User Registration
router.post('/register', registerUser);

// User Login
router.post('/login', loginUser);

// Google OAuth Callback
router.post('/google-auth', googleAuth)

module.exports = router;