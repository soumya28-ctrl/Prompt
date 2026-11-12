import { NextResponse } from "next/server";
import { MODELS } from "@/lib/models";

export function GET() {
  return NextResponse.json(
    { models: MODELS, pricingNotice: "Illustrative public-rate estimates; verify with providers." },
    { headers: { "Cache-Control": "public, max-age=3600" } },
  );
}
