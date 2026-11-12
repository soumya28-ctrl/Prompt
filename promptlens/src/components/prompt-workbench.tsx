"use client";

import { useState } from "react";
import { AudioLines, BarChart3, Braces, CircleHelp, Cpu, FileSpreadsheet, ScanText, Sparkles } from "lucide-react";
import Link from "next/link";
import { BatchCsvPanel } from "@/components/batch-csv-panel";
import { SinglePromptPanel } from "@/components/single-prompt-panel";

type WorkspaceTab = "single" | "batch";

export function PromptWorkbench() {
  const [activeTab, setActiveTab] = useState<WorkspaceTab>("single");

  return (
    <main className="mx-auto min-h-screen max-w-[1480px] px-5 pb-12 sm:px-8 lg:px-12">
      <header className="flex h-[76px] items-center justify-between border-b border-[#202833]">
        <Link href="/" className="focus-ring flex items-center gap-3 rounded-sm" aria-label="PromptLens home">
          <span className="grid size-9 place-items-center rounded-xl bg-[#b6f36a] text-[#11180d]">
            <ScanText size={19} strokeWidth={2.2} />
          </span>
          <span className="text-[17px] font-semibold tracking-[-0.04em]">prompt<span className="text-[#b6f36a]">lens</span></span>
          <span className="ml-1 hidden rounded-full border border-[#29333f] px-2 py-1 text-[9px] font-medium tracking-[.13em] text-[#93a0b0] sm:inline">WORKBENCH</span>
        </Link>
        <div className="flex items-center gap-2 text-[11px] text-[#9ba7b6]">
          <span className="size-1.5 rounded-full bg-[#b6f36a]" />
          <span>LOCAL ANALYSIS · NO MODEL CALLS</span>
        </div>
      </header>

      <section className="grid gap-8 pb-8 pt-10 md:grid-cols-[1fr_auto] md:items-end md:pt-14">
        <div>
          <div className="mb-4 flex items-center gap-2 text-[10px] font-semibold tracking-[.19em] text-[#a5e65e]">
            <span className="h-px w-6 bg-[#b6f36a]" />
            A CLEARER WAY TO WORK WITH PROMPTS
          </div>
          <h1 className="max-w-[760px] text-[clamp(2.4rem,6vw,5.1rem)] font-semibold leading-[.99] tracking-[-.075em] text-[#f0f3f5]">
            See what your prompt<br className="hidden sm:block" /> is really <span className="text-[#b6f36a]">costing you.</span>
          </h1>
          <p className="mt-5 max-w-[610px] text-[14px] leading-6 text-[#929eae]">
            Structure single prompts, compare model costs, or audit a spreadsheet of up to 500 prompts — privately, with transparent local estimates.
          </p>
        </div>
        <div className="grid grid-cols-3 gap-px overflow-hidden rounded-xl border border-[#242d3a] bg-[#242d3a] md:min-w-[310px]">
          {[
            { icon: Sparkles, value: "01", label: "OPTIMIZE" },
            { icon: BarChart3, value: "02", label: "COMPARE" },
            { icon: FileSpreadsheet, value: "500", label: "PROMPTS" },
          ].map(({ icon: Icon, value, label }) => (
            <div key={label} className="bg-[#10151e] px-3 py-3.5 text-center">
              <Icon className="mx-auto mb-2 text-[#b6f36a]" size={15} />
              <div className="mono text-[13px] text-[#e7edf3]">{value}</div>
              <div className="mt-1 text-[8px] tracking-[.12em] text-[#768395]">{label}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-[#27303d] bg-[#0f141c] shadow-[0_30px_90px_-50px_#000]">
        <div className="flex flex-col justify-between gap-5 border-b border-[#232c37] px-5 py-5 sm:flex-row sm:items-center sm:px-7">
          <div>
            <div className="mono text-[9px] tracking-[.16em] text-[#8491a2]">PROMPT WORKSPACE <span className="text-[#4d5a69]">/</span> ANALYSIS</div>
            <h2 className="mt-2 text-[18px] font-medium tracking-[-.03em]">Choose where to start</h2>
          </div>
          <div className="flex w-fit rounded-lg border border-[#293441] bg-[#0b1017] p-1" role="tablist" aria-label="Analysis mode">
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === "single"}
              onClick={() => setActiveTab("single")}
              className={`focus-ring flex items-center gap-2 rounded-md px-3.5 py-2 text-[11px] transition ${activeTab === "single" ? "bg-[#202b27] text-[#c8f89a]" : "text-[#8995a5] hover:text-white"}`}
            >
              <Braces size={14} /> Single prompt
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === "batch"}
              onClick={() => setActiveTab("batch")}
              className={`focus-ring flex items-center gap-2 rounded-md px-3.5 py-2 text-[11px] transition ${activeTab === "batch" ? "bg-[#202b27] text-[#c8f89a]" : "text-[#8995a5] hover:text-white"}`}
            >
              <FileSpreadsheet size={14} /> Batch CSV
            </button>
          </div>
        </div>

        <div className="p-5 sm:p-7">
          {activeTab === "single" ? <SinglePromptPanel /> : <BatchCsvPanel />}
        </div>
      </section>

      <section className="mt-8 grid gap-3 sm:grid-cols-3">
        {[
          { icon: Cpu, title: "No API key needed", body: "Heuristics run locally in your browser. Provider keys are never requested or sent." },
          { icon: AudioLines, title: "Estimates, clearly labeled", body: "Tokenization is approximate. Always verify provider pricing before budgeting." },
          { icon: CircleHelp, title: "Accuracy isn't guessed", body: "Quality metrics need actual model outputs and trusted reference answers." },
        ].map(({ icon: Icon, title, body }) => (
          <article key={title} className="rounded-xl border border-[#202833] bg-[#0d1219] p-4">
            <div className="mb-3 grid size-8 place-items-center rounded-lg border border-[#26323d] bg-[#131b21] text-[#b6f36a]">
              <Icon size={15} />
            </div>
            <h3 className="text-[12px] font-medium text-[#dfe5eb]">{title}</h3>
            <p className="mt-1.5 text-[11px] leading-[1.65] text-[#8491a2]">{body}</p>
          </article>
        ))}
      </section>

      <footer className="mt-10 flex flex-col gap-2 border-t border-[#202833] pt-5 text-[10px] text-[#727f90] sm:flex-row sm:items-center sm:justify-between">
        <span className="mono tracking-[.1em]">PROMPTLENS <span className="text-[#b6f36a]">/</span> PRIVATE BY DESIGN</span>
        <span>Local heuristic analysis · Not an AI model benchmark</span>
      </footer>
    </main>
  );
}
