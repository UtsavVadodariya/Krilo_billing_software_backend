const jwt = require('jsonwebtoken');

module.exports = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    if (!token) {
      console.error('Auth middleware: No token provided');
      return res.status(401).json({ 
        error: 'No token provided',
        redirect: true // Flag to indicate frontend should redirect
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret_key');
    console.log('Auth middleware: Token decoded', { userId: decoded.userId, databaseName: decoded.databaseName });
    
    req.userId = decoded.userId;
    req.databaseName = decoded.databaseName;
    
    if (!req.databaseName) {
      console.error('Auth middleware: databaseName missing in token', { userId: decoded.userId });
      return res.status(401).json({ 
        error: 'Invalid token: databaseName missing',
        redirect: true // Flag to indicate frontend should redirect
      });
    }
    next();
  } catch (error) {
    console.error('Auth middleware error:', { error: error.message });
    // For any JWT verification error (expired, invalid signature, malformed, etc.)
    res.status(401).json({ 
      error: 'Invalid token',
      redirect: true // Flag to indicate frontend should redirect
    });
  }
};