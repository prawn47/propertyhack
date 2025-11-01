const jwt = require('jsonwebtoken');

// Middleware to verify JWT access token
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({ error: 'Access token required' });
    }

    const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
    
    // Get user from database to ensure they still exist
    const user = await req.prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        email: true,
        emailVerified: true,
        superAdmin: true,
        createdAt: true,
      }
    });

    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Invalid access token' });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Access token expired' });
    }
    console.error('Auth middleware error:', error);
    return res.status(500).json({ error: 'Authentication error' });
  }
};

// Middleware to verify refresh token
const authenticateRefreshToken = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(401).json({ error: 'Refresh token required' });
    }

    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    
    // Get user from database
    const user = await req.prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        email: true,
        emailVerified: true,
      }
    });

    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Invalid refresh token' });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Refresh token expired' });
    }
    console.error('Refresh auth middleware error:', error);
    return res.status(500).json({ error: 'Authentication error' });
  }
};

// Middleware to verify user is super admin
const requireSuperAdmin = async (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  
  if (!req.user.superAdmin) {
    return res.status(403).json({ error: 'Super admin access required' });
  }
  
  next();
};

// Helper function to generate tokens
const generateTokens = (userId) => {
  const accessToken = jwt.sign(
    { userId },
    process.env.JWT_ACCESS_SECRET,
    { expiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m' }
  );

  const refreshToken = jwt.sign(
    { userId },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d' }
  );

  return { accessToken, refreshToken };
};

module.exports = {
  authenticateToken,
  authenticateRefreshToken,
  requireSuperAdmin,
  generateTokens,
};
