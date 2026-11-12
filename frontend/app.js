(() => {
  "use strict";

  const config = window.PROMPT_BENCH_CONFIG || {};
  const apiBase = String(config.apiBaseUrl || "").replace(/\/$/, "");
  const byId = (id) => document.getElementById(id);
  const form = byId("upload-form");
  const fileInput = byId("prompt-file");
  const modelInput = byId("model");
  const analyzeButton = byId("analyze-button");
  let latestResults = [];

  const money = (value) => `$${Number(value).toFixed(6)}`;
  const number = (value) => Number(value).toLocaleString();
  const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[character]);

  function showError(message) {
    const error = byId("error-message");
    error.textContent = message;
    error.hidden = false;
  }

  function clearError() {
    const error = byId("error-message");
    error.textContent = "";
    error.hidden = true;
  }

  async function responseError(response) {
    const text = await response.text();
    try {
      const payload = JSON.parse(text);
      if (payload.detail) return String(payload.detail);
    } catch {
      // Fall through to the HTTP status when the server does not return JSON.
    }
    if (response.status >= 500) {
      return `The analysis service returned an error (${response.status}). Check the current Vercel deployment and its function logs.`;
    }
    return `The request failed (${response.status}). ${text.slice(0, 250)}`;
  }

  async function checkService() {
    const status = byId("service-status");
    try {
      const response = await fetch(`${apiBase}/api/health`, { cache: "no-store" });
      if (!response.ok) throw new Error(await responseError(response));
      const payload = await response.json();
      if (payload.status !== "ok") throw new Error("The service returned an unexpected health response.");
      status.textContent = `Analysis service is connected${payload.version ? ` · v${payload.version}` : ""}.`;
      status.classList.add("is-online");

      const modelResponse = await fetch(`${apiBase}/api/models`, { cache: "no-store" });
      if (!modelResponse.ok) throw new Error(await responseError(modelResponse));
      const models = (await modelResponse.json()).models;
      if (!Array.isArray(models) || !models.length || models.some((item) => typeof item !== "string")) {
        throw new Error("The service returned an invalid model list.");
      }
      const previous = modelInput.value;
      modelInput.replaceChildren(...models.map((model) => new Option(model, model)));
      if (models.includes(previous)) modelInput.value = previous;
    } catch (error) {
      status.textContent = `Analysis service unavailable. ${error.message}`;
      status.classList.remove("is-online");
      status.classList.add("is-offline");
    }
  }

  function showReport(report, filename) {
    const summary = report.summary;
    latestResults = report.results;
    byId("report-caption").textContent = `${number(summary.prompt_count)} prompts · ${summary.model} pricing`;
    byId("results-count").textContent = `${number(summary.prompt_count)} total`;

    const cards = [
      ["Average complexity", `${summary.average_complexity_score}/100`],
      ["High complexity", number(summary.high_complexity_prompts)],
      ["Prompts shortened", `${number(summary.prompts_reduced)} / ${number(summary.prompt_count)}`],
      ["Estimated tokens saved", `${number(summary.tokens_saved_estimate)} (${summary.percentage_saved}%)`],
      ["Estimated cost before", money(summary.estimated_cost_before)],
      ["Estimated cost after", money(summary.estimated_cost_after)],
      ["Estimated savings", money(summary.estimated_cost_savings)]
    ];
    byId("summary-metrics").innerHTML = cards.map(([label, value]) => `
      <article class="summary-card">
        <span>${escapeHtml(label)}</span>
        <strong>${escapeHtml(value)}</strong>
      </article>
    `).join("");

    byId("results-body").innerHTML = report.results.slice(0, 25).map((row) => `
      <tr>
        <td>${row.prompt_number}</td>
        <td class="prompt-cell" title="${escapeHtml(row.prompt)}">${escapeHtml(row.prompt.slice(0, 150))}${row.prompt.length > 150 ? "…" : ""}</td>
        <td><span class="complexity-pill complexity-${row.complexity_category.toLowerCase()}">${row.complexity_score} · ${escapeHtml(row.complexity_category)}</span></td>
        <td>${number(row.word_count)}</td>
        <td>${number(row.sentence_count)}</td>
        <td>${row.instruction_density}%</td>
        <td>${row.keyword_complexity}%</td>
        <td>${row.entropy}</td>
        <td>${row.reasoning_indicators}</td>
        <td>${number(row.original_tokens_estimate)} → ${number(row.optimized_tokens_estimate)}</td>
        <td>${row.percentage_saved}%</td>
        <td>${money(row.estimated_cost_before)} → ${money(row.estimated_cost_after)}</td>
      </tr>
    `).join("");

    byId("report").hidden = false;
    byId("report").scrollIntoView({ behavior: "smooth", block: "start" });
    byId("download-button").setAttribute("aria-label", `Download CSV report for ${filename}`);
  }

  function csvCell(value) {
    const text = String(value ?? "");
    const safeText = /^[=+\-@]/.test(text) ? `'${text}` : text;
    return `"${safeText.replace(/"/g, '""')}"`;
  }

  function downloadCsv() {
    if (!latestResults.length) return;
    const columns = Object.keys(latestResults[0]);
    const content = [
      columns.map(csvCell).join(","),
      ...latestResults.map((row) => columns.map((column) => csvCell(row[column])).join(","))
    ].join("\r\n");
    const objectUrl = URL.createObjectURL(new Blob(["\uFEFF", content], { type: "text/csv;charset=utf-8" }));
    const anchor = document.createElement("a");
    anchor.href = objectUrl;
    anchor.download = "prompt-bench-analysis.csv";
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
  }

  fileInput.addEventListener("change", () => {
    const file = fileInput.files[0];
    byId("file-name").textContent = file ? file.name : "No file selected";
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    clearError();
    byId("report").hidden = true;

    const file = fileInput.files[0];
    if (!file) {
      showError("Choose an Excel workbook or CSV file first.");
      return;
    }
    if (!/\.(xlsx|csv)$/i.test(file.name)) {
      showError("Please choose an .xlsx Excel workbook or a .csv file.");
      return;
    }
    if (file.size > 4 * 1024 * 1024) {
      showError("The file is larger than 4 MB. Choose a smaller spreadsheet.");
      return;
    }

    analyzeButton.disabled = true;
    analyzeButton.querySelector(".button-label").textContent = "Analyzing…";
    try {
      const response = await fetch(`${apiBase}/api/batch-analyze`, {
        method: "POST",
        headers: {
          "Content-Type": "application/octet-stream",
          "X-Filename": encodeURIComponent(file.name),
          "X-Model": modelInput.value
        },
        body: file
      });
      if (!response.ok) throw new Error(await responseError(response));
      const report = await response.json();
      if (!report.summary || !Array.isArray(report.results)) {
        throw new Error("The analysis service returned an incomplete report.");
      }
      showReport(report, file.name);
    } catch (error) {
      showError(error instanceof TypeError
        ? "Cannot connect to the analysis service. Confirm the latest deployment is live, then reload this page."
        : error.message);
    } finally {
      analyzeButton.disabled = false;
      analyzeButton.querySelector(".button-label").textContent = "Analyze prompts";
    }
  });

  byId("download-button").addEventListener("click", downloadCsv);
  checkService();
})();
