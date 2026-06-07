const { Project } = require("../models/planModel");
const { User } = require("../models/userModel");
const { Payment } = require("../models/paymentModel");
const { GUIDED_SECTIONS } = require("../config/guidedSections");
const { getMetrics } = require("../services/metricsService");
const { renderPlanTextHtml } = require("../services/planTextRenderer");

function renderHome(req, res) {
  res.render("home", { title: "Business Plan Generator", user: req.user || null });
}

async function renderDashboard(req, res, next) {
  try {
    const projects = await Project.find({ userId: req.user.id }).sort({ updatedAt: -1 }).lean().exec();
    res.render("dashboard", { title: "Dashboard", user: req.user, projects, plans: projects });
  } catch (error) {
    next(error);
  }
}

async function renderNewPlan(req, res, next) {
  try {
    const project = await Project.create({ userId: req.user.id, projectName: "Untitled Business Plan" });
    res.redirect(`/project/${project.id}/edit`);
  } catch (error) {
    next(error);
  }
}

async function renderEditPlan(req, res, next) {
  try {
    const project = await Project.findOne({ _id: req.params.id, userId: req.user.id }).lean().exec();
    if (!project) return res.status(404).render("error", { title: "Project not found", message: "That business plan project does not exist." });
    res.render("plan-form", { title: "Guided Project Form", user: req.user, project, plan: project, guidedSections: GUIDED_SECTIONS });
  } catch (error) {
    next(error);
  }
}

async function renderResult(req, res, next) {
  try {
    const query = { _id: req.params.id };
    if (!req.user?.isAdmin) query.userId = req.user.id;
    const project = await Project.findOne(query).populate("userId", "fullName email mobileNumber").lean().exec();
    if (!project) return res.status(404).render("error", { title: "Project not found", message: "That business plan project does not exist." });
    res.render("plan-result", { title: "View Project", user: req.user, project, plan: project, readonly: Boolean(req.user?.isAdmin && String(project.userId?._id || project.userId) !== req.user.id), renderPlanText: renderPlanTextHtml });
  } catch (error) {
    next(error);
  }
}

async function renderPayment(req, res, next) {
  try {
    const project = await Project.findOne({ _id: req.params.id, userId: req.user.id }).lean().exec();
    if (!project) return res.status(404).render("error", { title: "Project not found", message: "That business plan project does not exist." });
    res.render("payment", {
      title: "Mobile Money Enhancement",
      user: req.user,
      project,
      plan: project,
      premiumAmount: Number(process.env.ENHANCEMENT_FEE_AMOUNT || 10),
      premiumCurrency: process.env.ENHANCEMENT_FEE_CURRENCY || "USD",
      merchantNumber: process.env.MOBILE_MONEY_MERCHANT_NUMBER || "+1234567890"
    });
  } catch (error) {
    next(error);
  }
}

async function renderAdmin(req, res, next) {
  try {
    const [metrics, users, payments] = await Promise.all([
      getMetrics(),
      User.aggregate([
        {
          $lookup: {
            from: "projects",
            localField: "_id",
            foreignField: "userId",
            as: "projects"
          }
        },
        {
          $project: {
            fullName: 1,
            email: 1,
            mobileNumber: 1,
            createdAt: 1,
            isAdmin: 1,
            projectCount: { $size: "$projects" }
          }
        },
        { $sort: { createdAt: -1 } }
      ]),
      Payment.find({ status: "received" }).lean().exec()
    ]);
    const amount = Number(process.env.ENHANCEMENT_FEE_AMOUNT || 10);
    res.render("admin-dashboard", {
      title: "Admin Panel",
      user: req.user,
      metrics,
      users,
      totalRevenue: payments.length * amount,
      revenueCurrency: process.env.ENHANCEMENT_FEE_CURRENCY || "USD"
    });
  } catch (error) {
    next(error);
  }
}

module.exports = { renderHome, renderDashboard, renderNewPlan, renderEditPlan, renderResult, renderPayment, renderAdmin };
