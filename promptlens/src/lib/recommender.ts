import { MODELS } from "@/lib/models";
import type { Model, Recommendation, TaskType } from "@/types/analysis";

function capability(model: Model, task: TaskType): number {
  switch (task) {
    case "Coding": return model.coding;
    case "Creative writing": return model.creative;
    case "Summarization": return model.summarization;
    case "Large-context extraction": return model.longContext;
    case "Reasoning": return model.reasoning;
    default: return (model.reasoning + model.summarization + model.creative) / 3;
  }
}

export function recommendModels(
  task: TaskType,
  complexity: number,
  promptTokens: number,
): Recommendation[] {
  const candidates = MODELS.map((model) => {
    const fit = capability(model, task) / 5;
    const speed = model.speed / 5;
    const estimatedCost = promptTokens * model.inputPerMillion / 1_000_000;
    const costFit = 1 / (1 + estimatedCost * 100);
    const contextFit = promptTokens <= model.contextWindow ? 1 : 0;
    const strengthWeight = complexity >= 70 ? 0.55 : 0.35;
    const score = (fit * strengthWeight + speed * 0.2 + costFit * 0.25 + contextFit * 0.2) * 100;
    const reasons = [
      `${Math.round(fit * 100)}% capability match for ${task.toLowerCase()}`,
      `${model.speed}/5 speed`,
      `${estimatedCost < 0.001 ? "low" : estimatedCost < 0.01 ? "moderate" : "higher"} estimated input cost`,
    ];
    if (contextFit === 0) reasons.push("prompt exceeds this model's listed context window");
    return {
      model,
      score,
      explanation: reasons.join(" · "),
    };
  })
    .filter((recommendation) => promptTokens <= recommendation.model.contextWindow)
    .sort((a, b) => b.score - a.score);

  return candidates.slice(0, 3).map((recommendation) => ({
    ...recommendation,
    score: Math.round(recommendation.score),
  }));
}
