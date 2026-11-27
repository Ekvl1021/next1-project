const mongoose = require("mongoose");

function getMongoUri() {
  if (process.env.MONGODB_URI) return process.env.MONGODB_URI;

  const { MONGODB_HOST, MONGODB_PORT, MONGODB_DATABASE, MONGODB_USERNAME, MONGODB_PASSWORD } = process.env;
  if (!MONGODB_HOST || !MONGODB_PORT || !MONGODB_DATABASE || !MONGODB_USERNAME || !MONGODB_PASSWORD) {
    throw new Error("Set MONGODB_HOST, MONGODB_PORT, MONGODB_DATABASE, MONGODB_USERNAME, and MONGODB_PASSWORD.");
  }
  const authSource = process.env.MONGODB_AUTH_SOURCE || MONGODB_DATABASE;
  const uri = `mongodb://${encodeURIComponent(MONGODB_USERNAME)}:${encodeURIComponent(MONGODB_PASSWORD)}@${MONGODB_HOST}:${MONGODB_PORT}/${encodeURIComponent(MONGODB_DATABASE)}?authSource=${encodeURIComponent(authSource)}`;
  process.env.MONGODB_URI = uri;
  return uri;
}

async function connectDB(uri = getMongoUri()) {
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
  console.log("MongoDB connected successfully");
}
module.exports = connectDB;
module.exports.getMongoUri = getMongoUri;
