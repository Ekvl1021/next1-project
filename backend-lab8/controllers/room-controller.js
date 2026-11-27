const Room = require("../models/Room");
const Course = require("../models/Course");
const Counter = require("../models/Counter");

const validRoomName = (name) => typeof name === "string" && name.trim().length > 0;
const publicRoom = ({ id, name }) => ({ id: String(id), name });

async function getRooms(_req, res) {
  const rooms = await Room.find().sort({ id: 1 }).lean();
  res.json(rooms.map(publicRoom));
}

async function getRoomById(req, res) {
  const room = await Room.findOne({ id: Number(req.params.id) }).lean();
  if (!room) return res.status(404).json({ message: "Room not found" });
  res.json(publicRoom(room));
}

async function createRoom(req, res) {
  if (!validRoomName(req.body?.name)) return res.status(400).json({ message: "Room name is required" });
  const name = req.body.name.trim();
  if (await Room.findOne({ name }).collation({ locale: "en", strength: 2 })) {
    return res.status(409).json({ message: "Room already exists" });
  }
  const last = await Room.findOne().sort({ id: -1 }).select("id").lean();
  await Counter.updateOne({ _id: "rooms" }, { $max: { value: last?.id || 0 } }, { upsert: true });
  const counter = await Counter.findOneAndUpdate(
    { _id: "rooms" }, { $inc: { value: 1 } }, { returnDocument: "after" }
  );
  try {
    const room = await Room.create({ id: counter.value, name });
    res.status(201).json(publicRoom(room));
  } catch (error) {
    if (error.code === 11000) return res.status(409).json({ message: "Room already exists" });
    throw error;
  }
}

async function updateRoom(req, res) {
  if (!validRoomName(req.body?.name)) return res.status(400).json({ message: "Room name is required" });
  const id = Number(req.params.id);
  const room = await Room.findOne({ id });
  if (!room) return res.status(404).json({ message: "Room not found" });
  const name = req.body.name.trim();
  if (await Room.findOne({ id: { $ne: id }, name }).collation({ locale: "en", strength: 2 })) {
    return res.status(409).json({ message: "Room already exists" });
  }
  if (name !== room.name && await Course.exists({ room: room.name })) {
    return res.status(409).json({ message: "Cannot rename a room assigned to a course" });
  }
  room.name = name;
  try {
    await room.save();
  } catch (error) {
    if (error.code === 11000) return res.status(409).json({ message: "Room already exists" });
    throw error;
  }
  res.json(publicRoom(room));
}

async function deleteRoom(req, res) {
  const id = Number(req.params.id);
  const room = await Room.findOne({ id });
  if (!room) return res.status(404).json({ message: "Room not found" });
  if (await Course.exists({ room: room.name })) {
    return res.status(409).json({ message: "Cannot delete a room assigned to a course" });
  }
  await Room.deleteOne({ id });
  res.status(204).end();
}

module.exports = { getRooms, getRoomById, createRoom, updateRoom, deleteRoom, validRoomName };
