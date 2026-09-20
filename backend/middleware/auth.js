const jwt = require('jsonwebtoken');

const requireAdmin = (req, res, next) => {
    const authorization = req.get('authorization') || '';
    const [scheme, token] = authorization.split(' ');

    if (scheme !== 'Bearer' || !token) {
        return res.status(401).json({ success: false, error: 'Authentication required' });
    }

    if (!process.env.JWT_SECRET) {
        console.error('[AUTH] JWT_SECRET is not configured');
        return res.status(500).json({ success: false, error: 'Authentication is not configured' });
    }

    try {
        const user = jwt.verify(token, process.env.JWT_SECRET);
        if (!user || !['admin', 'super_admin'].includes(user.role)) {
            return res.status(403).json({ success: false, error: 'Admin access required' });
        }
        req.user = user;
        next();
    } catch {
        return res.status(401).json({ success: false, error: 'Your session has expired. Please sign in again.' });
    }
};

module.exports = { requireAdmin };
