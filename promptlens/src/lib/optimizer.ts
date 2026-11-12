import { estimateTokens } from "@/lib/token-estimator";
import { classifyTask } from "@/lib/task-classifier";
import { recommendModels } from "@/lib/recommender";
import { MODELS } from "@/lib/models";
import type { PromptAnalysis, PromptSignals } from "@/types/analysis";

const WORD = /[\p{L}\p{N}_'-]+/gu;
const SENTENCE = /[^.!?]+[.!?]?/g;
const INSTRUCTION = /\b(please|must|should|ensure|provide|analyze|analyse|compare|evaluate|recommend|summarize|explain|write|create|include|avoid|return)\b/gi;
const REASONING = /\b(analyze|analyse|compare|evaluate|reason|trade-?off|constraint|recommendation|detailed|strategy|decision|rationale)\b/gi;

export function inspectPrompt(prompt: string): PromptSignals {
  const words = prompt.match(WORD) ?? [];
  const sentences = prompt.match(SENTENCE)?.filter((sentence) => sentence.trim()) ?? [];
  const wordCounts = new Map<string, number>();
  for (const word of words) {
    const normalized = word.toLocaleLowerCase();
    wordCounts.set(normalized, (wordCounts.get(normalized) ?? 0) + 1);
  }
  const entropy = words.length
    ? [...wordCounts.values()].reduce((total, count) => {
      const probability = count / words.length;
      return total - probability * Math.log2(probability);
    }, 0)
    : 0;
  const instructions = prompt.match(INSTRUCTION) ?? [];
  const reasoningMarkers = new Set((prompt.match(REASONING) ?? []).map((word) => word.toLowerCase()));
  return {
    wordCount: words.length,
    sentenceCount: sentences.length,
    instructionDensity: Number((instructions.length / Math.max(1, words.length) * 100).toFixed(1)),
    keywordComplexity: Number((words.filter((word) => word.length >= 7).length / Math.max(1, words.length) * 100).toFixed(1)),
    entropy: Number(entropy.toFixed(2)),
    reasoningIndicators: reasoningMarkers.size,
    hasContext: /\b(context|background|given|source material|audience)\b/i.test(prompt),
    hasConstraints: /\b(must|should|avoid|don't|do not|only|limit|within|constraint)\b/i.test(prompt),
    hasOutputFormat: /\b(format|json|table|bullet|markdown|schema|output)\b/i.test(prompt) || /```/.test(prompt),
  };
}

export function scoreComplexity(signals: PromptSignals): number {
  const raw =
    signals.wordCount * 0.5 +
    signals.sentenceCount * 5 +
    signals.instructionDensity * 0.25 +
    signals.keywordComplexity * 0.15 +
    signals.entropy * 3 +
    signals.reasoningIndicators * 5;
  return Math.min(100, Math.round(raw));
}

export function optimizePrompt(prompt: string): { optimized: string; improvements: string[] } {
  const cleaned = prompt.trim().replace(/\r\n/g, "\n");
  const hasRole = /^\s*(role|act as)\s*:/im.test(cleaned);
  const hasTask = /^\s*task\s*:/im.test(cleaned);
  const hasContext = /^\s*context\s*:/im.test(cleaned);
  const hasConstraints = /^\s*constraints?\s*:/im.test(cleaned);
  const hasOutput = /^\s*(output|format)\s*:/im.test(cleaned);
  if (hasRole && hasTask && hasContext && hasConstraints && hasOutput) {
    return { optimized: cleaned, improvements: ["Preserves the existing structured prompt without adding duplicate sections."] };
  }
  const explicitRole = cleaned.match(/^\s*(role|act as)\s*:.*$/im)?.[0];
  const output = [
    explicitRole ?? "Role: Act as a capable subject-matter assistant.",
    `Task:\n${cleaned}`,
    "Context: Use only the context supplied in the task; identify any critical missing information.",
    "Constraints: Preserve the user's intent, follow stated constraints, and do not invent facts.",
    "Output: Follow any requested format; otherwise use clear, concise structure.",
  ];
  const optimized = output.join("\n\n");
  const improvements = [
    ...(!hasRole ? ["Adds a role to clarify the assistant's perspective."] : []),
    ...(!hasTask ? ["Makes the original request explicit as the task without removing its wording."] : []),
    ...(!hasContext ? ["Adds a context-handling rule so missing facts are not silently assumed."] : []),
    ...(!hasConstraints ? ["Adds a guardrail to preserve intent and avoid fabricated details."] : []),
    ...(!hasOutput ? ["Specifies how to handle output formatting when no format was requested."] : []),
  ];
  return { optimized, improvements };
}

export function analyzePrompt(prompt: string, id = crypto.randomUUID()): PromptAnalysis {
  const signals = inspectPrompt(prompt);
  const complexityScore = scoreComplexity(signals);
  const taskType = classifyTask(prompt);
  const { optimized } = optimizePrompt(prompt);
  const originalTokens = estimateTokens(prompt);
  const optimizedTokens = estimateTokens(optimized);
  const costsBefore = Object.fromEntries(
    MODELS.map((model) => [
      model.id,
      (originalTokens * model.inputPerMillion + Math.max(128, Math.round(originalTokens * 0.4)) * model.outputPerMillion) / 1_000_000,
    ]),
  );
  const costsAfter = Object.fromEntries(
    MODELS.map((model) => [
      model.id,
      (optimizedTokens * model.inputPerMillion + Math.max(128, Math.round(optimizedTokens * 0.4)) * model.outputPerMillion) / 1_000_000,
    ]),
  );

  return {
    id,
    original: prompt,
    optimized,
    signals,
    complexityScore,
    taskType,
    originalTokens,
    optimizedTokens,
    tokensSaved: originalTokens - optimizedTokens,
    savingsPercent: originalTokens
      ? Number(((originalTokens - optimizedTokens) / originalTokens * 100).toFixed(1))
      : 0,
    recommendations: recommendModels(taskType, complexityScore, optimizedTokens),
    costsBefore,
    costsAfter,
  };
}
