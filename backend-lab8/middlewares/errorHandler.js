function errorHandler(err, req, res, next) {
  console.error(err.stack || err);
  if (res.headersSent) return next(err);
  if (err.code === 11000) return res.status(409).json({ success: false, message: "Duplicate student id, code or email", fields: Object.keys(err.keyPattern || {}) });
  if (err.name === "ValidationError" || err.name === "CastError") return res.status(400).json({ success: false, message: "Validation failed", errors: Object.values(err.errors || { error: err }).map((item) => item.message) });
  const candidate = err.statusCode || err.status;
  const status = Number.isInteger(candidate) && candidate >= 400 && candidate <= 599 ? candidate : 500;
  const message = err.type === "entity.parse.failed" ? "Invalid JSON body"
    : err.type === "entity.too.large" ? "Request body too large"
    : status >= 500 ? "Internal server error" : err.message;
  res.status(status).json({ message });
}
module.exports = { errorHandler };
