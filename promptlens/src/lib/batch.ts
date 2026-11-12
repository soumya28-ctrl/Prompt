import { analyzePrompt } from "@/lib/optimizer";
import type { BatchProgress, PromptAnalysis } from "@/types/analysis";

export const MAX_BATCH_PROMPTS = 500;
export const MAX_CSV_BYTES = 4 * 1024 * 1024;
export const MAX_SINGLE_PROMPT_CHARS = 50_000;
export const MAX_BATCH_TEXT_CHARS = 1_000_000;
const CHUNK_SIZE = 20;

function yieldToBrowser(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

export async function analyzeBatch(
  prompts: string[],
  onProgress: (progress: BatchProgress) => void,
): Promise<PromptAnalysis[]> {
  if (!prompts.length) throw new Error("Choose a CSV file with at least one non-empty prompt.");
  if (prompts.length > MAX_BATCH_PROMPTS) throw new Error(`The batch limit is ${MAX_BATCH_PROMPTS} prompts. Split this file into smaller batches.`);
  if (prompts.some((prompt) => prompt.length > MAX_SINGLE_PROMPT_CHARS)) {
    throw new Error(`Each prompt must be ${MAX_SINGLE_PROMPT_CHARS.toLocaleString()} characters or fewer.`);
  }
  if (prompts.reduce((total, prompt) => total + prompt.length, 0) > MAX_BATCH_TEXT_CHARS) {
    throw new Error(`Combined prompt text must be ${MAX_BATCH_TEXT_CHARS.toLocaleString()} characters or fewer.`);
  }

  const results: PromptAnalysis[] = [];
  for (let start = 0; start < prompts.length; start += CHUNK_SIZE) {
    const chunk = prompts.slice(start, start + CHUNK_SIZE);
    results.push(...chunk.map((prompt, index) => analyzePrompt(prompt, `prompt-${start + index + 1}`)));
    const processed = Math.min(start + chunk.length, prompts.length);
    onProgress({
      processed,
      total: prompts.length,
      percent: Math.round(processed / prompts.length * 100),
    });
    if (processed < prompts.length) await yieldToBrowser();
  }
  return results;
}

export function createBatchSummary(results: PromptAnalysis[]) {
  const originalTokens = results.reduce((sum, item) => sum + item.originalTokens, 0);
  const optimizedTokens = results.reduce((sum, item) => sum + item.optimizedTokens, 0);
  const modelCosts = Object.fromEntries(
    Object.keys(results[0]?.costsBefore ?? {}).map((model) => [
      model,
      {
        before: Number(results.reduce((sum, item) => sum + item.costsBefore[model], 0).toFixed(6)),
        after: Number(results.reduce((sum, item) => sum + item.costsAfter[model], 0).toFixed(6)),
      },
    ]),
  );
  const modelCounts = results.reduce<Record<string, number>>((counts, item) => {
    const model = item.recommendations[0]?.model.id ?? "No match";
    counts[model] = (counts[model] ?? 0) + 1;
    return counts;
  }, {});

  return {
    promptCount: results.length,
    originalTokens,
    optimizedTokens,
    tokensSaved: originalTokens - optimizedTokens,
    savingsPercent: originalTokens
      ? Number(((originalTokens - optimizedTokens) / originalTokens * 100).toFixed(1))
      : 0,
    modelCosts,
    modelCounts,
  };
}

export function exportAnalyzedCsv(rows: PromptAnalysis[]): string {
  const columns = [
    "original_prompt", "optimized_prompt", "task_type", "complexity_score",
    "original_tokens_estimate", "optimized_tokens_estimate", "tokens_saved_estimate",
    "top_recommended_model", "top_recommendation_reason",
    ...Object.keys(rows[0]?.costsBefore ?? {}).flatMap((model) => [`cost_${model}_before`, `cost_${model}_after`]),
  ];
  const csvEscape = (value: string | number) => {
    let text = String(value);
    if (/^[=+\-@]/.test(text)) text = `'${text}`;
    return `"${text.replace(/"/g, '""')}"`;
  };
  const records = rows.map((row) => [
    row.original,
    row.optimized,
    row.taskType,
    row.complexityScore,
    row.originalTokens,
    row.optimizedTokens,
    row.tokensSaved,
    row.recommendations[0]?.model.id ?? "",
    row.recommendations[0]?.explanation ?? "",
    ...Object.keys(row.costsBefore).flatMap((model) => [row.costsBefore[model], row.costsAfter[model]]),
  ]);
  return [columns.map(csvEscape).join(","), ...records.map((record) => record.map(csvEscape).join(","))].join("\r\n");
}
