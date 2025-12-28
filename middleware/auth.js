const jwt = require('jsonwebtoken');
const User = require('../models/User');

module.exports = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    if (!token) {
      console.error('Auth middleware: No token provided');
      return res.status(401).json({
        error: 'No token provided',
        redirect: true
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret_key');
    // console.log('Auth middleware: Token decoded', { userId: decoded.userId, databaseName: decoded.databaseName });

    req.userId = decoded.userId;
    req.databaseName = decoded.databaseName;

    if (!req.databaseName) {
      console.error('Auth middleware: databaseName missing in token', { userId: decoded.userId });
      return res.status(401).json({
        error: 'Invalid token: databaseName missing',
        redirect: true
      });
    }

    // Check User Status (Every Request)
    const user = await User.findById(req.userId).select('isActive subscriptionExpiry');
    if (!user) {
      return res.status(401).json({ error: 'User not found', redirect: true });
    }

    if (user.isActive === false) {
      return res.status(403).json({ error: 'Your account is inactive. Please contact support.', forceLogout: true });
    }

    // Subscription Expiry Check
    if (user.subscriptionExpiry && new Date() > new Date(user.subscriptionExpiry)) {
      return res.status(403).json({ error: 'Your subscription has expired. Please renew to continue.', forceLogout: true });
    }

    next();
  } catch (error) {
    console.error('Auth middleware error:', { error: error.message });
    res.status(401).json({
      error: 'Invalid token',
      redirect: true
    });
  }
};