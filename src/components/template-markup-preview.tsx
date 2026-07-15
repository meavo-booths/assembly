"use client";

import { templateMarkupToPreviewHtml } from "@/lib/template-markup";

export function TemplateMarkupPreview({ text }: { text: string }) {
  if (!text.trim()) return null;

  const html = templateMarkupToPreviewHtml(text);

  return (
    <div
      className="max-h-60 overflow-auto rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
