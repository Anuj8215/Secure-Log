'use strict';

const authorize = (...roles) => (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ status: 'error', message: 'Not authenticated' });
  }
  if (!roles.includes(req.user.role)) {
    return res.status(403).json({ status: 'error', message: 'Access denied' });
  }
  next();
};

module.exports = authorize;
