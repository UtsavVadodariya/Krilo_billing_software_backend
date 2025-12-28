const jwt = require('jsonwebtoken');

module.exports = (req, res, next) => {
    try {
        const token = req.header('Authorization')?.replace('Bearer ', '');
        if (!token) {
            return res.status(401).json({ error: 'No token provided' });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret_key');

        if (decoded.role !== 'super-admin') {
            return res.status(403).json({ error: 'Access denied' });
        }

        req.admin = decoded;
        next();
    } catch (error) {
        res.status(401).json({ error: 'Invalid admin token' });
    }
};
