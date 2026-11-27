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

async function connectDB(uri = getMongoUri(), options = {}) {
  const attempts = Number(options.attempts ?? process.env.MONGODB_CONNECT_ATTEMPTS ?? 5);
  const delayMs = Number(options.delayMs ?? process.env.MONGODB_RETRY_DELAY_MS ?? 2000);
  if (!Number.isInteger(attempts) || attempts < 1 || attempts > 100 || !Number.isFinite(delayMs) || delayMs < 0 || delayMs > 60000) {
    throw new Error("Invalid MongoDB connection retry configuration.");
  }
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
      console.log("MongoDB connected successfully");
      return;
    } catch (error) {
      // Authentication failures need corrected credentials, not repeated attempts.
      if (error.code === 18 || attempt === attempts) throw error;
      console.warn(`MongoDB connection attempt ${attempt}/${attempts} failed; retrying in ${delayMs}ms`);
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }
}
module.exports = connectDB;
module.exports.getMongoUri = getMongoUri;
