import { parseTemplateMarkup } from "@/lib/template-markup";

/** Strip template markup to plain text for list previews. */
export function templateMarkupToPlainText(text: string): string {
  const blocks = parseTemplateMarkup(text);
  const parts: string[] = [];

  for (const block of blocks) {
    if (block.type === "blank") continue;
    const line = block.runs.map((run) => run.text).join("");
    if (line.trim()) parts.push(line.trim());
  }

  return parts.join(" ");
}
