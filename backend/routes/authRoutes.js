const express = require("express");
const controller = require("../controllers/authController");
const { redirectIfAuthenticated, requireAuth } = require("../middleware/auth");
const { verifyCsrfToken } = require("../middleware/csrf");

const router = express.Router();

router.get("/login", redirectIfAuthenticated, controller.renderLogin);
router.post("/login", redirectIfAuthenticated, verifyCsrfToken, controller.login);
router.get("/signup", redirectIfAuthenticated, controller.renderSignup);
router.post("/signup", redirectIfAuthenticated, verifyCsrfToken, controller.signup);
router.get("/register", redirectIfAuthenticated, controller.renderSignup);
router.post("/register", redirectIfAuthenticated, verifyCsrfToken, controller.signup);
router.get("/logout", requireAuth, controller.logout);
router.post("/logout", requireAuth, verifyCsrfToken, controller.logout);
router.get("/forgot-password", redirectIfAuthenticated, controller.renderForgotPassword);
router.post("/forgot-password", redirectIfAuthenticated, verifyCsrfToken, controller.forgotPassword);
router.get("/reset-password/:token", redirectIfAuthenticated, controller.renderResetPassword);
router.post("/reset-password/:token", redirectIfAuthenticated, verifyCsrfToken, controller.resetPassword);
router.get("/account/password", requireAuth, controller.renderChangePassword);
router.post("/account/password", requireAuth, verifyCsrfToken, controller.changePassword);

module.exports = router;
