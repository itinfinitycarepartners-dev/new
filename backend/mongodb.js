const mongoose = require("mongoose");

const MONGODB_URI = process.env.MONGODB_URI;

async function connectMongoDB() {
  if (!MONGODB_URI) {
    console.warn("[MongoDB] No MONGODB_URI set — running without persistence.");
    return false;
  }
  try {
    await mongoose.connect(MONGODB_URI, { serverSelectionTimeoutMS: 8000 });
    console.log("[MongoDB] ✓ Connected");
    return true;
  } catch (err) {
    console.error("[MongoDB] Connection failed:", err.message);
    return false;
  }
}

const UserSessionSchema = new mongoose.Schema({
  token: { type: String, required: true, unique: true },
  email: { type: String, required: true },
  candidateName: String,
  arrivalDate: Date,
  sessionExpiresAt: { type: Date, required: true },
  createdAt: { type: Date, default: Date.now },
  lastActive: { type: Date, default: Date.now },
  ip: String,
  userAgent: String,
  loginTime: Date,
  status: { type: String, default: "active" },
  logoutTime: Date,
});

const ArrivalSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  candidateName: String,
  arrivalDate: Date,
  sessionExpiresAt: Date,
  warningEmailSentAt: Date,
  confirmedAt: Date,
});

const LoginLogSchema = new mongoose.Schema({
  email: { type: String, required: true },
  name: String,
  status: String,
  timestamp: { type: Date, default: Date.now },
  ip: String,
  userAgent: String,
  token: String,
  error: String,
});

const PushTokenSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  token: { type: String, required: true },
  updatedAt: { type: Date, default: Date.now },
});

const ZohoTokenSchema = new mongoose.Schema({
  _id: String,
  refresh_token: String,
  updatedAt: { type: Date, default: Date.now },
});

module.exports = {
  connectMongoDB,
  UserSession: mongoose.models.UserSession || mongoose.model("UserSession", UserSessionSchema),
  Arrival: mongoose.models.Arrival || mongoose.model("Arrival", ArrivalSchema),
  LoginLog: mongoose.models.LoginLog || mongoose.model("LoginLog", LoginLogSchema),
  PushToken: mongoose.models.PushToken || mongoose.model("PushToken", PushTokenSchema),
  ZohoToken: mongoose.models.ZohoToken || mongoose.model("ZohoToken", ZohoTokenSchema),
};
