const OpenAI = require("openai");
const { SECTION_KEYS, PLAN_SECTIONS } = require("../config/planSections");

const GENERATION_MODEL = process.env.OPENAI_MODEL || process.env.AI_MODEL || "gpt-4o";
const GENERATION_MAX_OUTPUT_TOKENS = Number(process.env.AI_MAX_OUTPUT_TOKENS || 16384);
const ENHANCED_SECTION_MAX_OUTPUT_TOKENS = Number(process.env.ENHANCED_SECTION_MAX_OUTPUT_TOKENS || 5500);

const sectionStringProperties = Object.fromEntries(SECTION_KEYS.map((key) => [key, { type: "string" }]));

const correctedSectionsSchema = {
  type: "object",
  additionalProperties: false,
  required: SECTION_KEYS,
  properties: sectionStringProperties
};

const enhancedSectionSchema = {
  type: "object",
  additionalProperties: false,
  required: ["content", "knowledgeSummary"],
  properties: {
    content: { type: "string" },
    knowledgeSummary: { type: "string" }
  }
};

const enhancedProjectSchema = {
  type: "object",
  additionalProperties: false,
  required: ["sections", "enhancedData"],
  properties: {
    sections: correctedSectionsSchema,
    enhancedData: {
      type: "object",
      additionalProperties: false,
      required: ["marketTrends", "riskAnalysis", "industryBenchmarks", "recommendations", "expandedFinancials", "fullEnhancedContent"],
      properties: {
        marketTrends: { type: "string" },
        riskAnalysis: { type: "string" },
        industryBenchmarks: { type: "string" },
        recommendations: { type: "string" },
        expandedFinancials: { type: "string" },
        fullEnhancedContent: { type: "string" }
      }
    }
  }
};

const SECTION_EXPANSION_GUIDANCE = Object.freeze({
  executiveSummary: {
    target: "900-1,100 words",
    instruction: [
      "Expand the user's opening into a flowing investor-ready executive summary.",
      "Weave in financial highlights with a compact 3-year projection table.",
      "Add 4-6 milestones with target months.",
      "Acknowledge critical risks and practical mitigation.",
      "Strengthen the investor or lender value proposition.",
      "Clarify the specific funding ask, use of funds, and expected outcome."
    ]
  },
  companyDescription: {
    target: "850-1,050 words",
    instruction: [
      "Expand the company description with mission, vision, operating model, legal or registration position, and business stage.",
      "Explain how the company makes money through revenue streams and pricing logic.",
      "Add location advantages such as customer proximity, logistics, talent, suppliers, and compliance context.",
      "Include short-term, 3-year, and 5-year goals in a compact table.",
      "Add 3-5 core values with practical examples in daily operations."
    ]
  },
  competitiveAnalysis: {
    target: "1,100-1,400 words",
    instruction: [
      "Expand competitor mentions into a comprehensive market understanding.",
      "Add a competitor matrix comparing 4-6 direct or indirect competitors by price, offer, target market, strength, weakness, and estimated market position.",
      "Add a positioning statement explaining where the business fits in the market.",
      "Add barriers to entry such as relationships, service quality, supply chain, brand, technology, or capital needs.",
      "Add a winning strategy with practical actions for taking customers from alternatives."
    ]
  },
  swotAnalysis: {
    target: "700-900 words",
    instruction: [
      "Turn the user's SWOT into an actionable strategy tool.",
      "Complete any missing strengths, weaknesses, opportunities, and threats using realistic industry logic.",
      "Add a strategic action table covering SO, WO, ST, and WT strategies.",
      "Rank actions by High, Medium, or Low priority and add a rough timeline.",
      "Add 3-5 priorities for the next 90 days."
    ]
  },
  productsServices: {
    target: "1,300-1,600 words",
    instruction: [
      "Expand the product or service description into a full product strategy.",
      "Add a pricing tier table with packages, features, prices or price logic, and target customers.",
      "Add a 12-24 month product or service roadmap table.",
      "Describe the customer journey from awareness to repeat purchase or advocacy.",
      "Add intellectual-property or defensibility strategy such as brand, trade secrets, supplier terms, process know-how, data, or trademarks.",
      "Add future pipeline items with estimated timing."
    ]
  },
  organizationManagement: {
    target: "850-1,050 words",
    instruction: [
      "Expand the team section into a complete organizational plan.",
      "Add a text-based organizational chart showing roles, reporting lines, and gaps to fill.",
      "Suggest 2-4 advisory roles with the expertise required.",
      "Add a 12-month hiring table with role, target month, salary or compensation range, and reporting line.",
      "Add a culture statement and employee value proposition.",
      "Add role KPIs showing how success will be measured."
    ]
  },
  marketingSales: {
    target: "1,300-1,600 words",
    instruction: [
      "Expand the marketing ideas into a data-driven acquisition and retention strategy.",
      "Add a channel mix table with budget allocation, estimated CAC, expected leads, and role in the funnel.",
      "Add CAC versus LTV logic with clear assumptions.",
      "Add a sales funnel table with stages, conversion rates, and target volumes.",
      "Add a 12-month marketing calendar with activities, goals, and budget logic.",
      "Add a 5-7 step sales process from lead generation through retention."
    ]
  },
  fundingRequest: {
    target: "700-900 words",
    instruction: [
      "Expand the funding request into a professional financing memorandum.",
      "Add a use-of-funds table with category, amount, percentage, and timing.",
      "Add runway analysis showing estimated monthly burn and how long the funding should last.",
      "Add investor or lender return logic for Year 3 and Year 5 using realistic scenarios.",
      "Add suitable terms depending on whether the plan reads as debt, grant, or equity finance."
    ]
  },
  financialProjections: {
    target: "1,300-1,600 words",
    instruction: [
      "Expand the user's financial notes into a complete financial model narrative.",
      "Add a Year 1 monthly projection table covering revenue, COGS, operating expenses, net profit, and cash balance.",
      "Add a 5-year annual summary table with revenue, gross margin, EBITDA, net profit, and cash flow.",
      "Add a key assumptions table with growth, margins, CAC, churn or retention, pricing, working capital, and justification.",
      "Add break-even analysis with estimated break-even month and revenue needed.",
      "Add sensitivity analysis for best case, base case, and worst case."
    ]
  },
  appendix: {
    target: "800-1,100 words",
    instruction: [
      "Build a professional appendix that supports the claims made in the main document.",
      "Add founder or promoter professional summaries based only on available information and reasonable role assumptions.",
      "Add market-data excerpts or benchmark notes with cautious source-style wording where appropriate.",
      "Add product visuals or user-flow descriptions when actual visuals are not available.",
      "Add a permits and licenses table with status and expected next steps.",
      "Add customer validation placeholders only when evidence is missing, clearly stated as to be collected.",
      "Add a quarterly financial backup table for 12 quarters using realistic estimates from the plan."
    ]
  }
});

function getClient() {
  const apiKey = process.env.OPENAI_API_KEY || process.env.AI_API_KEY;
  if (!apiKey) {
    const error = new Error("AI_API_KEY or OPENAI_API_KEY is not configured on the server.");
    error.status = 503;
    throw error;
  }
  return new OpenAI({ apiKey });
}

function snippet(value = "", maxWords = 90) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .trim()
    .split(/\s+/)
    .slice(0, maxWords)
    .join(" ");
}

function buildEnhancedData(enhancedSections = {}) {
  return {
    marketTrends: snippet(`${enhancedSections.competitiveAnalysis || ""} ${enhancedSections.marketingSales || ""}`, 120),
    riskAnalysis: snippet(`${enhancedSections.swotAnalysis || ""} ${enhancedSections.fundingRequest || ""}`, 120),
    industryBenchmarks: snippet(`${enhancedSections.financialProjections || ""} ${enhancedSections.productsServices || ""}`, 120),
    recommendations: snippet(`${enhancedSections.executiveSummary || ""} ${enhancedSections.organizationManagement || ""}`, 120),
    expandedFinancials: snippet(`${enhancedSections.fundingRequest || ""} ${enhancedSections.financialProjections || ""}`, 140),
    fullEnhancedContent: SECTION_KEYS.map((key) => `## ${PLAN_SECTIONS[key]}\n${snippet(enhancedSections[key], 160)}`).join("\n\n")
  };
}

async function polishUserDraft(sections) {
  const client = getClient();
  const response = await client.responses.create({
    model: GENERATION_MODEL,
    max_output_tokens: 5000,
    instructions: [
      "You are a grammar and spelling correction editor.",
      "Correct grammar, spelling, punctuation, clarity, and capitalization only.",
      "Do not add new ideas, remove meaning, change business assumptions, or expand the user's content.",
      "Return plain text for every requested business plan section. Do not use Markdown or HTML."
    ].join(" "),
    input: JSON.stringify({ sectionTitles: PLAN_SECTIONS, sections }, null, 2),
    text: {
      format: {
        type: "json_schema",
        name: "corrected_business_plan_sections",
        strict: true,
        schema: correctedSectionsSchema
      }
    }
  });
  return JSON.parse(response.output_text);
}

async function enhanceSection({ client, projectName, sectionKey, sections }) {
  const sectionTitle = PLAN_SECTIONS[sectionKey];
  const guidance = SECTION_EXPANSION_GUIDANCE[sectionKey];
  const response = await client.responses.create({
    model: GENERATION_MODEL,
    max_output_tokens: ENHANCED_SECTION_MAX_OUTPUT_TOKENS,
    instructions: [
      "You are a senior business-plan expansion specialist writing as the business owner.",
      "Expand the user's existing content; do not append a separate analysis section after it.",
      "Preserve the user's original meaning, claims, tone, and recognizable opening where possible.",
      "Do not delete or contradict any original statement.",
      "Infuse professional investor and lender knowledge throughout the original writing.",
      "Add realistic industry benchmarks, market trends, operational practices, financial-modeling norms, competitive dynamics, and risk mitigation based on the business area.",
      "Use cautious benchmark wording when exact project data is missing; do not invent audited financials, signed contracts, approvals, licenses, registrations, or named sources that the user did not provide.",
      "Never mention AI, generated content, model knowledge, or that anything was added.",
      "Never use headings such as Additional Insights, AI Insights, Generated Analysis, or similar.",
      "Use confident business-owner language, not academic commentary.",
      "Use simple markdown tables where the instructions call for tables. Do not use code fences.",
      "Do not repeat the main section title at the start because the application already prints it."
    ].join(" "),
    input: JSON.stringify({
      projectName,
      sectionKey,
      sectionTitle,
      targetLength: guidance.target,
      sectionExpansionInstructions: guidance.instruction,
      originalSectionContent: sections[sectionKey] || "",
      fullOriginalPlanForContext: SECTION_KEYS.map((key) => ({
        key,
        title: PLAN_SECTIONS[key],
        content: sections[key] || ""
      }))
    }, null, 2),
    text: {
      format: {
        type: "json_schema",
        name: "enhanced_business_plan_section",
        strict: true,
        schema: enhancedSectionSchema
      }
    }
  });

  return JSON.parse(response.output_text);
}

async function generateEnhancedProject({ projectName, sections }) {
  const client = getClient();
  const enhancedSections = {};

  for (const sectionKey of SECTION_KEYS) {
    const result = await enhanceSection({ client, projectName, sectionKey, sections });
    enhancedSections[sectionKey] = result.content;
  }

  const normalizedSections = Object.fromEntries(SECTION_KEYS.map((key) => [key, enhancedSections[key] || sections[key] || ""]));

  return {
    sections: normalizedSections,
    enhancedData: buildEnhancedData(normalizedSections)
  };
}

module.exports = {
  GENERATION_MAX_OUTPUT_TOKENS,
  ENHANCED_SECTION_MAX_OUTPUT_TOKENS,
  polishUserDraft,
  generateEnhancedProject,
  enhancedProjectSchema
};
