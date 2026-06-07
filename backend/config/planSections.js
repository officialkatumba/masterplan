const { GUIDED_SECTIONS, GUIDED_FIELDS, SECTION_TITLES } = require("./guidedSections");

const PLAN_SECTIONS = SECTION_TITLES;
const SECTION_KEYS = GUIDED_FIELDS;

function emptyBusinessPlan() {
  return Object.fromEntries(SECTION_KEYS.map((key) => [key, { title: PLAN_SECTIONS[key], content: "" }]));
}

module.exports = { GUIDED_SECTIONS, PLAN_SECTIONS, SECTION_KEYS, emptyBusinessPlan };
