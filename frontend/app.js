const API_BASE_URL = (window.APP_CONFIG?.API_BASE_URL || "").replace(/\/$/, "");
const $ = (id) => document.getElementById(id);
const money = (value) => `$${Number(value).toFixed(6)}`;

async function request(path, body) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  if (!response.ok) throw new Error((await response.json()).detail || "Request failed");
  return response.json();
}

function showError(error) {
  $("toast").textContent = error.message;
  $("toast").classList.add("visible");
  setTimeout(() => $("toast").classList.remove("visible"), 5000);
}

function metric(label, value) {
  return `<div class="metric"><span>${label}</span><strong>${value}</strong></div>`;
}

async function loadModels() {
  const response = await fetch(`${API_BASE_URL}/api/models`);
  if (!response.ok) throw new Error("Unable to load models");
  (await response.json()).models.forEach((model) => {
    $("model").add(new Option(model, model));
  });
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
      const data = await request("/api/optimize", { prompt: $("optimize-prompt").value });
      $("optimize-result").innerHTML = `<h3>Original Prompt</h3><p>${escapeHtml(data.original_prompt)}</p><h3>Optimized Prompt</h3><p>${escapeHtml(data.optimized_prompt)}</p><div class="metrics">${metric("Original tokens", data.original_tokens)}${metric("New tokens", data.new_tokens)}${metric("Percentage saved", `${data.percentage_saved}%`)}</div>`;
    } else if (action === "recommend") {
      const data = await request("/api/recommend", { prompt: $("recommend-prompt").value });
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
function escapeHtml(value) {
  return value.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[char]));
}

document.querySelectorAll(".tab").forEach((button) => button.addEventListener("click", () => {
  document.querySelectorAll(".tab, .page").forEach((element) => element.classList.remove("active"));
  button.classList.add("active");
  $(`${button.dataset.page}`).classList.add("active");
}));
document.querySelectorAll("[data-action]").forEach((button) => button.addEventListener("click", () => run(button.dataset.action)));
loadModels().catch(showError);
