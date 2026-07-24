const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'fsd_role_based_auth_secret_key_987654321';

// Middleware to authenticate JWT token from Cookies
function authenticateToken(req, res, next) {
  const token = req.cookies.token;

  if (!token) {
    return res.status(401).json({ message: 'Access Denied: No Token Provided' });
  }

  try {
    const verified = jwt.verify(token, JWT_SECRET);
    req.user = verified;
    next();
  } catch (error) {
    res.clearCookie('token');
    return res.status(401).json({ message: 'Invalid or Expired Token' });
  }
}

// Middleware to authorize specific roles
function authorizeRoles(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized: User not authenticated' });
    }

    const hasRole = allowedRoles.includes(req.user.role.toLowerCase());
    if (!hasRole) {
      return res.status(403).json({ 
        message: `Forbidden: You do not have the required role (${allowedRoles.join(', ')})` 
      });
    }

    next();
  };
}

module.exports = {
  authenticateToken,
  authorizeRoles
};
