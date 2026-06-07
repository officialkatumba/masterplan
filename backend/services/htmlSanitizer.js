const sanitizeHtml = require("sanitize-html");

const allowedTags = [
  "p",
  "a",
  "br",
  "strong",
  "em",
  "u",
  "ul",
  "ol",
  "li",
  "section",
  "h2",
  "h3",
  "h4",
  "table",
  "thead",
  "tbody",
  "tfoot",
  "tr",
  "th",
  "td"
];

function sanitizePlanHtml(html = "") {
  return sanitizeHtml(String(html), {
    allowedTags,
    allowedAttributes: {
      a: ["href", "target", "rel"],
      th: ["colspan", "rowspan"],
      td: ["colspan", "rowspan"]
    },
    allowedSchemes: ["http", "https", "mailto"],
    transformTags: {
      a: (tagName, attribs) => ({
        tagName,
        attribs: { ...attribs, target: "_blank", rel: "noopener noreferrer" }
      })
    },
    disallowedTagsMode: "discard"
  });
}

module.exports = { sanitizePlanHtml };
