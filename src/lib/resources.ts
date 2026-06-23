import { ResourceType } from "@prisma/client";

export function resourceTypeLabel(type: ResourceType): string {
  if (type === ResourceType.PDF) return "PDF";
  if (type === ResourceType.YOUTUBE) return "YouTube";
  return "Link";
}

export function parseHttpUrl(url: string): string | null {
  const trimmed = url.trim();
  if (!trimmed) return null;

  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return null;
    return parsed.toString();
  } catch {
    return null;
  }
}
