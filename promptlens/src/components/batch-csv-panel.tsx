"use client";

import Papa from "papaparse";
import { useMemo, useRef, useState, type DragEvent } from "react";
import { AlertCircle, ArrowDownToLine, BarChart3, Check, FileSpreadsheet, LoaderCircle, Search, Upload, X } from "lucide-react";
import {
  analyzeBatch,
  createBatchSummary,
  exportAnalyzedCsv,
  MAX_BATCH_PROMPTS,
  MAX_CSV_BYTES,
  MAX_SINGLE_PROMPT_CHARS,
  MAX_BATCH_TEXT_CHARS,
} from "@/lib/batch";
import { formatCurrency } from "@/lib/token-estimator";
import type { BatchProgress, PromptAnalysis } from "@/types/analysis";

const PROMPT_HEADERS = new Set(["prompt", "prompts", "prompt_text", "text", "input"]);
const PAGE_SIZE = 25;

function readCsv(file: File): Promise<string[]> {
  return new Promise((resolve, reject) => {
    Papa.parse<string[]>(file, {
      header: false,
      delimiter: ",",
      skipEmptyLines: "greedy",
      worker: true,
      complete: (result) => {
        if (result.errors.length) {
          reject(new Error(`CSV format issue on row ${result.errors[0].row ?? "?"}: ${result.errors[0].message}`));
          return;
        }
        const rows = result.data;
        if (!rows.length) {
          reject(new Error("This CSV is empty. Add a header and at least one prompt."));
          return;
        }
        const headers = rows[0].map((cell) => String(cell ?? "").replace(/^\uFEFF/, "").trim().toLowerCase());
        const promptColumn = headers.findIndex((header) => PROMPT_HEADERS.has(header));
        const hasHeader = promptColumn >= 0;
        const column = hasHeader ? promptColumn : 0;
        const promptRows = hasHeader ? rows.slice(1) : rows;
        const prompts = promptRows
          .map((row) => String(row[column] ?? "").trim())
          .filter(Boolean);

        if (!prompts.length) {
          reject(new Error("No prompts found. Add a 'prompt' column or put prompts in the first column."));
          return;
        }
        if (prompts.length > MAX_BATCH_PROMPTS) {
          reject(new Error(`This file has ${prompts.length} prompts. The limit is ${MAX_BATCH_PROMPTS}; split it into smaller files.`));
          return;
        }
        if (prompts.some((prompt) => prompt.length > MAX_SINGLE_PROMPT_CHARS)) {
          reject(new Error(`Each prompt must be ${MAX_SINGLE_PROMPT_CHARS.toLocaleString()} characters or fewer.`));
          return;
        }
        if (prompts.reduce((total, prompt) => total + prompt.length, 0) > MAX_BATCH_TEXT_CHARS) {
          reject(new Error(`Combined prompt text must be ${MAX_BATCH_TEXT_CHARS.toLocaleString()} characters or fewer.`));
          return;
        }
        resolve(prompts);
      },
      error: (error) => reject(new Error(`Could not read the CSV: ${error.message}`)),
    });
  });
}

function downloadCsv(rows: PromptAnalysis[]) {
  const csv = exportAnalyzedCsv(rows);
  const url = URL.createObjectURL(new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8" }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "promptlens-analyzed-prompts.csv";
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function BatchCsvPanel() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [fileName, setFileName] = useState("");
  const [error, setError] = useState("");
  const [results, setResults] = useState<PromptAnalysis[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState<BatchProgress>({ processed: 0, total: 0, percent: 0 });
  const [phase, setPhase] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const summary = useMemo(() => results.length ? createBatchSummary(results) : null, [results]);
  const filteredResults = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return results;
    return results.filter((row) =>
      row.original.toLowerCase().includes(query)
      || row.optimized.toLowerCase().includes(query)
      || row.taskType.toLowerCase().includes(query)
      || row.recommendations[0]?.model.id.toLowerCase().includes(query),
    );
  }, [results, search]);
  const pageCount = Math.max(1, Math.ceil(filteredResults.length / PAGE_SIZE));
  const pageRows = filteredResults.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  async function processFile(file?: File) {
    if (!file || isProcessing) return;
    setError("");
    setResults([]);
    setPage(1);
    setSearch("");
    if (!file.name.toLowerCase().endsWith(".csv")) {
      setError("This file is not a CSV. Export your spreadsheet as .csv and try again.");
      return;
    }
    if (file.size > MAX_CSV_BYTES) {
      setError("This file is larger than 4 MB. Save a smaller CSV and try again.");
      return;
    }

    setFileName(file.name);
    setIsProcessing(true);
    setPhase("Reading CSV in a background worker…");
    setProgress({ processed: 0, total: 0, percent: 3 });
    try {
      const prompts = await readCsv(file);
      setPhase("Analyzing prompts in responsive chunks…");
      const analyses = await analyzeBatch(prompts, (nextProgress) => {
        setProgress(nextProgress);
      });
      setResults(analyses);
      setProgress({ processed: analyses.length, total: analyses.length, percent: 100 });
      setPhase(`Complete · ${analyses.length} prompts analyzed`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The CSV could not be analyzed.");
      setPhase("");
    } finally {
      setIsProcessing(false);
    }
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDragging(false);
    void processFile(event.dataTransfer.files[0]);
  }

  const distribution = summary
    ? Object.entries(summary.modelCounts).sort((a, b) => b[1] - a[1])
    : [];

  return (
    <div className="grid gap-6">
      <section>
        <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
          <div>
            <div className="mono text-[9px] tracking-[.14em] text-[#a5e65e]">BULK PROMPT AUDIT</div>
            <h3 className="mt-1 text-[14px] font-medium">Analyze a CSV spreadsheet</h3>
          </div>
          <a href="/sample-prompts.csv" download className="focus-ring inline-flex items-center gap-1.5 rounded-md border border-[#303b48] px-2.5 py-1.5 text-[9px] text-[#b8c2ce] hover:border-[#94bd63]">
            <ArrowDownToLine size={12} /> Download sample template
          </a>
        </div>

        <div
          onDragOver={(event) => { event.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          className={`rounded-xl border border-dashed px-5 py-8 text-center transition ${isDragging ? "drop-active" : "border-[#34404e] bg-[#0a0f15] hover:border-[#586b4c]"}`}
        >
          <div className="mx-auto mb-3 grid size-10 place-items-center rounded-xl border border-[#354332] bg-[#182117] text-[#b6f36a]">
            <Upload size={17} />
          </div>
          <p className="text-[12px] font-medium text-[#e1e8ef]">{fileName || "Drop your CSV here"}</p>
          <p className="mt-1.5 text-[9px] leading-5 text-[#8491a1]">or choose a file · .csv · up to 500 non-empty prompts · max 4 MB</p>
          <input
            ref={inputRef}
            type="file"
            accept=".csv,text/csv"
            className="sr-only"
            onChange={(event) => void processFile(event.target.files?.[0])}
          />
          <button type="button" disabled={isProcessing} onClick={() => inputRef.current?.click()} className="focus-ring mt-4 rounded-md border border-[#394452] px-3 py-2 text-[9px] text-[#d1d9e2] hover:border-[#96bf64] disabled:opacity-50">
            Browse CSV
          </button>
        </div>
        <div className="mt-2 flex items-center justify-between gap-2 text-[9px] text-[#758294]">
          <span>Use a <code className="rounded bg-[#1a222d] px-1 py-0.5 text-[#d0dbe7]">prompt</code> column or put prompt text in column A.</span>
          <span className="mono whitespace-nowrap">CSV ONLY · 500 MAX</span>
        </div>
      </section>

      {error && (
        <div role="alert" className="flex gap-2 rounded-lg border border-[#593438] bg-[#211518] px-3 py-2.5 text-[10px] leading-5 text-[#ffc3bc]">
          <AlertCircle className="mt-0.5 shrink-0" size={14} />{error}
          <button type="button" aria-label="Dismiss error" onClick={() => setError("")} className="ml-auto shrink-0"><X size={13} /></button>
        </div>
      )}

      {(isProcessing || phase.startsWith("Complete")) && (
        <div aria-live="polite" className="rounded-lg border border-[#29343f] bg-[#0c1219] p-3.5">
          <div className="mb-2 flex items-center justify-between gap-3">
            <span className="flex items-center gap-2 text-[10px] text-[#c7d1dc]">
              {isProcessing ? <LoaderCircle className="animate-spin text-[#b6f36a]" size={13} /> : <Check className="text-[#b6f36a]" size={13} />}
              {phase}
            </span>
            <span className="mono text-[9px] text-[#a4b0be]">{progress.percent}%{progress.total ? ` · ${progress.processed}/${progress.total}` : ""}</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-[#242e39]">
            <div className="h-full rounded-full bg-[#b6f36a] transition-[width] duration-150" style={{ width: `${progress.percent}%` }} />
          </div>
        </div>
      )}

      {summary && (
        <section className="grid gap-5">
          <div className="flex flex-wrap items-end justify-between gap-3 border-t border-[#252f3b] pt-5">
            <div>
              <div className="mono text-[9px] tracking-[.14em] text-[#a5e65e]">BATCH OVERVIEW</div>
              <h3 className="mt-1 text-[14px] font-medium">Your analysis report <span className="mono text-[10px] text-[#8794a3]">· {summary.promptCount} prompts</span></h3>
            </div>
            <button type="button" onClick={() => downloadCsv(results)} className="focus-ring inline-flex items-center gap-2 rounded-lg bg-[#b6f36a] px-3.5 py-2.5 text-[10px] font-semibold text-[#10170c] hover:bg-[#c6fa87]">
              <ArrowDownToLine size={14} /> Download analyzed CSV
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
            {[
              ["Original tokens est.", summary.originalTokens.toLocaleString()],
              ["Optimized tokens est.", summary.optimizedTokens.toLocaleString()],
              ["Net tokens saved", `${summary.tokensSaved.toLocaleString()} · ${summary.savingsPercent}%`],
              [summary.tokensSaved < 0 ? "Net token increase" : "Net tokens saved", `${Math.abs(summary.tokensSaved).toLocaleString()} · ${Math.abs(summary.savingsPercent)}%`],
              ["Analyzed prompts", `${summary.promptCount} / ${MAX_BATCH_PROMPTS}`],
            ].map(([label, value]) => (
              <article key={label} className="rounded-lg border border-[#29333e] bg-[#0b1118] p-3">
                <div className="text-[9px] text-[#8794a3]">{label}</div>
                <div className="mono mt-2 text-[15px] text-[#e4ebf2]">{value}</div>
              </article>
            ))}
          </div>

          <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
            <section className="rounded-lg border border-[#29333e] bg-[#0b1118] p-3.5">
              <div className="mb-3 flex items-center gap-2 text-[10px] font-medium text-[#dce4ec]"><BarChart3 size={13} className="text-[#b6f36a]" /> Estimated total cost by model</div>
              <div className="grid gap-2 sm:grid-cols-2">
                {Object.entries(summary.modelCosts).map(([model, cost]) => (
                  <div key={model} className="flex justify-between gap-3 border-b border-[#202a34] pb-2 text-[9px] last:border-0">
                    <span className="text-[#9ba7b5]">{model}</span>
                    <span className="mono text-[#d7e2cc]">{formatCurrency(cost.before)} <span className="text-[#697687]">→</span> {formatCurrency(cost.after)}</span>
                  </div>
                ))}
              </div>
              <p className="mt-2 text-[8px] leading-4 text-[#738092]">Estimated original → optimized cost. Output is modeled at 40% of input tokens per prompt.</p>
            </section>
            <section className="rounded-lg border border-[#29333e] bg-[#0b1118] p-3.5">
              <div className="mb-3 flex items-center gap-2 text-[10px] font-medium text-[#dce4ec]"><FileSpreadsheet size={13} className="text-[#b6f36a]" /> Top recommendation distribution</div>
              <div className="grid gap-2">
                {distribution.map(([model, count]) => {
                  const percent = Math.round(count / summary.promptCount * 100);
                  return (
                    <div key={model} className="grid grid-cols-[minmax(110px,1fr)_2fr_auto] items-center gap-2 text-[9px]">
                      <span className="truncate text-[#aeb9c5]">{model}</span>
                      <div className="h-1 overflow-hidden rounded-full bg-[#252f3a]"><div className="h-full rounded-full bg-[#a7e75e]" style={{ width: `${percent}%` }} /></div>
                      <span className="mono w-10 text-right text-[#d7e2cc]">{percent}%</span>
                    </div>
                  );
                })}
              </div>
            </section>
          </div>

          <div className="flex flex-col gap-3 border-t border-[#252f3b] pt-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="text-[11px] font-medium text-[#dce3eb]">Prompt results</div>
              <div className="mt-1 text-[9px] text-[#7f8c9c]">Search and page through all analyzed rows.</div>
            </div>
            <label className="relative block w-full sm:max-w-[270px]">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#738092]" />
              <input value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} placeholder="Search prompt, task, model…" className="focus-ring h-8 w-full rounded-md border border-[#2b3541] bg-[#0a0f15] pl-8 pr-3 text-[9px] text-[#d8e0e8] placeholder:text-[#687587]" />
            </label>
          </div>

          <div className="panel-scroll overflow-x-auto rounded-lg border border-[#29333e]">
            <table className="w-full min-w-[1060px] border-collapse text-left">
              <thead className="bg-[#131a23]">
                <tr className="text-[8px] uppercase tracking-[.08em] text-[#8592a2]">
                  <th className="px-3 py-2.5 font-medium">Prompt</th>
                  <th className="px-3 py-2.5 font-medium">Task / complexity</th>
                  <th className="px-3 py-2.5 font-medium">Tokens est. before → after</th>
                  <th className="px-3 py-2.5 font-medium">Saved</th>
                  <th className="px-3 py-2.5 font-medium">Estimated cost</th>
                  <th className="px-3 py-2.5 font-medium">Top recommended model</th>
                  <th className="px-3 py-2.5 font-medium">Optimized prompt</th>
                </tr>
              </thead>
              <tbody>
                {pageRows.map((row) => (
                  <tr key={row.id} className="border-t border-[#202a35] align-top text-[9px] hover:bg-[#121922]">
                    <td className="max-w-[230px] px-3 py-3 leading-[1.6] text-[#c4ced9]" title={row.original}>{row.original.slice(0, 120)}{row.original.length > 120 ? "…" : ""}</td>
                    <td className="px-3 py-3 text-[#a4b0bd]">{row.taskType}<span className="mt-1 block text-[#768395]">{row.complexityScore}/100</span></td>
                    <td className="mono px-3 py-3 text-[#c5d3b6]">{row.originalTokens} → {row.optimizedTokens}</td>
                    <td className="mono px-3 py-3 text-[#c5d3b6]">{row.savingsPercent}%</td>
                    <td className="mono px-3 py-3 text-[#c5d3b6]">{formatCurrency(row.costsBefore[row.recommendations[0]?.model.id ?? ""] ?? 0)} → {formatCurrency(row.costsAfter[row.recommendations[0]?.model.id ?? ""] ?? 0)}</td>
                    <td className="px-3 py-3 text-[#dbe5d2]">{row.recommendations[0]?.model.id ?? "No match"}</td>
                    <td className="max-w-[250px] px-3 py-3 leading-[1.6] text-[#aeb9c6]" title={row.optimized}>{row.optimized.slice(0, 120)}{row.optimized.length > 120 ? "…" : ""}</td>
                  </tr>
                ))}
                {!pageRows.length && <tr><td colSpan={7} className="px-3 py-8 text-center text-[10px] text-[#8d99a8]">No prompts match this search.</td></tr>}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between text-[9px] text-[#8592a2]">
            <span>{filteredResults.length ? `${(page - 1) * PAGE_SIZE + 1}–${Math.min(page * PAGE_SIZE, filteredResults.length)} of ${filteredResults.length}` : "0 results"}</span>
            <div className="flex items-center gap-2">
              <button type="button" disabled={page <= 1} onClick={() => setPage((current) => current - 1)} className="focus-ring rounded-md border border-[#2b3541] px-2.5 py-1.5 disabled:opacity-40">Previous</button>
              <span className="mono">{page} / {pageCount}</span>
              <button type="button" disabled={page >= pageCount} onClick={() => setPage((current) => current + 1)} className="focus-ring rounded-md border border-[#2b3541] px-2.5 py-1.5 disabled:opacity-40">Next</button>
            </div>
          </div>
        </section>
      )}

      <div className="flex items-start gap-2 rounded-lg border border-[#29333e] bg-[#0b1118] px-3 py-2.5 text-[9px] leading-5 text-[#8a97a6]">
        <AlertCircle size={13} className="mt-0.5 shrink-0 text-[#b6f36a]" />
        Token counts and prices are estimates. Prompt analysis runs locally; no prompts are sent to a provider. Accuracy and semantic quality are not evaluated.
      </div>
    </div>
  );
}
