import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PromptLens — Prompt clarity, cost & model fit",
  description: "Optimize prompts, estimate AI costs, and analyze up to 500 prompts from a CSV.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
