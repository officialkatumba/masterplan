const crypto = require("crypto");
const { Project } = require("../models/planModel");
const { Payment } = require("../models/paymentModel");
const { GUIDED_FIELDS, WORD_REQUIREMENTS } = require("../config/guidedSections");
const { normalizePhone } = require("../config/inputSchema");
const { compileBasicPlan } = require("../services/basicPlanService");
const { createProjectDocx } = require("../services/docxService");
const { polishUserDraft, generateEnhancedProject } = require("../services/openaiService");
const { getMetrics } = require("../services/metricsService");

const PROVIDERS = ["MTN Mobile Money", "Airtel Money", "Vodafone", "Orange"];
const AI_TIMEOUT_MS = Number(process.env.AI_TIMEOUT_MS || 45000);
const ENHANCEMENT_TIMEOUT_MS = Number(process.env.ENHANCEMENT_TIMEOUT_MS || 600000);

function collectSections(body = {}) {
  return Object.fromEntries(GUIDED_FIELDS.map((field) => [field, String(body[field] || "").trim()]));
}

function progress(sections = {}) {
  const completed = GUIDED_FIELDS.filter((field) => String(sections[field] || "").trim()).length;
  return Math.round((completed / GUIDED_FIELDS.length) * 100);
}

function countWords(value = "") {
  return String(value).trim().split(/\s+/).filter(Boolean).length;
}

function validateMinimumWords(sections = {}) {
  return GUIDED_FIELDS
    .map((field) => {
      const requirement = WORD_REQUIREMENTS[field];
      const words = countWords(sections[field]);
      return { field, title: requirement.title, words, minWords: requirement.minWords };
    })
    .filter((item) => item.words < item.minWords);
}

function projectNameFrom(body = {}, sections = {}) {
  return String(body.projectName || body.businessName || sections.executiveSummary || "Untitled Business Plan").trim().split(/\s+/).slice(0, 8).join(" ");
}

function withTimeout(promise, label, timeoutMs = AI_TIMEOUT_MS) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error(`${label} timed out after ${timeoutMs}ms.`)), timeoutMs))
  ]);
}

async function metrics(req, res, next) {
  try {
    res.json(await getMetrics());
  } catch (error) {
    next(error);
  }
}

async function saveDraft(req, res, next) {
  try {
    const project = await Project.findOne({ _id: req.params.id || req.body.projectId, userId: req.user.id }).exec();
    if (!project) return res.status(404).json({ error: "Project not found." });
    const sections = collectSections(req.body);
    project.sections = sections;
    project.projectName = projectNameFrom(req.body, sections);
    project.progressPercent = progress(sections);
    await project.save();
    res.json({ message: "Progress saved.", progressPercent: project.progressPercent, projectId: project.id });
  } catch (error) {
    next(error);
  }
}

async function submitProject(req, res, next) {
  try {
    const project = await Project.findOne({ _id: req.params.id || req.body.projectId, userId: req.user.id }).exec();
    if (!project) return res.status(404).json({ error: "Project not found." });
    const sections = collectSections(req.body);
    project.projectName = projectNameFrom(req.body, sections);
    project.progressPercent = progress(sections);
    const missingMinimums = validateMinimumWords(sections);
    if (missingMinimums.length) {
      return res.status(400).json({
        error: `Please meet the minimum word count before submitting. ${missingMinimums[0].title} needs at least ${missingMinimums[0].minWords} words; currently ${missingMinimums[0].words}.`,
        missingMinimums
      });
    }

    try {
      project.sections = await withTimeout(polishUserDraft(sections), "AI grammar correction");
    } catch (error) {
      console.error("AI grammar correction failed, saving escaped draft:", error.message);
      project.sections = sections;
    }

    project.basicPlan = compileBasicPlan(project.sections);
    project.status = "submitted";
    await project.save();
    res.json({ message: "Project submitted.", redirect: `/project/${project.id}` });
  } catch (error) {
    next(error);
  }
}

async function projectJson(req, res, next) {
  try {
    const query = { _id: req.params.id };
    if (!req.user?.isAdmin) query.userId = req.user.id;
    const project = await Project.findOne(query).lean().exec();
    if (!project) return res.status(404).json({ error: "Project not found." });
    res.json({ project, user: { fullName: req.user.fullName, email: req.user.email, mobileNumber: req.user.mobileNumber || req.user.phone } });
  } catch (error) {
    next(error);
  }
}

async function downloadProjectDocx(req, res, next) {
  try {
    const query = { _id: req.params.id };
    if (!req.user?.isAdmin) query.userId = req.user.id;
    const project = await Project.findOne(query).populate("userId", "fullName email mobileNumber").lean().exec();
    if (!project) return res.status(404).send("Project not found.");
    const owner = project.userId && typeof project.userId === "object" ? project.userId : req.user;
    const buffer = await createProjectDocx({ project, user: owner });
    const filename = `${String(project.projectName || "Business Plan").replace(/[^a-z0-9]+/gi, "_").replace(/^_+|_+$/g, "") || "Business_Plan"}.docx`;
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.wordprocessingml.document");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.setHeader("Content-Length", buffer.length);
    res.send(buffer);
  } catch (error) {
    next(error);
  }
}

async function processPayment(req, res, next) {
  try {
    const project = await Project.findOne({ _id: req.params.id, userId: req.user.id }).exec();
    if (!project) return res.status(404).json({ error: "Project not found." });
    const provider = String(req.body.provider || "");
    const phone = normalizePhone(req.body.phone);
    const amount = Number(process.env.ENHANCEMENT_FEE_AMOUNT || req.body.amount || 10);
    if (!PROVIDERS.includes(provider)) return res.status(400).json({ error: "Choose a supported mobile money provider." });
    if (!/^\+?\d{8,15}$/.test(phone)) return res.status(400).json({ error: "Enter a valid mobile-money phone number." });
    await Payment.create({ userId: req.user.id, planId: project.id, provider, phone, amount, reference: `MM-${crypto.randomBytes(5).toString("hex").toUpperCase()}` });
    project.premiumUnlocked = true;
    await project.save();
    res.json({ message: "Payment confirmed.", redirect: `/project/${project.id}` });
  } catch (error) {
    next(error);
  }
}

async function enhancePlan(req, res, next) {
  try {
    const project = await Project.findOne({ _id: req.params.id, userId: req.user.id }).exec();
    if (!project) return res.status(404).json({ error: "Project not found." });
    if (!project.premiumUnlocked) return res.status(402).json({ error: "Confirm mobile money payment before enhancement." });
    const enhanced = await withTimeout(generateEnhancedProject({ projectName: project.projectName, sections: project.sections }), "Enhanced plan expansion", ENHANCEMENT_TIMEOUT_MS);
    project.sections = enhanced.sections;
    project.enhancedData = enhanced.enhancedData;
    project.enhanced = true;
    project.enhancedAt = new Date();
    project.aiEnhancedPlan = compileBasicPlan(enhanced.sections);
    await project.save();
    res.json({ message: "Project enhanced.", redirect: `/project/${project.id}` });
  } catch (error) {
    next(error);
  }
}

async function deleteProject(req, res, next) {
  try {
    const deleted = await Project.findOneAndDelete({ _id: req.params.id, userId: req.user.id }).exec();
    if (!deleted) return res.status(404).json({ error: "Project not found." });
    await Payment.deleteMany({ planId: req.params.id, userId: req.user.id });
    res.json({ message: "Project deleted." });
  } catch (error) {
    next(error);
  }
}

module.exports = { metrics, saveDraft, submitProject, projectJson, downloadProjectDocx, processPayment, enhancePlan, deleteProject };
