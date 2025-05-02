const express = require('express');
const router = express.Router();
const {
    registerUser,
    loginUser,
    googleAuth,
    verifyGoogleToken,
} = require('../controllers/authController');

// Authentication Endpoints
router.post('/register', registerUser);
router.post('/login', loginUser);
router.post('/google-auth', googleAuth);
router.post('/verify-google-token', verifyGoogleToken);

module.exports = router;