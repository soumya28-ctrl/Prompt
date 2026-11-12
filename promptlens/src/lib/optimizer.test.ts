import { describe, expect, it } from "vitest";
import { analyzePrompt, inspectPrompt, optimizePrompt, scoreComplexity } from "@/lib/optimizer";
import { estimateCost, estimateTokens } from "@/lib/token-estimator";
import { classifyTask } from "@/lib/task-classifier";
import { recommendModels } from "@/lib/recommender";
import { GET as getModels } from "@/app/api/models/route";
import { POST as postAnalyze } from "@/app/api/analyze/route";

describe("prompt inspection and optimization", () => {
  it("counts the six visible prompt signals and normalizes complexity", () => {
    const signals = inspectPrompt("Compare these options. Return a table with risks.");
    expect(signals.wordCount).toBeGreaterThan(0);
    expect(signals.sentenceCount).toBe(2);
    expect(signals.reasoningIndicators).toBeGreaterThan(0);
    expect(scoreComplexity(signals)).toBeGreaterThanOrEqual(0);
    expect(scoreComplexity(signals)).toBeLessThanOrEqual(100);
  });

  it("preserves the full source prompt in the structured version", () => {
    const prompt = "Act as a reviewer.\nTask: Find security issues.\nContext: Source code is confidential.";
    const result = optimizePrompt(prompt);
    expect(result.optimized).toContain(prompt);
    expect(result.optimized).toContain("Constraints:");
    expect(result.optimized).toContain("Output:");
  });

  it("does not duplicate an already complete structured prompt", () => {
    const prompt = "Role: Editor\nTask: Edit the text.\nContext: Product page.\nConstraints: Keep facts.\nOutput: Markdown.";
    expect(optimizePrompt(prompt).optimized).toBe(prompt);
  });

  it("returns estimates and recommendations for an analysis", () => {
    const result = analyzePrompt("Debug this TypeScript function and explain the bug.", "test-prompt");
    expect(result.id).toBe("test-prompt");
    expect(result.taskType).toBe("Coding");
    expect(result.recommendations.length).toBe(3);
    expect(result.originalTokens).toBeGreaterThan(0);
  });
});

describe("task routing and costs", () => {
  it.each([
    ["Summarize this report in three bullets.", "Summarization"],
    ["Extract every clause from these contracts.", "Large-context extraction"],
    ["Write a short poem about the rain.", "Creative writing"],
    ["Compare the choices and recommend one.", "Reasoning"],
  ] as const)("classifies task %s", (prompt, expected) => {
    expect(classifyTask(prompt)).toBe(expected);
  });

  it("returns three model recommendations in ranked order", () => {
    const recommendations = recommendModels("Reasoning", 80, 500);
    expect(recommendations).toHaveLength(3);
    expect(recommendations[0].score).toBeGreaterThanOrEqual(recommendations[1].score);
    expect(recommendations[1].score).toBeGreaterThanOrEqual(recommendations[2].score);
  });

  it("estimates tokens, zeroes empty prompts, and calculates cost", () => {
    expect(estimateTokens("")).toBe(0);
    expect(estimateTokens("A small prompt.")).toBeGreaterThan(0);
    expect(estimateTokens("東京です")).toBeGreaterThan(1);
    expect(estimateCost(1_000_000, 1_000_000, 1, 2)).toBe(3);
  });
});

describe("API routes", () => {
  it("returns provider model data without credentials", async () => {
    const response = getModels();
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.models.some((model: { provider: string }) => model.provider === "Google")).toBe(true);
  });

  it("validates and analyzes a single-prompt API request", async () => {
    const request = new Request("http://localhost/api/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt: "Write a short summary." }),
    });
    const response = await postAnalyze(request as import("next/server").NextRequest);
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.analysis.original).toBe("Write a short summary.");
    expect(body.optimization.optimized).toContain("Task:");
  });

  it("rejects malformed or empty analysis requests", async () => {
    const request = new Request("http://localhost/api/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt: "   " }),
    });
    const response = await postAnalyze(request as import("next/server").NextRequest);
    expect(response.status).toBe(400);
  });
});
