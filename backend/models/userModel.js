const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    fullName: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, trim: true, lowercase: true, index: true },
    mobileNumber: { type: String, required: true, unique: true, trim: true, index: true },
    phone: { type: String, trim: true },
    passwordHash: { type: String, required: true },
    resetPasswordTokenHash: { type: String, default: null },
    resetPasswordExpiresAt: { type: Date, default: null },
    isAdmin: { type: Boolean, default: false },
    role: { type: String, enum: ["user", "admin"], default: "user" }
  },
  { timestamps: true }
);

userSchema.pre("validate", function syncCompatibilityFields() {
  if (!this.phone && this.mobileNumber) this.phone = this.mobileNumber;
  if (!this.mobileNumber && this.phone) this.mobileNumber = this.phone;
  if (this.isAdmin) this.role = "admin";
  if (this.role === "admin") this.isAdmin = true;
});

userSchema.virtual("createdAtDate").get(function createdAtDate() {
  return this.createdAt;
});

const User = mongoose.model("User", userSchema);

function findByIdentifier(identifier) {
  const value = String(identifier || "").trim();
  return User.findOne({
    $or: [{ mobileNumber: value }, { phone: value }, { email: value.toLowerCase() }]
  }).exec();
}

function create({ fullName, mobileNumber, phone, email, passwordHash, isAdmin = false }) {
  return User.create({ fullName, mobileNumber: mobileNumber || phone, phone: phone || mobileNumber, email, passwordHash, isAdmin, role: isAdmin ? "admin" : "user" });
}

function toSessionUser(user) {
  return {
    id: user.id,
    fullName: user.fullName,
    mobileNumber: user.mobileNumber || user.phone,
    phone: user.mobileNumber || user.phone,
    email: user.email,
    isAdmin: user.isAdmin || user.role === "admin"
  };
}

module.exports = { User, findByIdentifier, create, toSessionUser };
