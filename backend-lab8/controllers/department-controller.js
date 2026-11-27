const Department = require("../models/Department");
const Counter = require("../models/Counter");

async function getDepartments(_req, res) {
  res.json(await Department.find().sort({ id: 1 }).lean());
}

async function getDepartmentById(req, res) {
  const department = await Department.findOne({ id: Number(req.params.id) }).lean();
  if (!department) return res.status(404).json({ message: "Department not found" });
  res.json(department);
}

async function createDepartment(req, res) {
  if (typeof req.body?.name !== "string" || !req.body.name.trim()) {
    return res.status(400).json({ message: "Department name is required" });
  }
  const name = req.body.name.trim();
  if (await Department.findOne({ name }).collation({ locale: "en", strength: 2 })) {
    return res.status(409).json({ message: "Department already exists" });
  }
  const last = await Department.findOne().sort({ id: -1 }).select("id").lean();
  await Counter.updateOne({ _id: "departments" }, { $max: { value: last?.id || 0 } }, { upsert: true });
  const counter = await Counter.findOneAndUpdate(
    { _id: "departments" }, { $inc: { value: 1 } }, { returnDocument: "after" }
  );
  try {
    const department = await Department.create({ id: counter.value, name });
    res.status(201).json(department);
  } catch (error) {
    if (error.code === 11000) return res.status(409).json({ message: "Department already exists" });
    throw error;
  }
}

async function updateDepartment(req, res) {
  if (typeof req.body?.name !== "string" || !req.body.name.trim()) {
    return res.status(400).json({ message: "Department name is required" });
  }
  const id = Number(req.params.id);
  const name = req.body.name.trim();
  if (await Department.findOne({ id: { $ne: id }, name }).collation({ locale: "en", strength: 2 })) {
    return res.status(409).json({ message: "Department already exists" });
  }
  let department;
  try {
    department = await Department.findOneAndUpdate(
      { id }, { $set: { name } }, { new: true, runValidators: true }
    );
  } catch (error) {
    if (error.code === 11000) return res.status(409).json({ message: "Department already exists" });
    throw error;
  }
  if (!department) return res.status(404).json({ message: "Department not found" });
  res.json(department);
}

async function deleteDepartment(req, res) {
  const department = await Department.findOneAndDelete({ id: Number(req.params.id) });
  if (!department) return res.status(404).json({ message: "Department not found" });
  res.status(204).end();
}

module.exports = { getDepartments, getDepartmentById, createDepartment, updateDepartment, deleteDepartment };
