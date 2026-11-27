function errorHandler(err, req, res, next) {
  console.error(err.stack || err);
  if (res.headersSent) return next(err);
  const candidate = err.statusCode || err.status;
  const status = Number.isInteger(candidate) && candidate >= 400 && candidate <= 599 ? candidate : 500;
  const message = err.type === "entity.parse.failed" ? "Invalid JSON body"
    : err.type === "entity.too.large" ? "Request body too large"
    : status >= 500 ? "Internal server error" : err.message;
  res.status(status).json({ message });
}
module.exports = { errorHandler };
