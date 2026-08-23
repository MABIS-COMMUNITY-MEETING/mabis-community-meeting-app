const JAPANESE_SCRIPT = /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}々〆ヵヶー]/gu;

const escapeHtml = (value) => String(value ?? "")
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;")
  .replaceAll("'", "&#039;");

const englishOnly = (value, fallback = "") => {
  const cleaned = String(value ?? "")
    .replace(JAPANESE_SCRIPT, " ")
    .replace(/\s+/g, " ")
    .trim();
  return cleaned || fallback;
};

const safeCssValue = (value, fallback) => {
  const cleaned = String(value || "").replace(/[{};]/g, "").trim();
  return cleaned || fallback;
};

const safeFilename = (value) => englishOnly(value, "MABIS Job List")
  .replace(/[^a-z0-9._ -]+/gi, "")
  .replace(/\s+/g, " ")
  .trim()
  .slice(0, 80) || "MABIS Job List";

const asCssColor = (value, fallback) => {
  const cleaned = safeCssValue(value, "");
  if (!cleaned) return fallback;
  return /^(?:#|rgb|hsl|oklch|color\()/i.test(cleaned) ? cleaned : `hsl(${cleaned})`;
};

const stylesheetMarkup = (urls) => (urls || [])
  .map((url) => `<link rel="stylesheet" href="${escapeHtml(url)}">`)
  .join("");

export function containsJapanese(value) {
  JAPANESE_SCRIPT.lastIndex = 0;
  return JAPANESE_SCRIPT.test(String(value ?? ""));
}

export function readJobListPrintAppearance(doc = document) {
  const styles = getComputedStyle(doc.documentElement);
  const token = (name) => styles.getPropertyValue(name).trim();

  return {
    primary: asCssColor(token("--primary"), "#951e3a"),
    primaryForeground: asCssColor(token("--primary-foreground"), "#fffaf2"),
    secondary: asCssColor(token("--secondary"), "#eace54"),
    secondaryForeground: asCssColor(token("--secondary-foreground"), "#241b05"),
    background: asCssColor(token("--background"), "#f8f4ea"),
    foreground: asCssColor(token("--foreground"), "#24191c"),
    border: asCssColor(token("--border"), "#c9bdaf"),
    muted: asCssColor(token("--muted"), "#eee6d9"),
    mutedForeground: asCssColor(token("--muted-foreground"), "#6c6161"),
    fontFamily: safeCssValue(token("--font-body"), "'GNUFreeMonoUI', monospace"),
    stylesheetUrls: Array.from(doc.querySelectorAll('link[rel="stylesheet"]'))
      .map((link) => link.href)
      .filter(Boolean),
    baseUrl: doc.baseURI,
  };
}

export function buildJobListPrintHtml(jobList, appearance = {}) {
  const items = Array.isArray(jobList?.items) ? jobList.items : [];
  const colors = {
    primary: safeCssValue(appearance.primary, "#951e3a"),
    primaryForeground: safeCssValue(appearance.primaryForeground, "#fffaf2"),
    secondary: safeCssValue(appearance.secondary, "#eace54"),
    secondaryForeground: safeCssValue(appearance.secondaryForeground, "#241b05"),
    background: safeCssValue(appearance.background, "#f8f4ea"),
    foreground: safeCssValue(appearance.foreground, "#24191c"),
    border: safeCssValue(appearance.border, "#c9bdaf"),
    muted: safeCssValue(appearance.muted, "#eee6d9"),
    mutedForeground: safeCssValue(appearance.mutedForeground, "#6c6161"),
  };
  const fontFamily = safeCssValue(appearance.fontFamily, "'GNUFreeMonoUI', monospace");
  const title = englishOnly(jobList?.title, "MABIS Job List");
  const notes = englishOnly(jobList?.notes);
  const period = englishOnly(jobList?.period_label, "Current assignments");
  const author = englishOnly(jobList?.created_by_name, "MABIS Community");
  const created = englishOnly(
    jobList?.created_date || jobList?.createdDate || new Date().toISOString().slice(0, 10),
    new Date().toISOString().slice(0, 10),
  ).slice(0, 10);
  const rows = items.map((item, index) => {
    const schedule = (Array.isArray(item?.schedule_days) ? item.schedule_days : [])
      .map((day) => englishOnly(day))
      .filter(Boolean)
      .join(", ");
    return `
      <tr>
        <td class="pdf-number">${String(index + 1).padStart(2, "0")}</td>
        <td><strong>${escapeHtml(englishOnly(item?.job_title, "Job"))}</strong></td>
        <td>${escapeHtml(englishOnly(item?.assigned_to_name, "Unassigned"))}</td>
        <td>${escapeHtml(schedule || "As scheduled")}</td>
        <td class="pdf-period">${escapeHtml(englishOnly(item?.assignment_period, "weekly"))}</td>
      </tr>`;
  }).join("");

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <base href="${escapeHtml(appearance.baseUrl || "/")}">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(safeFilename(title))}</title>
  ${stylesheetMarkup(appearance.stylesheetUrls)}
  <style>
    @page { size: A4 portrait; margin: 14mm 13mm 17mm; }
    :root {
      color-scheme: light;
      --pdf-primary: ${colors.primary};
      --pdf-primary-foreground: ${colors.primaryForeground};
      --pdf-secondary: ${colors.secondary};
      --pdf-secondary-foreground: ${colors.secondaryForeground};
      --pdf-background: ${colors.background};
      --pdf-foreground: ${colors.foreground};
      --pdf-border: ${colors.border};
      --pdf-muted: ${colors.muted};
      --pdf-muted-foreground: ${colors.mutedForeground};
    }
    * { box-sizing: border-box; }
    html, body { margin: 0; min-height: 100%; background: var(--pdf-background); }
    body {
      color: var(--pdf-foreground);
      font-family: ${fontFamily};
      font-size: 10.5pt;
      line-height: 1.45;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .pdf-page { width: 100%; margin: 0 auto; }
    .pdf-brand {
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto;
      gap: 10mm;
      align-items: end;
      border-top: 4px solid var(--pdf-primary);
      border-bottom: 1px solid var(--pdf-foreground);
      padding: 7mm 0 5mm;
    }
    .pdf-kicker, .pdf-label, th, .pdf-number, .pdf-period, .pdf-footer {
      font-family: ${fontFamily};
      font-size: 7.5pt;
      font-weight: 700;
      letter-spacing: .12em;
      text-transform: uppercase;
    }
    .pdf-kicker { color: var(--pdf-primary); }
    h1 {
      max-width: 145mm;
      margin: 2mm 0 0;
      font-family: ${fontFamily};
      font-size: 25pt;
      line-height: 1.02;
      letter-spacing: -.035em;
      overflow-wrap: anywhere;
    }
    .pdf-mark {
      width: 22mm;
      height: 22mm;
      display: grid;
      place-items: center;
      border: 1px solid var(--pdf-foreground);
      background: var(--pdf-primary);
      color: var(--pdf-primary-foreground);
      font-size: 15pt;
      font-weight: 800;
    }
    .pdf-stripe {
      display: grid;
      grid-template-columns: 3fr 1fr;
      height: 3mm;
      margin: 3mm 0 6mm;
    }
    .pdf-stripe span:first-child { background: var(--pdf-primary); }
    .pdf-stripe span:last-child { background: var(--pdf-secondary); }
    .pdf-meta {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      border: 1px solid var(--pdf-border);
      border-bottom: 0;
    }
    .pdf-meta > div { min-width: 0; padding: 3mm; border-right: 1px solid var(--pdf-border); }
    .pdf-meta > div:last-child { border-right: 0; }
    .pdf-label { display: block; margin-bottom: 1mm; color: var(--pdf-muted-foreground); }
    .pdf-value { font-weight: 700; overflow-wrap: anywhere; }
    table { width: 100%; border-collapse: collapse; table-layout: fixed; }
    thead { display: table-header-group; }
    tr { break-inside: avoid; }
    th {
      padding: 2.6mm 2mm;
      text-align: left;
      border: 1px solid var(--pdf-foreground);
      background: var(--pdf-foreground);
      color: var(--pdf-background);
    }
    td {
      padding: 3.2mm 2mm;
      vertical-align: top;
      border: 1px solid var(--pdf-border);
      overflow-wrap: anywhere;
    }
    tbody tr:nth-child(even) { background: var(--pdf-muted); }
    th:nth-child(1), td:nth-child(1) { width: 9%; text-align: center; }
    th:nth-child(2), td:nth-child(2) { width: 27%; }
    th:nth-child(3), td:nth-child(3) { width: 23%; }
    th:nth-child(4), td:nth-child(4) { width: 28%; }
    th:nth-child(5), td:nth-child(5) { width: 13%; }
    .pdf-period { color: var(--pdf-primary); }
    .pdf-empty { padding: 12mm; text-align: center; border: 1px solid var(--pdf-border); }
    .pdf-notes {
      margin-top: 6mm;
      padding: 4mm;
      border-top: 2px solid var(--pdf-secondary);
      border-bottom: 1px solid var(--pdf-border);
      white-space: pre-wrap;
    }
    .pdf-footer {
      display: flex;
      justify-content: space-between;
      gap: 8mm;
      margin-top: 8mm;
      padding-top: 3mm;
      border-top: 1px solid var(--pdf-foreground);
      color: var(--pdf-muted-foreground);
    }
  </style>
</head>
<body>
  <main class="pdf-page">
    <header class="pdf-brand">
      <div>
        <div class="pdf-kicker">Montessori Academy Bangkok International School</div>
        <h1>${escapeHtml(title)}</h1>
      </div>
      <div class="pdf-mark" aria-label="MABIS">M</div>
    </header>
    <div class="pdf-stripe" aria-hidden="true"><span></span><span></span></div>
    <section class="pdf-meta" aria-label="Job list information">
      <div><span class="pdf-label">Period</span><span class="pdf-value">${escapeHtml(period)}</span></div>
      <div><span class="pdf-label">Prepared by</span><span class="pdf-value">${escapeHtml(author)}</span></div>
      <div><span class="pdf-label">Prepared</span><span class="pdf-value">${escapeHtml(created)}</span></div>
    </section>
    ${rows ? `
      <table aria-label="Jobs">
        <thead><tr><th>No.</th><th>Job</th><th>Person</th><th>Schedule</th><th>Period</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>` : '<div class="pdf-empty">No jobs were included in this list.</div>'}
    ${notes ? `<section class="pdf-notes"><span class="pdf-label">Notes</span>${escapeHtml(notes)}</section>` : ""}
    <footer class="pdf-footer"><span>MABIS Community Job List</span><span>${items.length} job${items.length === 1 ? "" : "s"}</span></footer>
  </main>
</body>
</html>`;
}

export async function printJobList(jobList, doc = document) {
  const popup = window.open("", "_blank", "width=980,height=760");
  if (!popup) throw new Error("POPUP_BLOCKED");

  const appearance = readJobListPrintAppearance(doc);
  popup.document.open();
  popup.document.write(buildJobListPrintHtml(jobList, appearance));
  popup.document.close();

  const links = Array.from(popup.document.querySelectorAll('link[rel="stylesheet"]'));
  await Promise.all(links.map((link) => {
    if (link.sheet) return Promise.resolve();
    return new Promise((resolve) => {
      const done = () => resolve();
      link.addEventListener("load", done, { once: true });
      link.addEventListener("error", done, { once: true });
      window.setTimeout(done, 1800);
    });
  }));
  await popup.document.fonts?.ready;
  popup.document.title = safeFilename(jobList?.title);
  popup.focus();
  popup.print();
}
