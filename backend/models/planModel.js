const mongoose = require("mongoose");
const { GUIDED_FIELDS } = require("../config/guidedSections");

const sectionShape = Object.fromEntries(GUIDED_FIELDS.map((key) => [key, { type: String, default: "" }]));

const enhancedDataSchema = new mongoose.Schema(
  {
    marketTrends: { type: String, default: "" },
    riskAnalysis: { type: String, default: "" },
    industryBenchmarks: { type: String, default: "" },
    recommendations: { type: String, default: "" },
    expandedFinancials: { type: String, default: "" },
    fullEnhancedContent: { type: String, default: "" }
  },
  { _id: false }
);

const planSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: "User", index: true },
    projectName: { type: String, default: "Untitled Business Plan", trim: true },
    enhanced: { type: Boolean, default: false, index: true },
    enhancedAt: { type: Date, default: null },
    sections: { type: new mongoose.Schema(sectionShape, { _id: false }), default: () => ({}) },
    enhancedData: { type: enhancedDataSchema, default: () => ({}) },
    status: { type: String, enum: ["draft", "submitted", "enhanced"], default: "draft" },
    progressPercent: { type: Number, default: 0, min: 0, max: 100 },

    input: { type: mongoose.Schema.Types.Mixed, default: {} },
    basicPlan: { type: mongoose.Schema.Types.Mixed, default: {} },
    aiEnhancedPlan: { type: mongoose.Schema.Types.Mixed, default: {} },
    premiumUnlocked: { type: Boolean, default: false }
  },
  { timestamps: true }
);

planSchema.index({ userId: 1, updatedAt: -1 });

planSchema.pre("save", function syncCompatibilityFields() {
  const sections = this.sections || {};
  this.input = { ...this.input, ...Object.fromEntries(GUIDED_FIELDS.map((key) => [key, sections[key] || ""])) };
  if (sections.executiveSummary && (!this.projectName || this.projectName === "Untitled Business Plan")) {
    this.projectName = String(sections.executiveSummary).split(/\s+/).slice(0, 6).join(" ") || this.projectName;
  }
  if (this.enhanced) {
    this.status = "enhanced";
    this.premiumUnlocked = true;
  }
});

const Plan = mongoose.model("Project", planSchema);
const Project = Plan;

function createDraft({ userId, sections = {}, projectName = "Untitled Business Plan" }) {
  return Project.create({ userId, sections, projectName, status: "draft" });
}

function findByIdForUser(planId, userId) {
  return Project.findOne({ _id: planId, userId }).exec();
}

function findByIdForAdmin(planId) {
  return Project.findById(planId).populate("userId", "fullName email mobileNumber").exec();
}

function listByUser(userId) {
  return Project.find({ userId }).sort({ updatedAt: -1 }).lean().exec();
}

module.exports = { Plan, Project, createDraft, findByIdForUser, findByIdForAdmin, listByUser };
