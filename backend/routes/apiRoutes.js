const express = require("express");
const rateLimit = require("express-rate-limit");
const controller = require("../controllers/planController");
const { requireAuth } = require("../middleware/auth");
const { verifyCsrfToken } = require("../middleware/csrf");

const router = express.Router();
const aiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { error: "Too many AI requests. Please wait a few minutes and try again." }
});

router.get("/metrics", controller.metrics);

router.use(requireAuth);
router.get("/project/:id", controller.projectJson);
router.get("/project/:id/download", controller.downloadProjectDocx);
router.use(verifyCsrfToken);
router.post("/project/:id/save", controller.saveDraft);
router.post("/project/save", controller.saveDraft);
router.post("/project/:id/submit", aiLimiter, controller.submitProject);
router.post("/project/submit", aiLimiter, controller.submitProject);
router.post("/project/:id/payment", controller.processPayment);
router.post("/project/:id/enhance", aiLimiter, controller.enhancePlan);
router.delete("/project/:id", controller.deleteProject);

router.post("/plans/:id/save", controller.saveDraft);
router.post("/plans/:id/compile", aiLimiter, controller.submitProject);
router.post("/plans/:id/payment", controller.processPayment);
router.post("/plans/:id/enhance", aiLimiter, controller.enhancePlan);

module.exports = router;
