function validateResourceId(req, res, next) {
  if (!/^[1-9]\d*$/.test(req.params.id) || !Number.isSafeInteger(Number(req.params.id))) {
    return res.status(400).json({ message: "ID must be a positive integer" });
  }
  next();
}

module.exports = { validateResourceId };
