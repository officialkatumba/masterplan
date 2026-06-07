const mongoose = require("mongoose");
const { configureDns } = require("./dns");

configureDns();

let connectionPromise;

async function connectDatabase() {
  const mongoUrl = process.env.MONGODB_URI || process.env.MONGO_URI;

  if (!mongoUrl) {
    throw new Error("MONGODB_URI or MONGO_URI is not configured.");
  }

  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  if (!connectionPromise) {
    connectionPromise = mongoose
      .connect(mongoUrl, {
        serverSelectionTimeoutMS: 10000,
        maxPoolSize: 10
      })
      .then(() => mongoose.connection)
      .catch((error) => {
        connectionPromise = null;
        throw error;
      });
  }

  return connectionPromise;
}

mongoose.connection.on("disconnected", () => {
  console.warn("MongoDB Atlas connection disconnected.");
});

module.exports = { connectDatabase };
