const jwt = require('jsonwebtoken');
const { getSetting } = require('../utils/settingsUtils'); // Import getSetting utility

const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Unauthorized. Token missing.' });
  }

  try {
    // Fetch the secret key dynamically
    const SECRET_KEY = await getSetting('secret_key');
    if (!SECRET_KEY) {
      return res.status(500).json({ error: 'Internal server error. Secret key not found.' });
    }

    // Verify the token
    jwt.verify(token, SECRET_KEY, (err, user) => {
      if (err) {
        return res.status(403).json({ error: 'Forbidden. Invalid token.' });
      }

      // Validate required fields in the token payload
      if (!user.id || !user.role_id || !user.email) {
        return res.status(400).json({ error: 'Invalid token payload. Missing required fields.' });
      }

      // Attach only the required fields to req.user
      req.user = {
        id: user.id,
        role_id: user.role_id,
        email: user.email,
      };

      next();
    });
  } catch (err) {
    console.error('Error fetching secret key or verifying token:', err.message);
    res.status(500).json({ error: 'Internal server error.' });
  }
};

module.exports = authenticateToken;