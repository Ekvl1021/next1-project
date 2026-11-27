const jwt = require("jsonwebtoken");

function authenticateToken(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Authentication required" });
  }

  try {
    const payload = jwt.verify(authHeader.slice(7), process.env.JWT_SECRET);
    req.user = {
      id: String(payload.sub),
      username: payload.username,
      role: payload.role,
    };
    next();
  } catch {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
}

module.exports = { authenticateToken };
