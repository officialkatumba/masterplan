const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const passport = require("passport");
const { User } = require("../models/userModel");
const { normalizePhone, normalizeEmail } = require("../config/inputSchema");

function render(res, view, data = {}) {
  return res.render(view, { error: null, message: null, values: {}, ...data });
}

function renderLogin(req, res) {
  render(res, "auth/login", { title: "Login" });
}

function renderSignup(req, res) {
  render(res, "auth/signup", { title: "Create Account" });
}

async function signup(req, res, next) {
  try {
    const fullName = String(req.body.fullName || "").trim();
    const phone = normalizePhone(req.body.mobileNumber || req.body.phone);
    const email = normalizeEmail(req.body.email);
    const password = String(req.body.password || "");
    const values = { fullName, mobileNumber: phone, phone, email };

    if (!fullName) {
      return res.status(400).render("auth/signup", { title: "Create Account", error: "Enter your full name.", message: null, values });
    }
    if (!/^\+?\d{8,15}$/.test(phone)) {
      return res.status(400).render("auth/signup", { title: "Create Account", error: "Enter a valid mobile number.", message: null, values });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).render("auth/signup", { title: "Create Account", error: "Enter a valid email address.", message: null, values });
    }
    if (password.length < 8) {
      return res.status(400).render("auth/signup", { title: "Create Account", error: "Use a password with at least 8 characters.", message: null, values });
    }
    if (await User.exists({ $or: [{ phone }, { mobileNumber: phone }, { email }] })) {
      return res.status(409).render("auth/signup", { title: "Create Account", error: "That mobile number or email is already registered.", message: null, values });
    }

    const user = await User.create({ fullName, mobileNumber: phone, phone, email, passwordHash: await bcrypt.hash(password, 12) });
    req.login(user, (error) => (error ? next(error) : res.redirect("/dashboard")));
  } catch (error) {
    next(error);
  }
}

function login(req, res, next) {
  passport.authenticate("local", (error, user, info) => {
    if (error) return next(error);
    if (!user) {
      return res.status(401).render("auth/login", {
        title: "Login",
        error: info?.message || "Unable to sign in.",
        message: null,
        values: { identifier: req.body.identifier || "" }
      });
    }
    return req.login(user, (loginError) => (loginError ? next(loginError) : res.redirect("/dashboard")));
  })(req, res, next);
}

function logout(req, res, next) {
  req.logout((error) => {
    if (error) return next(error);
    req.session.destroy((destroyError) => {
      if (destroyError) return next(destroyError);
      res.clearCookie("businessplan.sid");
      res.redirect("/");
    });
  });
}

function renderForgotPassword(req, res) {
  render(res, "auth/forgot-password", { title: "Forgot Password" });
}

async function forgotPassword(req, res, next) {
  try {
    const identifier = String(req.body.identifier || "").trim().toLowerCase();
    const phone = normalizePhone(identifier);
    const user = await User.findOne({ $or: [{ email: identifier }, { phone }, { mobileNumber: phone }] });
    let resetUrl = null;
    if (user) {
      const token = crypto.randomBytes(32).toString("hex");
      user.resetPasswordTokenHash = crypto.createHash("sha256").update(token).digest("hex");
      user.resetPasswordExpiresAt = new Date(Date.now() + 60 * 60 * 1000);
      await user.save();
      resetUrl = `/reset-password/${token}`;
      console.log(`Password reset requested for ${user.email}: ${resetUrl}`);
    }
    render(res, "auth/forgot-password", {
      title: "Forgot Password",
      message: "If the account exists, a reset link has been prepared. Connect an email or SMS provider before production delivery.",
      resetUrl: process.env.NODE_ENV === "production" ? null : resetUrl
    });
  } catch (error) {
    next(error);
  }
}

function renderResetPassword(req, res) {
  render(res, "auth/reset-password", { title: "Reset Password", token: req.params.token });
}

async function resetPassword(req, res, next) {
  try {
    const password = String(req.body.password || "");
    if (password.length < 8) return res.status(400).render("auth/reset-password", { title: "Reset Password", token: req.params.token, error: "Use at least 8 characters.", message: null, values: {} });
    const hash = crypto.createHash("sha256").update(req.params.token).digest("hex");
    const user = await User.findOne({ resetPasswordTokenHash: hash, resetPasswordExpiresAt: { $gt: new Date() } });
    if (!user) return res.status(400).render("auth/reset-password", { title: "Reset Password", token: req.params.token, error: "That reset link is invalid or expired.", message: null, values: {} });
    user.passwordHash = await bcrypt.hash(password, 12);
    user.resetPasswordTokenHash = null;
    user.resetPasswordExpiresAt = null;
    await user.save();
    res.redirect("/login");
  } catch (error) {
    next(error);
  }
}

function renderChangePassword(req, res) {
  render(res, "auth/change-password", { title: "Change Password" });
}

async function changePassword(req, res, next) {
  try {
    const currentPassword = String(req.body.currentPassword || "");
    const newPassword = String(req.body.newPassword || "");
    if (!(await bcrypt.compare(currentPassword, req.user.passwordHash))) {
      return res.status(400).render("auth/change-password", { title: "Change Password", error: "Your current password is incorrect.", message: null, values: {} });
    }
    if (newPassword.length < 8) {
      return res.status(400).render("auth/change-password", { title: "Change Password", error: "Use at least 8 characters for the new password.", message: null, values: {} });
    }
    req.user.passwordHash = await bcrypt.hash(newPassword, 12);
    await req.user.save();
    render(res, "auth/change-password", { title: "Change Password", message: "Your password has been changed." });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  renderLogin, renderSignup, signup, login, logout, renderForgotPassword,
  forgotPassword, renderResetPassword, resetPassword, renderChangePassword, changePassword
};
