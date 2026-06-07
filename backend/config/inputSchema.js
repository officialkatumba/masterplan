const INPUT_FIELDS = Object.freeze([
  "phone",
  "email",
  "businessName",
  "directorName",
  "location",
  "industryVertical",
  "legalStructure",
  "regulatoryPermits",
  "coreValueProposition",
  "revenueModel",
  "capitalContributionSplit",
  "startupCapitalNeed",
  "workingCapitalCycle",
  "foundersSkillsExperience",
  "staffingRequirements",
  "expectedMarketTrends",
  "knownCompetitors",
  "operationalRisks",
  "contingencyPlan"
]);

function normalizePhone(value = "") {
  return String(value).replace(/[^\d+]/g, "").trim();
}

function normalizeEmail(value = "") {
  return String(value).trim().toLowerCase();
}

function fallbackEmail(phone) {
  return `${phone}@gmail.com`;
}

function normalizeBusinessPlanInput(rawInput = {}, sessionUser = {}) {
  const input = {};

  for (const field of INPUT_FIELDS) {
    input[field] = String(rawInput[field] || "").trim();
  }

  input.phone = normalizePhone(input.phone || sessionUser.phone);
  input.email = normalizeEmail(input.email || sessionUser.email || fallbackEmail(input.phone));

  return input;
}

module.exports = {
  INPUT_FIELDS,
  normalizePhone,
  normalizeEmail,
  fallbackEmail,
  normalizeBusinessPlanInput
};
