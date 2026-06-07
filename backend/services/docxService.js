const HTMLtoDOCX = require("html-to-docx");
const {
  AlignmentType,
  BorderStyle,
  Document,
  HeadingLevel,
  PageBreak,
  Packer,
  Paragraph,
  ShadingType,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType
} = require("docx");
const { sanitizePlanHtml } = require("./htmlSanitizer");
const { isMarkdownTableRow, isMarkdownTableSeparator, parseMarkdownTableRow } = require("./planTextRenderer");
const { GUIDED_SECTIONS } = require("../config/guidedSections");

const COLORS = Object.freeze({
  ink: "101828",
  muted: "475467",
  blue: "173B8F",
  brightBlue: "2563EB",
  purple: "5F2C82",
  pink: "BE123C",
  red: "E11D48",
  green: "059669",
  orange: "F97316",
  line: "CBD5E1",
  softBlue: "EAF1FF",
  softPink: "FCE7F3",
  softPurple: "F3E8FF",
  softGreen: "DCFCE7",
  softOrange: "FFEDD5",
  slate: "F8FAFC",
  white: "FFFFFF"
});

function cleanText(value = "") {
  return String(value || "")
    .replace(/\r/g, "")
    .replace(/\*\*/g, "")
    .replace(/\*/g, "")
    .replace(/#{1,6}\s?/g, "")
    .replace(/`/g, "")
    .replace(/_{2,}/g, "")
    .replace(/-{3,}/g, "")
    .replace(/\[|\]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function escapeHtml(value = "") {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function wordCount(value = "") {
  return cleanText(value).split(/\s+/).filter(Boolean).length;
}

function titleFromKey(key = "") {
  return String(key).replace(/([A-Z])/g, " $1").replace(/^./, (char) => char.toUpperCase());
}

function tableBorders(color = COLORS.line) {
  return {
    top: { style: BorderStyle.SINGLE, size: 1, color },
    bottom: { style: BorderStyle.SINGLE, size: 1, color },
    left: { style: BorderStyle.SINGLE, size: 1, color },
    right: { style: BorderStyle.SINGLE, size: 1, color }
  };
}

function createParagraph(text, options = {}) {
  return new Paragraph({
    alignment: options.alignment || AlignmentType.LEFT,
    bullet: options.bullet ? { level: 0 } : undefined,
    heading: options.heading,
    spacing: {
      before: options.before ?? 0,
      after: options.after ?? 150,
      line: options.line ?? 276
    },
    border: options.border,
    children: [
      new TextRun({
        text: cleanText(text),
        bold: Boolean(options.bold),
        italics: Boolean(options.italics),
        size: options.size || 22,
        color: options.color || COLORS.ink
      })
    ]
  });
}

function createCell(children, options = {}) {
  const content = Array.isArray(children) ? children : [createParagraph(children)];
  return new TableCell({
    width: options.width ? { size: options.width, type: WidthType.PERCENTAGE } : undefined,
    shading: options.fill ? { type: ShadingType.CLEAR, fill: options.fill } : undefined,
    borders: tableBorders(options.borderColor || COLORS.line),
    margins: {
      top: options.margin ?? 120,
      bottom: options.margin ?? 120,
      left: options.margin ?? 140,
      right: options.margin ?? 140
    },
    children: content
  });
}

function createTable(rows, options = {}) {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: rows.map((row, rowIndex) => {
      const isHeader = Boolean(options.header && rowIndex === 0);
      return new TableRow({
        tableHeader: isHeader,
        children: row.map((cell, cellIndex) => {
          const value = typeof cell === "object" && cell !== null ? cell : { text: cell };
          const fill = value.fill || (isHeader ? options.headerFill || COLORS.blue : cellIndex === 0 && options.firstColumnFill ? options.firstColumnFill : undefined);
          const color = value.color || (isHeader || fill === COLORS.blue || fill === COLORS.purple || fill === COLORS.pink ? COLORS.white : cellIndex === 0 && options.firstColumnFill ? COLORS.blue : COLORS.ink);
          return createCell([
            createParagraph(value.text, {
              bold: isHeader || Boolean(value.bold) || (cellIndex === 0 && options.boldFirstColumn),
              color,
              size: value.size || 21,
              after: 40
            })
          ], {
            width: value.width,
            fill,
            borderColor: options.borderColor
          });
        })
      });
    })
  });
}

function createSectionHeading(number, title) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 300, after: 150 },
    border: {
      bottom: { color: COLORS.brightBlue, space: 6, style: BorderStyle.SINGLE, size: 8 }
    },
    children: [
      new TextRun({ text: `${String(number).padStart(2, "0")}  `, bold: true, size: 24, color: COLORS.pink }),
      new TextRun({ text: cleanText(title), bold: true, size: 28, color: COLORS.blue })
    ]
  });
}

function textToParagraphs(text = "") {
  const lines = String(text || "")
    .replace(/\r/g, "")
    .split("\n")
    .map((line) => line.trim());
  const blocks = [];

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    if (!line) continue;

    if (isMarkdownTableRow(line) && isMarkdownTableSeparator(lines[index + 1])) {
      const tableLines = [line, lines[index + 1]];
      index += 2;
      while (index < lines.length && isMarkdownTableRow(lines[index])) {
        tableLines.push(lines[index]);
        index += 1;
      }
      index -= 1;
      const tableRows = tableLines
        .filter((_, rowIndex) => rowIndex !== 1)
        .map(parseMarkdownTableRow);
      blocks.push(createTable(tableRows, {
        header: true,
        headerFill: COLORS.purple,
        firstColumnFill: COLORS.softBlue,
        boldFirstColumn: true
      }));
      continue;
    }

    if (/^#{3,6}\s+/.test(line)) {
      blocks.push(createParagraph(line.replace(/^#{3,6}\s+/, ""), { bold: true, color: COLORS.pink, size: 24, before: 160, after: 90 }));
      continue;
    }

    if (/^[-+]\s+/.test(line)) {
      blocks.push(createParagraph(line.replace(/^[-+]\s+/, ""), { bullet: true }));
      continue;
    }

    blocks.push(createParagraph(line.replace(/^#{1,2}\s+/, "")));
  }

  if (!blocks.length) return [createParagraph("No content recorded for this section.", { italics: true, color: COLORS.muted })];
  return blocks;
}

function splitSentences(text = "") {
  return String(text || "")
    .replace(/\n+/g, " ")
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => cleanText(sentence))
    .filter(Boolean);
}

function sectionTitleFor(key) {
  return GUIDED_SECTIONS.find((section) => section.key === key)?.title || titleFromKey(key);
}

function extractFigures(project = {}, onlySectionKey) {
  const sections = project.sections || {};
  const priorityKeys = onlySectionKey
    ? [onlySectionKey]
    : ["fundingRequest", "financialProjections", "executiveSummary", "organizationManagement", "marketingSales", "productsServices"];
  const figureRegex = /(?:ZMW|K|USD|\$)\s?[\d,]+(?:\.\d+)?(?:\s?(?:million|m|k))?|\b\d+(?:,\d{3})*(?:\.\d+)?\s?(?:%|percent|orders|customers|staff|employees|months|years|days|weeks|units|minutes)\b/gi;
  const rows = [];
  const seen = new Set();

  priorityKeys.forEach((key) => {
    splitSentences(sections[key]).forEach((sentence) => {
      const matches = sentence.match(figureRegex) || [];
      matches.forEach((match) => {
        const figure = cleanText(match);
        const context = sentence.length > 155 ? `${sentence.slice(0, 152)}...` : sentence;
        const signature = `${key}:${figure}:${context}`;
        if (seen.has(signature)) return;
        seen.add(signature);
        rows.push({ section: sectionTitleFor(key), figure, context });
      });
    });
  });

  return rows.slice(0, onlySectionKey ? 8 : 12);
}

function createFiguresTable(rows, options = {}) {
  if (!rows.length) {
    return createParagraph("No clear numeric figures were detected in this section.", { italics: true, color: COLORS.muted });
  }
  const tableRows = options.includeSection
    ? [["Source", "Figure", "Context"], ...rows.map((row) => [row.section, row.figure, row.context])]
    : [["Figure", "Context"], ...rows.map((row) => [row.figure, row.context])];

  return createTable(tableRows, {
    header: true,
    headerFill: options.headerFill || COLORS.purple,
    firstColumnFill: COLORS.softBlue,
    boldFirstColumn: true
  });
}

function extractSwotRows(text = "") {
  const sentences = splitSentences(text);
  const categories = [
    ["Strengths", /strength/i, COLORS.softGreen],
    ["Weaknesses", /weakness/i, COLORS.softOrange],
    ["Opportunities", /opportunit/i, COLORS.softBlue],
    ["Threats", /threat/i, COLORS.softPink]
  ];

  return categories.map(([label, pattern, fill]) => {
    const value = sentences.find((sentence) => pattern.test(sentence)) || "Not clearly stated. Add a specific note here during final review.";
    return [{ text: label, fill, bold: true, color: COLORS.blue, width: 28 }, { text: value, width: 72 }];
  });
}

function createContentsTable(project = {}) {
  const sections = project.sections || {};
  const rows = [["No.", "Section", "Word Count"]];
  GUIDED_SECTIONS.forEach((section, index) => {
    rows.push([String(index + 1).padStart(2, "0"), section.title, `${wordCount(sections[section.key])} words`]);
  });
  return createTable(rows, {
    header: true,
    headerFill: COLORS.blue,
    firstColumnFill: COLORS.softBlue,
    boldFirstColumn: true
  });
}

function createSnapshotTable({ project, author, completedSections }) {
  const generatedOn = new Date().toLocaleDateString("en-GB");
  const rows = [
    ["Business / Project", project.projectName || "Business Plan"],
    ["Prepared By", author],
    ["Generated On", generatedOn],
    ["Document Type", project.enhanced ? "Enhanced Professional Business Plan" : "Professional Business Plan"],
    ["Project Status", project.status || "submitted"],
    ["Sections Completed", `${completedSections} of ${GUIDED_SECTIONS.length}`]
  ];

  return createTable(rows, {
    firstColumnFill: COLORS.softPurple,
    boldFirstColumn: true
  });
}

function createCoverPage({ project, author, completedSections }) {
  return [
    createParagraph("MASTERPLAN", {
      alignment: AlignmentType.CENTER,
      bold: true,
      color: COLORS.pink,
      size: 24,
      after: 180
    }),
    createParagraph(project.projectName || "Business Plan", {
      alignment: AlignmentType.CENTER,
      bold: true,
      color: COLORS.blue,
      size: 44,
      line: 320,
      after: 120
    }),
    createParagraph("Professional Business Plan", {
      alignment: AlignmentType.CENTER,
      bold: true,
      color: COLORS.purple,
      size: 26,
      after: 80
    }),
    createParagraph(`Prepared by ${author}`, {
      alignment: AlignmentType.CENTER,
      color: COLORS.muted,
      size: 22,
      after: 60
    }),
    createParagraph(`Generated on ${new Date().toLocaleDateString("en-GB")}`, {
      alignment: AlignmentType.CENTER,
      color: COLORS.muted,
      size: 20,
      after: 300
    }),
    createSnapshotTable({ project, author, completedSections }),
    createParagraph("This editable document was generated from guided business-plan sections. Review figures, assumptions, supplier details, and market evidence before presenting it to funders or partners.", {
      before: 260,
      italics: true,
      color: COLORS.muted
    }),
    new Paragraph({ children: [new PageBreak()] })
  ];
}

async function createEditableDocx({ documentHtml, businessName }) {
  const cleanHtml = sanitizePlanHtml(documentHtml);
  const title = String(businessName || "Business Plan Draft").replace(/[<>]/g, "");
  const html = `<!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8">
        <title>${title}</title>
        <style>
          body { font-family: 'DM Sans', Arial, sans-serif; font-size: 11pt; color: #1C1917; }
          h1 { color: #8B1A2B; text-align: center; font-family: 'Playfair Display', Georgia, serif; }
          h2 { color: #8B1A2B; margin-top: 22px; font-family: 'Playfair Display', Georgia, serif; border-bottom: 1px solid #D6D3CD; padding-bottom: 4px; }
          h3 { color: #1C1917; margin-top: 16px; }
          table { width: 100%; border-collapse: collapse; margin: 10px 0; }
          th, td { border: 1px solid #D6D3CD; padding: 6px; }
          th { background: #F2E0E3; font-weight: bold; }
        </style>
      </head>
      <body>
        <h1>${title}</h1>
        <p style="text-align: center;"><strong>Professional Business Plan Draft</strong></p>
        <hr style="border: 0; border-top: 2px solid #8B1A2B; margin-bottom: 24px;">
        ${cleanHtml}
      </body>
    </html>`;

  return HTMLtoDOCX(html, null, {
    table: { row: { cantSplit: true } },
    footer: true,
    pageNumber: true
  });
}

async function createProjectDocx({ project, user }) {
  const author = cleanText(user?.fullName || user?.email || "Masterplan user");
  const sections = project?.sections || {};
  const completedSections = GUIDED_SECTIONS.filter((section) => cleanText(sections[section.key])).length;
  const children = [
    ...createCoverPage({ project, author, completedSections }),
    createSectionHeading(0, "Business Plan Overview"),
    createParagraph("The table below provides a quick review map for this business plan before the detailed sections begin.", { color: COLORS.muted }),
    createContentsTable(project)
  ];

  const figures = extractFigures(project);
  if (figures.length) {
    children.push(createParagraph("Key Figures Detected", { bold: true, color: COLORS.pink, size: 26, before: 260, after: 100 }));
    children.push(createFiguresTable(figures, { includeSection: true, headerFill: COLORS.pink }));
  }

  GUIDED_SECTIONS.forEach((section, index) => {
    const value = sections[section.key];
    children.push(createSectionHeading(index + 1, section.title));

    if (section.key === "swotAnalysis" && cleanText(value)) {
      children.push(createParagraph("Structured SWOT View", { bold: true, color: COLORS.green, size: 24, after: 90 }));
      children.push(createTable(extractSwotRows(value), { boldFirstColumn: true }));
      children.push(createParagraph("Narrative Detail", { bold: true, color: COLORS.muted, size: 21, before: 140, after: 80 }));
    }

    if (["fundingRequest", "financialProjections"].includes(section.key)) {
      const sectionFigures = extractFigures(project, section.key);
      if (sectionFigures.length) {
        children.push(createParagraph("Figures and Assumptions", { bold: true, color: COLORS.orange, size: 24, after: 90 }));
        children.push(createFiguresTable(sectionFigures, { headerFill: COLORS.orange }));
        children.push(createParagraph("Narrative Detail", { bold: true, color: COLORS.muted, size: 21, before: 140, after: 80 }));
      }
    }

    children.push(...textToParagraphs(value));
  });

  const doc = new Document({
    creator: "Masterplan",
    title: cleanText(project?.projectName || "Business Plan"),
    description: "Professional business plan generated by Masterplan",
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: 900,
              right: 850,
              bottom: 900,
              left: 850
            }
          }
        },
        children
      }
    ]
  });

  return Packer.toBuffer(doc);
}

module.exports = { createEditableDocx, createProjectDocx };
