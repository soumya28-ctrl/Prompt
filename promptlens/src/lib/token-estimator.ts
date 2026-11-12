/**
 * Lightweight tokenizer estimate. Provider tokenizers vary, so these figures
 * are deliberately labeled estimates instead of claiming provider-exact counts.
 */
export function estimateTokens(text: string, modelId?: string): number {
  if (!text.trim()) return 0;

  const words = text.match(/[\u3400-\u9FFF]|[\u3040-\u30FF]|[\uAC00-\uD7AF]|[\p{L}\p{N}_]+|[^\s\p{L}\p{N}_]/gu) ?? [];
  const isNonLatinHeavy = /[^\u0000-\u024f]/u.test(text);
  const divisor = modelId?.startsWith("Gemini") ? 1.25 : isNonLatinHeavy ? 1.25 : 1.45;
  return Math.max(1, Math.ceil(words.length / divisor));
}

export function estimateCost(
  inputTokens: number,
  outputTokens: number,
  inputPerMillion: number,
  outputPerMillion: number,
): number {
  return (inputTokens * inputPerMillion + outputTokens * outputPerMillion) / 1_000_000;
}

export function formatCurrency(value: number, maximumFractionDigits = 6): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits,
    minimumFractionDigits: maximumFractionDigits,
  }).format(value);
}
