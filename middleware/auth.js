const jwt = require('jsonwebtoken');

module.exports = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    if (!token) {
      console.error('Auth middleware: No token provided');
      return res.status(401).json({ error: 'No token provided' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret_key');
    console.log('Auth middleware: Token decoded', { userId: decoded.userId, databaseName: decoded.databaseName });
    req.userId = decoded.userId;
    req.databaseName = decoded.databaseName;
    if (!req.databaseName) {
      console.error('Auth middleware: databaseName missing in token', { userId: decoded.userId });
      return res.status(400).json({ error: 'Invalid token: databaseName missing' });
    }
    next();
  } catch (error) {
    console.error('Auth middleware error:', { error: error.message });
    res.status(401).json({ error: 'Invalid token' });
  }
};
