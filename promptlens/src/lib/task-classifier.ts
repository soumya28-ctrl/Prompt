import type { TaskType } from "@/types/analysis";

const PATTERNS: Array<[TaskType, RegExp]> = [
  ["Coding", /\b(code|coding|program|debug|refactor|function|typescript|python|sql|api|bug|compile)\b/i],
  ["Creative writing", /\b(story|creative|poem|script|fiction|brainstorm|marketing copy|write a scene)\b/i],
  ["Large-context extraction", /\b(extract|document|documents|contract|transcript|long context|multiple files|from the following|find every|across all)\b/i],
  ["Summarization", /\b(summarize|summary|summarise|tldr|key points|brief overview)\b/i],
  ["Reasoning", /\b(analyze|analyse|reason|compare|evaluate|trade-?off|prove|step by step|recommend|decision|rationale|multi-step)\b/i],
];

export function classifyTask(prompt: string): TaskType {
  return PATTERNS.find(([, pattern]) => pattern.test(prompt))?.[0] ?? "General";
}
