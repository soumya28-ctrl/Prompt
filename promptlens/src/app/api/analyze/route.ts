import { NextRequest, NextResponse } from "next/server";
import { analyzePrompt, optimizePrompt } from "@/lib/optimizer";

const MAX_PROMPT_CHARS = 50_000;

export async function POST(request: NextRequest) {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }

  if (!payload || typeof payload !== "object" || !("prompt" in payload) || typeof payload.prompt !== "string") {
    return NextResponse.json({ error: "Provide a prompt string." }, { status: 400 });
  }
  const prompt = payload.prompt.trim();
  if (!prompt) return NextResponse.json({ error: "Prompt cannot be empty." }, { status: 400 });
  if (prompt.length > MAX_PROMPT_CHARS) {
    return NextResponse.json({ error: `Prompt must be ${MAX_PROMPT_CHARS.toLocaleString()} characters or fewer.` }, { status: 413 });
  }

  return NextResponse.json({
    analysis: analyzePrompt(prompt),
    optimization: optimizePrompt(prompt),
  });
}
