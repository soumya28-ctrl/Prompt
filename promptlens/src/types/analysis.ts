export type TaskType =
  | "Reasoning"
  | "Coding"
  | "Creative writing"
  | "Summarization"
  | "Large-context extraction"
  | "General";

export type PromptSignals = {
  wordCount: number;
  sentenceCount: number;
  instructionDensity: number;
  keywordComplexity: number;
  entropy: number;
  reasoningIndicators: number;
  hasContext: boolean;
  hasConstraints: boolean;
  hasOutputFormat: boolean;
};

export type Model = {
  id: string;
  provider: "OpenAI" | "Anthropic" | "Google";
  inputPerMillion: number;
  outputPerMillion: number;
  speed: number;
  reasoning: number;
  coding: number;
  creative: number;
  summarization: number;
  longContext: number;
  contextWindow: number;
};

export type Recommendation = {
  model: Model;
  score: number;
  explanation: string;
};

export type PromptAnalysis = {
  id: string;
  original: string;
  optimized: string;
  signals: PromptSignals;
  complexityScore: number;
  taskType: TaskType;
  originalTokens: number;
  optimizedTokens: number;
  tokensSaved: number;
  savingsPercent: number;
  recommendations: Recommendation[];
  costsBefore: Record<string, number>;
  costsAfter: Record<string, number>;
};

export type BatchProgress = {
  processed: number;
  total: number;
  percent: number;
};

export type OutputScale = {
  expectedOutputTokens: number;
  monthlyRequests: number;
};
