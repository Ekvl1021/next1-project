const fields = ["code", "firstName", "lastName", "email"];
const optional = ["program", "courseId"];
function validateStudent(req, res, next, partial = false) {
  const body = req.body;
  const errors = [];
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    errors.push("Request body must be a JSON object");
  } else {
    for (const key of Object.keys(body)) {
      if (![...fields, ...optional].includes(key)) errors.push(`${key} is not an editable student field`);
    }
    if (partial && !Object.keys(body).some((key) => [...fields, ...optional].includes(key))) {
      errors.push("Provide at least one editable student field");
    }
    for (const field of fields) {
      if ((!partial || body[field] !== undefined) &&
          (typeof body[field] !== "string" || !body[field].trim())) {
        errors.push(`${field} must be a non-empty string${partial ? "" : " and is required"}`);
      }
    }
    if (typeof body.email === "string" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email.trim())) errors.push("email must be a valid email address");
    for (const field of optional) {
      if (body[field] !== undefined && typeof body[field] !== "string") errors.push(`${field} must be a string`);
    }
  }
  if (errors.length) return res.status(400).json({ success: false, message: "Validation failed", errors });
  req.studentInput = Object.fromEntries([...fields, ...optional]
    .filter((field) => body[field] !== undefined).map((field) => [field, body[field].trim()]));
  next();
}
function validateStudentPatch(req, res, next) {
  return validateStudent(req, res, next, true);
}
function validateStudentId(req, res, next) {
  if (!/^[1-9]\d*$/.test(req.params.id) || !Number.isSafeInteger(Number(req.params.id))) {
    return res.status(400).json({ success: false, message: "ID эерэг бүхэл тоо байх ёстой" });
  }
  req.studentId = Number(req.params.id);
  next();
}
module.exports = { validateStudent, validateStudentPatch, validateStudentId };
