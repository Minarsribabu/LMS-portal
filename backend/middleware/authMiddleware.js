const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

const decodeToken = (token) => jwt.verify(token, JWT_SECRET);

const getTokenFromRequest = (req) => {
  const headerToken = req.headers.authorization?.split(' ')[1];
  const queryToken = typeof req.query?.token === 'string' ? req.query.token : null;
  return headerToken || queryToken;
};

// Verify JWT Token
const verifyToken = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }

  try {
    const decoded = decodeToken(token);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(403).json({ error: 'Invalid or expired token' });
  }
};

// Verify token from Authorization header or query parameter
const verifyTokenFlexible = (req, res, next) => {
  const token = getTokenFromRequest(req);

  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }

  try {
    const decoded = decodeToken(token);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(403).json({ error: 'Invalid or expired token' });
  }
};

// Authorize specific roles
const authorizeRoles = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    next();
  };
};

module.exports = {
  verifyToken,
  verifyTokenFlexible,
  authorizeRoles,
  JWT_SECRET,
};
