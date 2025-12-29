const jwt = require('jsonwebtoken');
const { ApplicationLogin } = require('../models_sql/index');

module.exports = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    if (!token) {
      // console.error('Auth middleware: No token provided'); // Reduced noise
      return res.status(401).json({
        error: 'No token provided',
        redirect: true
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret_key');
    // console.log('Auth middleware: Token decoded', { userId: decoded.userId });

    req.userId = decoded.userId;
    req.databaseName = decoded.databaseName; // Legacy databaseName on req

    if (!req.databaseName) {
      console.error('Auth middleware: databaseName missing in token', { userId: decoded.userId });
      return res.status(401).json({
        error: 'Invalid token: databaseName missing',
        redirect: true
      });
    }

    // Check User Status (Every Request)
    // Using findByPk since userId is Integer ID in new system
    const user = await ApplicationLogin.findByPk(req.userId);

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