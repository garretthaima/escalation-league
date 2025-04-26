// filepath: \\wsl.localhost\Ubuntu\home\ghaima\code\escalation-league\escalation-league-backend\middlewares\authorizeRole.js

module.exports = (roles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ error: 'Unauthorized. User not authenticated.' });
        }

        const userRole = req.user.role;

        if (!roles.includes(userRole)) {
            return res.status(403).json({ error: 'Access denied. Insufficient permissions.' });
        }

        next();
    };
};