const { SECTION_KEYS, PLAN_SECTIONS } = require("../config/planSections");
const { sanitizePlanHtml } = require("./htmlSanitizer");

function escapeHtml(value = "") {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function paragraphs(value = "") {
  const text = String(value || "").trim();
  if (!text) return "<p>No details entered yet.</p>";
  return text
    .split(/\n+/)
    .filter(Boolean)
    .map((item) => `<p>${escapeHtml(item)}</p>`)
    .join("");
}

function compileBasicPlan(sections = {}) {
  return Object.fromEntries(
    SECTION_KEYS.map((key) => [
      key,
      {
        title: PLAN_SECTIONS[key],
        content: sanitizePlanHtml(paragraphs(sections[key]))
      }
    ])
  );
}

module.exports = { compileBasicPlan, escapeHtml };
