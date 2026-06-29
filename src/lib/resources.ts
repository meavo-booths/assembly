import { ResourceType } from "@prisma/client";

export function resourceTypeLabel(type: ResourceType): string {
  if (type === ResourceType.PDF) return "PDF";
  if (type === ResourceType.YOUTUBE) return "YouTube";
  if (type === ResourceType.IMAGE) return "Image";
  return "Link";
}

export function resourceFileCountLabel(type: ResourceType, count: number): string | null {
  if (count === 0) return null;
  if (type === ResourceType.PDF) return count === 1 ? "1 PDF" : `${count} PDFs`;
  if (type === ResourceType.IMAGE) return count === 1 ? "1 image" : `${count} images`;
  return null;
}

export const RESOURCE_IMAGE_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

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
