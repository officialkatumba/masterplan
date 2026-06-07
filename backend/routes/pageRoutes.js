const express = require("express");
const controller = require("../controllers/pageController");
const { requireAuth } = require("../middleware/auth");
const { requireAdmin } = require("../middleware/admin");

const router = express.Router();

router.get("/", controller.renderHome);
router.get("/dashboard", requireAuth, controller.renderDashboard);
router.get("/project/new", requireAuth, controller.renderNewPlan);
router.get("/project/:id/edit", requireAuth, controller.renderEditPlan);
router.get("/project/:id", requireAuth, controller.renderResult);
router.get("/project/:id/payment", requireAuth, controller.renderPayment);
router.get("/admin", requireAdmin, controller.renderAdmin);
router.get("/admin/users", requireAdmin, controller.renderAdmin);
router.get("/admin/project/:id", requireAdmin, controller.renderResult);

router.get("/plans/new", requireAuth, controller.renderNewPlan);
router.get("/plans/:id/edit", requireAuth, controller.renderEditPlan);
router.get("/plans/:id/result", requireAuth, controller.renderResult);
router.get("/plans/:id/payment", requireAuth, controller.renderPayment);

module.exports = router;
