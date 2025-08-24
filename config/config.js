module.exports = {
  jwtSecret: process.env.JWT_SECRET || "supersecretkey",
  tokenExpire: "7d"
};
