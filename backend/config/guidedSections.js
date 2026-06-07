const GUIDED_SECTIONS = Object.freeze([
  {
    key: "executiveSummary",
    title: "Executive Summary",
    minWords: 150,
    maxWords: 250,
    helper: "Give a clear overview of the business, owner, location, customers, offer, funding need, and growth opportunity. This section should help a reader understand the whole plan quickly without reading every page. Write confidently, but stay practical and truthful. Mention the strongest reason the business can work and what support or capital is needed.",
    starters: [
      "The business, [business name], is a [type of business] located in [town or province].",
      "It will serve [target customers] by providing [main product or service].",
      "The main opportunity is [market need or customer problem].",
      "The business requires [funding amount] to support [main use of funds].",
      "With this support, the business expects to achieve [growth result or impact]."
    ]
  },
  {
    key: "companyDescription",
    title: "Company Description",
    minWords: 120,
    maxWords: 220,
    helper: "Describe what the business does, where it operates, who owns it, and its current legal or registration position. Explain the problem being solved, the mission, vision, stage of development, and any permits or compliance issues. Make this section feel specific to your actual business rather than a general idea.",
    starters: [
      "[Business name] was formed to [main purpose of the business].",
      "The business is owned and managed by [owner or promoter name].",
      "It operates from [location] and focuses on [industry or sector].",
      "The business is currently at [startup, operating, expansion] stage.",
      "The registration and compliance position is [PACRA, TPIN, permits, or pending items]."
    ]
  },
  {
    key: "competitiveAnalysis",
    title: "Competitive Analysis",
    minWords: 120,
    maxWords: 220,
    helper: "Explain who else serves the same customers and how your business will compete. Mention direct competitors, informal alternatives, substitutes, pricing differences, service quality, location advantages, relationships, delivery speed, or product features. Be honest about gaps. A strong answer shows realistic awareness of the market and a practical advantage.",
    starters: [
      "The main competitors are [competitor names or types].",
      "Customers currently buy from these competitors because [reason].",
      "Our business will compete by offering [price, quality, speed, convenience, or trust advantage].",
      "A key weakness among competitors is [gap you have noticed].",
      "Our main competitive advantage will be [specific advantage]."
    ]
  },
  {
    key: "swotAnalysis",
    title: "SWOT Analysis",
    minWords: 120,
    maxWords: 200,
    helper: "Write the strengths, weaknesses, opportunities, and threats affecting the business. Strengths and weaknesses are internal issues such as skills, equipment, capital, systems, and experience. Opportunities and threats are external issues such as demand, regulation, suppliers, competitors, inflation, technology, and customer behavior. Include enough detail to guide decisions.",
    starters: [
      "The key strengths of the business are [skills, location, relationships, quality, or experience].",
      "The main weaknesses are [capital gap, equipment gap, staffing gap, or market entry challenge].",
      "The biggest opportunities are [demand, partnerships, contracts, growth areas, or new markets].",
      "The main threats are [competition, inflation, regulation, supply risk, or customer changes].",
      "The business will respond to these issues by [practical action]."
    ]
  },
  {
    key: "productsServices",
    title: "Products and Services",
    minWords: 120,
    maxWords: 220,
    helper: "Describe exactly what customers will buy and the value they receive. Include product or service features, quality standards, packaging, pricing logic, delivery method, after-sales support, and future improvements. This section should help a lender or partner picture the offer clearly and understand why customers would choose it.",
    starters: [
      "The main products or services are [list the offer].",
      "Customers will choose them because [value, quality, price, or convenience].",
      "The business will maintain quality by [quality control method].",
      "Pricing will be based on [cost, market price, margin, or customer segment].",
      "Future improvements may include [new products, packaging, delivery, or support]."
    ]
  },
  {
    key: "organizationManagement",
    title: "Organization and Management",
    minWords: 100,
    maxWords: 180,
    helper: "Explain who will run the business and what each key person will do. Include experience, skills, training, responsibilities, staffing needs, payroll assumptions, advisors, and any gaps that must be filled. The goal is to show that capable people and simple management systems can deliver the business plan.",
    starters: [
      "The business will be managed by [name or role].",
      "The promoter has experience in [skills or background].",
      "Key responsibilities will include [operations, finance, sales, procurement, or supervision].",
      "The business will need [number and type of staff].",
      "Any skills gaps will be addressed through [training, hiring, advisors, or partnerships]."
    ]
  },
  {
    key: "marketingSales",
    title: "Marketing and Sales",
    minWords: 120,
    maxWords: 220,
    helper: "Describe your target customers and how you will reach, persuade, sell to, and retain them. Include channels such as referrals, social media, signage, agents, direct visits, partnerships, tenders, repeat contracts, or community networks. Explain how sales will be followed up and how customer trust will be built.",
    starters: [
      "The target customers are [customer groups].",
      "The business will reach these customers through [marketing channels].",
      "Sales will be made by [sales method or process].",
      "Customer trust will be built through [quality, reliability, communication, or after-sales support].",
      "Repeat business will be encouraged by [retention method]."
    ]
  },
  {
    key: "fundingRequest",
    title: "Funding Request",
    minWords: 120,
    maxWords: 220,
    helper: "State how much funding is needed, what it will buy, and how much the owner will contribute. Break down equipment, stock, working capital, permits, transport, marketing, and reserves. If the money is a loan, explain how repayment will be supported by sales, margins, and cash flow.",
    starters: [
      "The business requires total funding of [amount].",
      "The funds will be used for [equipment, stock, working capital, permits, or marketing].",
      "The owner will contribute [amount or assets].",
      "The requested loan or support will cover [specific gap].",
      "Repayment will be supported by [sales, margins, contracts, or cash flow]."
    ]
  },
  {
    key: "financialProjections",
    title: "Financial Projections",
    minWords: 150,
    maxWords: 260,
    helper: "Provide realistic sales, cost, profit, and cash-flow assumptions. Mention expected monthly revenue, direct costs, operating expenses, margins, break-even thinking, seasonal changes, and risks to the numbers. If figures are estimates, say what must be verified with quotations, customer orders, market checks, or supplier information.",
    starters: [
      "The business expects monthly revenue of approximately [amount] based on [sales volume or customers].",
      "Direct costs are expected to include [stock, inputs, transport, labor, or production costs].",
      "Operating expenses will include [rent, salaries, utilities, marketing, or administration].",
      "The business expects to break even when [sales level or condition].",
      "The main financial risks are [risk], and these will be managed by [action]."
    ]
  },
  {
    key: "appendix",
    title: "Appendix",
    minWords: 80,
    maxWords: 160,
    helper: "Add supporting information that strengthens the plan and proves the story behind it. This may include quotations, permits, supplier details, customer letters, owner CV notes, photos, assumptions, repayment schedules, market observations, or useful references. Use this section for evidence, backup notes, and items that would interrupt the main plan.",
    starters: [
      "Supporting documents available include [quotations, permits, photos, letters, or CV notes].",
      "Supplier information includes [supplier names, prices, or terms].",
      "Customer evidence includes [orders, inquiries, letters, or market observations].",
      "Key assumptions used in the plan are [assumptions].",
      "Additional evidence to be attached later includes [missing documents]."
    ]
  }
]);

const GUIDED_FIELDS = Object.freeze(GUIDED_SECTIONS.map((section) => section.key));
const SECTION_TITLES = Object.freeze(Object.fromEntries(GUIDED_SECTIONS.map((section) => [section.key, section.title])));
const WORD_REQUIREMENTS = Object.freeze(Object.fromEntries(GUIDED_SECTIONS.map((section) => [section.key, { minWords: section.minWords, maxWords: section.maxWords, title: section.title }])));

module.exports = { GUIDED_SECTIONS, GUIDED_FIELDS, SECTION_TITLES, WORD_REQUIREMENTS };
