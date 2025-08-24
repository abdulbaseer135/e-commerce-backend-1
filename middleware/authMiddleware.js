const jwt = require('jsonwebtoken');
const { jwtSecret } = require('../config/config'); // Ensure the JWT secret is correctly imported from your config file

module.exports = function (req, res, next) {
  // Extract token from Authorization header or cookies (if using cookies)
  const token = req.header('Authorization')?.replace('Bearer ', '') || req.cookies.token;

  if (!token) {
    return res.status(401).json({ message: 'No token, authorization denied' });
  }

  try {
    // Verify the token and attach decoded user data to the request object
    const decoded = jwt.verify(token, jwtSecret);

    // Attach user data to the request object
    req.user = decoded;

    // Proceed to the next middleware or route handler
    next();

  } catch (err) {
    // Log the error for debugging purposes (can be removed in production)
    console.error('Invalid token:', err);

    // Return an error message depending on the type of error
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Token expired. Please log in again.' });
    }

    return res.status(401).json({ message: 'Token is not valid' });
  }
};

