import { templateMarkupToPreviewHtml } from "@/lib/template-markup";

export function ResourceDescription({ description }: { description: string }) {
  if (!description.trim()) return null;

  const html = templateMarkupToPreviewHtml(description);

  return (
    <div
      className="mt-1 text-sm text-slate-600"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
