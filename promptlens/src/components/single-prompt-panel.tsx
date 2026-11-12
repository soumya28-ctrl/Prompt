"use client";

import { useMemo, useState } from "react";
import { ArrowRight, Check, ChevronDown, ChevronUp, CircleAlert, Copy, Lightbulb, WandSparkles } from "lucide-react";
import { MODELS, PROVIDERS, type ProviderFilter } from "@/lib/models";
import { analyzePrompt, optimizePrompt } from "@/lib/optimizer";
import { estimateCost, estimateTokens, formatCurrency } from "@/lib/token-estimator";
import type { PromptAnalysis } from "@/types/analysis";

const STARTER_PROMPT = "Compare the two approaches for moving our analytics service to the cloud. Consider cost, delivery risk, and ongoing operations. Recommend one approach in a concise table and explain the key trade-offs.";

export function SinglePromptPanel() {
  const [prompt, setPrompt] = useState(STARTER_PROMPT);
  const [analysis, setAnalysis] = useState<PromptAnalysis | null>(null);
  const [provider, setProvider] = useState<ProviderFilter>("All");
  const [outputTokens, setOutputTokens] = useState(512);
  const [monthlyRequests, setMonthlyRequests] = useState(10_000);
  const [showOptimized, setShowOptimized] = useState(true);
  const [copied, setCopied] = useState(false);

  const visibleModels = useMemo(
    () => MODELS.filter((model) => provider === "All" || model.provider === provider),
    [provider],
  );

  function runAnalysis() {
    if (!prompt.trim()) return;
    setAnalysis(analyzePrompt(prompt.trim()));
  }

  async function copyOptimized() {
    if (!analysis) return;
    await navigator.clipboard.writeText(analysis.optimized);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }

  const optimizedImprovements = analysis ? optimizePrompt(analysis.original).improvements : [];

  return (
    <div className="grid gap-7">
      <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
        <section>
          <div className="mb-3 flex items-center justify-between">
            <label htmlFor="prompt-input" className="text-[12px] font-medium text-[#d9e0e7]">Your prompt</label>
            <span className="mono text-[9px] text-[#728091]">{estimateTokens(prompt)} EST. TOKENS</span>
          </div>
          <textarea
            id="prompt-input"
            value={prompt}
            onChange={(event) => {
              setPrompt(event.target.value);
              setAnalysis(null);
            }}
            maxLength={50_000}
            placeholder="Write or paste the prompt you want to improve…"
            className="focus-ring min-h-[220px] w-full resize-y rounded-xl border border-[#2a3441] bg-[#090e14] p-4 text-[12px] leading-[1.8] text-[#d5dde6] placeholder:text-[#566273]"
          />
          <div className="mt-2 flex items-center justify-between">
            <span className="text-[9px] text-[#697688]">Prompt text stays in this browser.</span>
            <span className="mono text-[9px] text-[#697688]">{prompt.length.toLocaleString()} / 50,000</span>
          </div>
          <button
            type="button"
            onClick={runAnalysis}
            disabled={!prompt.trim()}
            className="focus-ring mt-4 inline-flex items-center gap-2 rounded-lg bg-[#b6f36a] px-4 py-2.5 text-[11px] font-semibold text-[#11180d] transition hover:bg-[#c7fa87] disabled:cursor-not-allowed disabled:opacity-40"
          >
            <WandSparkles size={14} /> Analyze & optimize <ArrowRight size={13} />
          </button>
        </section>

        <section className="rounded-xl border border-[#252f3b] bg-[#0b1017] p-4 sm:p-5">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <div className="mono text-[9px] tracking-[.13em] text-[#98d95e]">TASK PROFILE</div>
              <h3 className="mt-1.5 text-[13px] font-medium text-[#e1e7ed]">What this prompt is asking</h3>
            </div>
            {analysis && (
              <span className="rounded-full border border-[#394331] bg-[#182116] px-2.5 py-1 text-[9px] text-[#c0ed90]">
                {analysis.taskType}
              </span>
            )}
          </div>
          {analysis ? (
            <>
              <div className="mb-4 flex items-end justify-between">
                <span className="text-[10px] text-[#93a0ae]">Heuristic complexity</span>
                <span className="mono text-[15px] text-[#edf2f5]">{analysis.complexityScore}<span className="text-[9px] text-[#7c8998]"> / 100</span></span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-[#202a35]">
                <div className="h-full rounded-full bg-[#b6f36a] transition-all" style={{ width: `${analysis.complexityScore}%` }} />
              </div>
              <div className="mt-5 grid grid-cols-2 gap-2">
                {[
                  ["Words", analysis.signals.wordCount],
                  ["Sentences", analysis.signals.sentenceCount],
                  ["Instruction density", `${analysis.signals.instructionDensity}%`],
                  ["Keyword complexity", `${analysis.signals.keywordComplexity}%`],
                  ["Word entropy", analysis.signals.entropy],
                  ["Reasoning markers", analysis.signals.reasoningIndicators],
                ].map(([label, value]) => (
                  <div key={label} className="flex justify-between gap-2 border-b border-[#202833] py-2 text-[10px]">
                    <span className="text-[#8793a2]">{label}</span>
                    <span className="mono text-[#d3dce5]">{value}</span>
                  </div>
                ))}
              </div>
              <div className="mt-4 flex flex-wrap gap-1.5">
                {([
                  ["Context", analysis.signals.hasContext],
                  ["Constraints", analysis.signals.hasConstraints],
                  ["Output format", analysis.signals.hasOutputFormat],
                ] as const).map(([label, found]) => (
                  <span key={label} className={`rounded-md border px-2 py-1 text-[9px] ${found ? "border-[#354536] text-[#c2e69e]" : "border-[#303a45] text-[#8592a2]"}`}>
                    {found ? "✓" : "○"} {label}
                  </span>
                ))}
              </div>
            </>
          ) : (
            <div className="flex min-h-[175px] flex-col items-center justify-center text-center">
              <div className="mb-3 grid size-10 place-items-center rounded-xl border border-[#2b3742] bg-[#141b23] text-[#b6f36a]"><Lightbulb size={17} /></div>
              <p className="max-w-[250px] text-[11px] leading-5 text-[#8794a4]">Run an analysis to see complexity signals, task classification, cost estimates, and model recommendations.</p>
            </div>
          )}
        </section>
      </div>

      {analysis && (
        <>
          <section className="overflow-hidden rounded-xl border border-[#2a3441]">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#26303b] bg-[#111821] px-4 py-3">
              <div>
                <div className="mono text-[9px] tracking-[.14em] text-[#a5e65e]">ROLE · TASK · CONTEXT · CONSTRAINTS · OUTPUT</div>
                <h3 className="mt-1 text-[12px] font-medium">Structured prompt</h3>
              </div>
              <div className="flex items-center gap-2">
                <span className={`mono rounded-md border px-2 py-1.5 text-[9px] ${analysis.tokensSaved >= 0 ? "border-[#354536] text-[#c2e69e]" : "border-[#5a4631] text-[#f0c58d]"}`}>
                  {analysis.tokensSaved >= 0 ? `${analysis.tokensSaved} est. tokens saved` : `${Math.abs(analysis.tokensSaved)} est. tokens added`}
                </span>
                <button type="button" onClick={copyOptimized} className="focus-ring inline-flex items-center gap-1.5 rounded-md border border-[#303b48] px-2.5 py-1.5 text-[9px] text-[#bdc7d2] hover:border-[#94bd63]">
                  {copied ? <Check size={12} /> : <Copy size={12} />} {copied ? "Copied" : "Copy optimized"}
                </button>
              </div>
            </div>
            <div className="grid divide-y divide-[#242e39] md:grid-cols-2 md:divide-x md:divide-y-0">
              <div className="p-4">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-[9px] uppercase tracking-[.1em] text-[#8592a2]">Original</span>
                  <span className="mono text-[9px] text-[#788596]">{analysis.originalTokens} est. tokens</span>
                </div>
                <pre className="max-h-[320px] overflow-auto whitespace-pre-wrap break-words font-sans text-[10px] leading-[1.8] text-[#aeb9c6]">{analysis.original}</pre>
              </div>
              <div className="bg-[#0d1414] p-4">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-[9px] uppercase tracking-[.1em] text-[#a5e65e]">Optimized · structured</span>
                  <span className="mono text-[9px] text-[#bce78f]">{analysis.optimizedTokens} est. tokens</span>
                </div>
                <pre className="max-h-[320px] overflow-auto whitespace-pre-wrap break-words font-sans text-[10px] leading-[1.8] text-[#d2dccb]">{analysis.optimized}</pre>
              </div>
            </div>
            <button type="button" onClick={() => setShowOptimized(!showOptimized)} aria-expanded={showOptimized} className="flex w-full items-center justify-between border-t border-[#26303b] px-4 py-2.5 text-left text-[9px] text-[#9ba8b6] hover:bg-[#131a22]">
              <span>What changed & why</span>{showOptimized ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
            </button>
            {showOptimized && (
              <ul className="grid gap-2 border-t border-[#242e39] px-4 py-3 sm:grid-cols-2">
                {optimizedImprovements.map((improvement) => (
                  <li key={improvement} className="flex gap-2 text-[10px] leading-5 text-[#a8b3bf]">
                    <Check className="mt-1 shrink-0 text-[#b6f36a]" size={12} />{improvement}
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section>
            <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
              <div>
                <div className="mono text-[9px] tracking-[.14em] text-[#a5e65e]">MODEL MATCH</div>
                <h3 className="mt-1 text-[14px] font-medium">Top recommendations</h3>
              </div>
              <span className="flex items-center gap-1 text-[9px] text-[#818e9e]"><CircleAlert size={12} /> Heuristic fit, not a benchmark</span>
            </div>
            <div className="grid gap-2 md:grid-cols-3">
              {analysis.recommendations.map((recommendation, index) => (
                <article key={recommendation.model.id} className={`rounded-xl border p-3.5 ${index === 0 ? "border-[#475a3a] bg-[#131b13]" : "border-[#27313d] bg-[#0c1118]"}`}>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="text-[11px] font-medium text-[#e4eaf0]">{recommendation.model.id}</div>
                      <div className="mt-1 text-[9px] text-[#8794a4]">{recommendation.model.provider} · {index === 0 ? "Best fit" : `Option ${index + 1}`}</div>
                    </div>
                    <span className="mono rounded-md border border-[#354236] px-1.5 py-1 text-[9px] text-[#c3ed97]">{recommendation.score}</span>
                  </div>
                  <p className="mt-3 text-[9px] leading-[1.7] text-[#9aa6b5]">{recommendation.explanation}</p>
                  <div className="mt-3 border-t border-[#27313a] pt-2 text-[9px] text-[#7f8c9c]">
                    {formatCurrency(estimateCost(analysis.optimizedTokens, outputTokens, recommendation.model.inputPerMillion, recommendation.model.outputPerMillion))} / request
                  </div>
                </article>
              ))}
            </div>
          </section>

          <section className="rounded-xl border border-[#27313d] bg-[#0b1017] p-4 sm:p-5">
            <div className="mb-4">
              <div className="mono text-[9px] tracking-[.14em] text-[#a5e65e]">COST EXPLORER</div>
              <h3 className="mt-1 text-[13px] font-medium">Compare estimated provider costs</h3>
            </div>
            <div className="mb-5 grid gap-4 rounded-lg border border-[#252f3b] bg-[#0e141c] p-3 sm:grid-cols-2">
              <label className="grid gap-2 text-[9px] text-[#9aa6b4]">
                <span className="flex justify-between">Expected output length <span className="mono text-[#dce4ec]">{outputTokens.toLocaleString()} tokens</span></span>
                <input className="range-input w-full" type="range" min="64" max="4096" step="64" value={outputTokens} onChange={(event) => setOutputTokens(Number(event.target.value))} />
              </label>
              <label className="grid gap-2 text-[9px] text-[#9aa6b4]">
                <span className="flex justify-between">Monthly requests <span className="mono text-[#dce4ec]">{monthlyRequests.toLocaleString()}</span></span>
                <input className="range-input w-full" type="range" min="100" max="1000000" step="100" value={monthlyRequests} onChange={(event) => setMonthlyRequests(Number(event.target.value))} />
              </label>
            </div>
            <div className="mb-3 flex flex-wrap gap-1.5" role="group" aria-label="Filter by provider">
              {PROVIDERS.map((item) => (
                <button key={item} type="button" onClick={() => setProvider(item)} className={`focus-ring rounded-full border px-2.5 py-1 text-[9px] ${provider === item ? "border-[#65864c] bg-[#172216] text-[#c8f39d]" : "border-[#29333f] text-[#8e9aaa] hover:border-[#526151]"}`}>
                  {item}
                </button>
              ))}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[690px] border-collapse text-left">
                <thead><tr className="border-b border-[#27313d] text-[8px] uppercase tracking-[.08em] text-[#7f8c9b]">
                  <th className="py-2 font-medium">Model</th><th className="py-2 font-medium">Provider</th><th className="py-2 text-right font-medium">Input / 1M</th><th className="py-2 text-right font-medium">Output / 1M</th><th className="py-2 text-right font-medium">Optimized / request</th><th className="py-2 text-right font-medium">Original / month</th><th className="py-2 text-right font-medium">Optimized / month</th>
                </tr></thead>
                <tbody>
                  {visibleModels.map((model) => {
                    const originalCost = estimateCost(analysis.originalTokens, outputTokens, model.inputPerMillion, model.outputPerMillion);
                    const optimizedCost = estimateCost(analysis.optimizedTokens, outputTokens, model.inputPerMillion, model.outputPerMillion);
                    return (
                      <tr key={model.id} className="border-b border-[#202833] text-[9px] last:border-0">
                        <td className="py-2.5 font-medium text-[#dbe2e9]">{model.id}</td>
                        <td className="py-2.5 text-[#8c99a8]">{model.provider}</td>
                        <td className="mono py-2.5 text-right text-[#aab5c2]">{formatCurrency(model.inputPerMillion, 2)}</td>
                        <td className="mono py-2.5 text-right text-[#aab5c2]">{formatCurrency(model.outputPerMillion, 2)}</td>
                        <td className="mono py-2.5 text-right text-[#c9e6ac]">{formatCurrency(optimizedCost)}</td>
                        <td className="mono py-2.5 text-right text-[#9ba7b5]">{formatCurrency(originalCost * monthlyRequests, 2)}</td>
                        <td className="mono py-2.5 text-right text-[#e1e8ef]">{formatCurrency(optimizedCost * monthlyRequests, 2)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <p className="mt-3 text-[9px] leading-4 text-[#718092]">Illustrative public-rate estimates. Cached input, tool calls, taxes, and provider-specific tiers are not included. Verify current pricing with your provider.</p>
          </section>
        </>
      )}
    </div>
  );
}
