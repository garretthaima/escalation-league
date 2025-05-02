const jwt = require('jsonwebtoken');
const SECRET_KEY = process.env.SECRET_KEY;

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Unauthorized. Token missing.' });
  }

  jwt.verify(token, SECRET_KEY, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Forbidden. Invalid token.' });
    }

    console.log('Decoded token payload:', user); // Debugging log

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
};

module.exports = authenticateToken;