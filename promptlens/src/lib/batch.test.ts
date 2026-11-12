import { describe, expect, it } from "vitest";
import { analyzeBatch, createBatchSummary, exportAnalyzedCsv } from "@/lib/batch";

describe("batch analysis", () => {
  it("processes 500 rows in chunks and reports progress", async () => {
    const progress: number[] = [];
    const results = await analyzeBatch(
      Array.from({ length: 500 }, (_, index) => `Summarize document ${index}.`),
      (status) => progress.push(status.percent),
    );
    expect(results).toHaveLength(500);
    expect(progress.at(-1)).toBe(100);
    expect(progress.length).toBeGreaterThan(1);
  });

  it("aggregates token savings and provider costs", async () => {
    const rows = await analyzeBatch(["Please summarize this."], () => undefined);
    const summary = createBatchSummary(rows);
    expect(summary.promptCount).toBe(1);
    expect(summary.modelCosts["GPT-4.1"].before).toBeGreaterThan(0);
    expect(summary.modelCosts["GPT-4.1"].after).toBeGreaterThan(0);
    expect(Object.values(summary.modelCounts).reduce((sum, count) => sum + count, 0)).toBe(1);
  });

  it("exports the original and optimized prompts and prevents formula injection", async () => {
    const rows = await analyzeBatch(["=SUM(A1:A2)"], () => undefined);
    const exported = exportAnalyzedCsv(rows);
    expect(exported).toContain("'=SUM(A1:A2)");
    expect(exported).toContain("optimized_prompt");
  });
});
