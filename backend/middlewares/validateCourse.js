const fields = ["title", "teacher", "schedule", "room"];
const { validateSessions } = require("../services/schedule");
function validateCourse(req, res, next) {
  const body = req.body;
  const errors = [];
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    errors.push("Request body must be a JSON object");
  } else {
    const partial = req.method === "PUT" || req.method === "PATCH";
    if (partial && ![...fields,"sessions","credits","year","semester","code","category"].some((field) => Object.hasOwn(body, field))) {
      errors.push("Provide at least one course field: " + fields.join(", "));
    }
    for (const field of fields) {
      if ((!partial || Object.hasOwn(body, field)) &&
          (typeof body[field] !== "string" || !body[field].trim())) {
        errors.push(`${field} must be a non-empty string`);
      }
    }
  }
  if(body && typeof body === 'object') {
    if(body.sessions !== undefined) { const error=validateSessions(body.sessions); if(error) errors.push(error); }
    for(const [field,min,max] of [['credits',0.5,30],['year',1,4],['semester',1,8]]) if(body[field] !== undefined && (!Number.isFinite(body[field]) || body[field]<min || body[field]>max || (field!=='credits' && !Number.isInteger(body[field])))) errors.push(`${field} is invalid`);
    for(const field of ['code','category']) if(body[field] !== undefined && (typeof body[field]!=='string'||body[field].length>120)) errors.push(`${field} is invalid`);
  }
  if (errors.length) return res.status(400).json({ message: "Validation failed", errors });
  next();
}
module.exports = { validateCourse };
