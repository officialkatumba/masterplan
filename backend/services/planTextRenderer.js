function escapeHtml(value = "") {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function isMarkdownTableRow(line = "") {
  const trimmed = String(line).trim();
  return trimmed.startsWith("|") && trimmed.endsWith("|") && trimmed.split("|").length >= 4;
}

function isMarkdownTableSeparator(line = "") {
  return /^\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|?$/.test(String(line).trim());
}

function parseMarkdownTableRow(line = "") {
  return String(line)
    .trim()
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((cell) => cell.trim());
}

function renderTable(lines = []) {
  const header = parseMarkdownTableRow(lines[0]);
  const bodyRows = lines.slice(2).map(parseMarkdownTableRow);
  const headHtml = header.map((cell) => `<th>${escapeHtml(cell)}</th>`).join("");
  const bodyHtml = bodyRows
    .map((row) => `<tr>${row.map((cell) => `<td>${escapeHtml(cell)}</td>`).join("")}</tr>`)
    .join("");
  return `<div class="plan-table-wrap"><table class="plan-table"><thead><tr>${headHtml}</tr></thead><tbody>${bodyHtml}</tbody></table></div>`;
}

function renderList(items = []) {
  return `<ul>${items.map((item) => `<li>${escapeHtml(item.replace(/^[-+]\s+/, ""))}</li>`).join("")}</ul>`;
}

function renderPlanTextHtml(text = "") {
  const lines = String(text || "")
    .replace(/\r/g, "")
    .split("\n")
    .map((line) => line.trim());
  const html = [];

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
      html.push(renderTable(tableLines));
      continue;
    }

    if (/^[-+]\s+/.test(line)) {
      const items = [line];
      while (index + 1 < lines.length && /^[-+]\s+/.test(lines[index + 1])) {
        index += 1;
        items.push(lines[index]);
      }
      html.push(renderList(items));
      continue;
    }

    if (/^#{3,6}\s+/.test(line)) {
      html.push(`<h3>${escapeHtml(line.replace(/^#{3,6}\s+/, ""))}</h3>`);
      continue;
    }

    html.push(`<p>${escapeHtml(line.replace(/^#{1,2}\s+/, ""))}</p>`);
  }

  return html.join("");
}

module.exports = {
  escapeHtml,
  isMarkdownTableRow,
  isMarkdownTableSeparator,
  parseMarkdownTableRow,
  renderPlanTextHtml
};
