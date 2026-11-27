const fields = ["title", "teacher", "schedule", "room"];
function validateCourse(req, res, next) {
  const body = req.body;
  const errors = [];
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    errors.push("Request body must be a JSON object");
  } else {
    const partial = req.method === "PUT";
    if (partial && !fields.some((field) => Object.hasOwn(body, field))) {
      errors.push("Provide at least one course field: " + fields.join(", "));
    }
    for (const field of fields) {
      if ((!partial || Object.hasOwn(body, field)) &&
          (typeof body[field] !== "string" || !body[field].trim())) {
        errors.push(`${field} must be a non-empty string`);
      }
    }
  }
  if (errors.length) return res.status(400).json({ message: "Validation failed", errors });
  next();
}
module.exports = { validateCourse };
