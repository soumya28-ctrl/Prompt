const API_BASE_URL = (window.APP_CONFIG?.API_BASE_URL || "").replace(/\/$/, "");
const FALLBACK_MODELS = window.APP_CONFIG?.MODEL_OPTIONS || [];
const $ = (id) => document.getElementById(id);
const money = (value) => `$${Number(value).toFixed(6)}`;

async function apiFetch(url, options) {
  try {
    return await fetch(url, options);
  } catch {
    throw new Error(`Cannot reach the analysis API at ${url}. The website loaded, but its backend is unavailable. Redeploy or restart the backend, then try again.`);
  }
}

async function responseError(response) {
  const body = await response.text();
  if (response.status >= 500) {
    return new Error(`The analysis backend returned HTTP ${response.status}. Check the deployment's function logs and redeploy the latest backend dependencies.`);
  }
  let detail = body;
  try {
    detail = JSON.parse(body).detail || body;
  } catch {
    // Keep the response body when the API returns plain text or HTML.
  }
  const message = String(detail || response.statusText || "Request failed").slice(0, 300);
  return new Error(`API request failed (${response.status}): ${message}`);
}

async function request(path, body) {
  const response = await apiFetch(`${API_BASE_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  if (!response.ok) throw await responseError(response);
  return response.json();
}

function showError(error) {
  $("toast").textContent = error.message;
  $("toast").classList.add("visible");
  setTimeout(() => $("toast").classList.remove("visible"), 5000);
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[char]));
}

function metric(label, value) {
  return `<div class="metric"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></div>`;
}

async function loadModels() {
  const select = $("model");
  const status = $("model-status");
  const setOptions = (models) => {
    const previousValue = select.value;
    select.replaceChildren(...models.map((model) => new Option(model, model)));
    if (models.includes(previousValue)) select.value = previousValue;
  };

  if (!FALLBACK_MODELS.length) {
    throw new Error("No built-in model options are configured.");
  }
  setOptions(FALLBACK_MODELS);

  try {
    const response = await apiFetch(`${API_BASE_URL}/api/models`);
    if (!response.ok) throw await responseError(response);
    const payload = await response.json();
    const models = payload.models;
    if (!Array.isArray(models) || !models.length || models.some((model) => typeof model !== "string")) {
      throw new Error("The model service returned an invalid model list.");
    }
    setOptions(models);
    status.textContent = "Selected model applies to cost, optimization, bulk analysis, recommendations, and simulation.";
    status.classList.remove("error-text");
  } catch (error) {
    status.textContent = `Using built-in model choices; analysis API is unavailable. ${error.message}`;
    status.classList.add("error-text");
  }
}

async function run(action) {
  try {
    const model = $("model").value;
    if (action === "cost") {
      const data = await request("/api/cost", { prompt: $("cost-prompt").value, model });
      $("cost-result").innerHTML = `<div class="metrics">${metric("Prompt tokens", data.input_tokens)}${metric("Estimated cost", money(data.estimated_cost))}${metric("Selected model", data.model)}</div><h3>Model Comparison</h3>${table(data.comparison)}`;
    } else if (action === "complexity") {
      const data = await request("/api/complexity", { prompt: $("complexity-prompt").value });
      $("complexity-result").innerHTML = `<div class="metrics">${metric("Complexity score", `${data.score}/100`)}${metric("Category", data.category)}</div><p class="notice">${data.explanation}</p>`;
    } else if (action === "optimize") {
      const data = await request("/api/optimize", { prompt: $("optimize-prompt").value, model });
      $("optimize-result").innerHTML = `<h3>Original Prompt</h3><p>${escapeHtml(data.original_prompt)}</p><h3>Optimized Prompt</h3><p>${escapeHtml(data.optimized_prompt)}</p><div class="metrics">${metric("Original tokens", data.original_tokens)}${metric("New tokens", data.new_tokens)}${metric("Percentage saved", `${data.percentage_saved}%`)}</div>`;
    } else if (action === "recommend") {
      const data = await request("/api/recommend", { prompt: $("recommend-prompt").value, model: $("model").value });
      $("recommend-result").innerHTML = `<div class="metrics">${metric("Recommended model", data.recommended_model)}${metric("Complexity score", data.complexity_score)}${metric("Estimated savings", money(data.estimated_savings))}</div><p class="notice">${data.reason}<br>Task: ${data.task_type}</p>`;
    } else {
      const data = await request("/api/simulate", { users_per_day: Number($("users").value), requests_per_user: Number($("requests").value), avg_tokens_per_request: Number($("tokens").value), model });
      $("simulate-result").innerHTML = `<div class="metrics">${metric("Daily cost", money(data.daily_cost))}${metric("Monthly cost", money(data.monthly_cost))}${metric("Yearly cost", money(data.yearly_cost))}</div><div class="bars">${bar("Daily", data.daily_cost, data.optimized_daily_cost)}${bar("Monthly", data.monthly_cost, data.optimized_monthly_cost)}${bar("Yearly", data.yearly_cost, data.optimized_yearly_cost)}</div>`;
    }
  } catch (error) { showError(error); }
}

function table(rows) {
  return `<table><thead><tr><th>Model</th><th>Tokens</th><th>Estimated cost</th></tr></thead><tbody>${rows.map((row) => `<tr><td>${row.model}</td><td>${row.tokens}</td><td>${money(row.estimated_cost)}</td></tr>`).join("")}</tbody></table>`;
}
function bar(label, baseline, optimized) {
  const width = baseline ? Math.max(4, (optimized / baseline) * 100) : 4;
  return `<div class="bar-row"><span>${label}</span><div class="bar"><i style="width:${width}%"></i></div><b>${money(optimized)}</b></div>`;
}

function csvCell(value) {
  const text = String(value ?? "");
  const safeText = /^[=+\-@]/.test(text) ? `'${text}` : text;
  return `"${safeText.replace(/"/g, '""')}"`;
}

function downloadBatchCsv(rows) {
  if (!rows.length) return;
  const columns = Object.keys(rows[0]);
  const csv = [columns.map(csvCell).join(","), ...rows.map((row) => columns.map((column) => csvCell(row[column])).join(","))].join("\r\n");
  const url = URL.createObjectURL(new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = "prompt-analysis-report.csv";
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

async function runBatch() {
  const fileInput = $("batch-file");
  if (!fileInput.files.length) {
    showError(new Error("Choose an Excel or CSV file first."));
    return;
  }
  const button = $("batch-run");
  button.disabled = true;
  button.textContent = "Analyzing…";
  try {
    const form = new FormData();
    form.append("file", fileInput.files[0]);
    form.append("model", $("model").value);
    const response = await apiFetch(`${API_BASE_URL}/api/batch-analyze`, { method: "POST", body: form });
    if (!response.ok) throw await responseError(response);
    const data = await response.json();

    const summary = data.summary;
    const result = $("batch-result");
    result.innerHTML = `
      <h3>Analysis summary</h3>
      <div class="metrics">
        ${metric("Prompts analyzed", summary.prompt_count)}
        ${metric("Average complexity", `${summary.average_complexity_score}/100`)}
        ${metric("High complexity", summary.high_complexity_prompts)}
        ${metric("Prompts reduced", `${summary.prompts_reduced}/${summary.prompt_count}`)}
        ${metric("Tokens saved", `${summary.tokens_saved} (${summary.percentage_saved}%)`)}
        ${metric("Estimated cost before", money(summary.estimated_cost_before))}
        ${metric("Estimated cost after", money(summary.estimated_cost_after))}
        ${metric("Estimated cost savings", money(summary.estimated_cost_savings))}
      </div>
      <p class="notice">${escapeHtml(summary.accuracy)} These are heuristic complexity scores and estimated token/cost changes, not a quality or accuracy benchmark.</p>
      <button id="batch-download" class="primary">Download full CSV report</button>
      <h3>Prompt results (first 25)</h3>
      <div class="table-scroll"><table><thead><tr><th>#</th><th>Prompt</th><th>Complexity</th><th>Words</th><th>Sentences</th><th>Instruction %</th><th>Keyword %</th><th>Entropy</th><th>Reasoning markers</th><th>Tokens before → after</th><th>Saved %</th><th>Cost before → after</th></tr></thead><tbody>
      ${data.results.slice(0, 25).map((row) => `<tr><td>${row.prompt_number}</td><td>${escapeHtml(row.prompt.slice(0, 160))}</td><td>${row.complexity_score} (${escapeHtml(row.complexity_category)})</td><td>${row.word_count}</td><td>${row.sentence_count}</td><td>${row.instruction_density}</td><td>${row.keyword_complexity}</td><td>${row.entropy}</td><td>${row.reasoning_indicators}</td><td>${row.original_tokens} → ${row.optimized_tokens}</td><td>${row.percentage_saved}%</td><td>${money(row.estimated_cost_before)} → ${money(row.estimated_cost_after)}</td></tr>`).join("")}
      </tbody></table></div>`;
    $("batch-download").addEventListener("click", () => downloadBatchCsv(data.results));
  } catch (error) {
    showError(error);
  } finally {
    button.disabled = false;
    button.textContent = "Analyze prompts";
  }
}

document.querySelectorAll(".tab").forEach((button) => button.addEventListener("click", () => {
  document.querySelectorAll(".tab, .page").forEach((element) => element.classList.remove("active"));
  button.classList.add("active");
  $(`${button.dataset.page}`).classList.add("active");
}));
document.querySelectorAll("[data-action]").forEach((button) => button.addEventListener("click", () => run(button.dataset.action)));
$("batch-run").addEventListener("click", runBatch);
loadModels().catch(showError);
