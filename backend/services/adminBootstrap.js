const bcrypt = require("bcryptjs");
const { User } = require("../models/userModel");

async function ensureAdminUser() {
  const email = String(process.env.ADMIN_EMAIL || "").trim().toLowerCase();
  const mobileNumber = String(process.env.ADMIN_MOBILE_NUMBER || "").trim();
  const password = String(process.env.ADMIN_PASSWORD || "");
  const fullName = String(process.env.ADMIN_FULL_NAME || "System Owner").trim();

  if (!email || !mobileNumber || !password) {
    return null;
  }

  const existing = await User.findOne({ $or: [{ email }, { mobileNumber }] }).exec();

  if (existing) {
    let changed = false;
    if (!existing.isAdmin || existing.role !== "admin") {
      existing.isAdmin = true;
      existing.role = "admin";
      changed = true;
    }
    if (!existing.fullName) {
      existing.fullName = fullName;
      changed = true;
    }
    if (changed) await existing.save();
    return existing;
  }

  return User.create({
    fullName,
    email,
    mobileNumber,
    phone: mobileNumber,
    passwordHash: await bcrypt.hash(password, 12),
    isAdmin: true,
    role: "admin"
  });
}

module.exports = { ensureAdminUser };
