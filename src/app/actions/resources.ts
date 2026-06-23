"use server";

import { del, put } from "@vercel/blob";
import { ResourceType } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireMeavoAccess } from "@/lib/meavo-auth";
import { parseBoothModels, parseYoutubeVideoId } from "@/lib/booth-models";
import { parseHttpUrl } from "@/lib/resources";

export async function createResource(formData: FormData): Promise<{ error?: string }> {
  await requireMeavoAccess();

  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const type = String(formData.get("type") ?? "");
  const models = parseBoothModels(formData);

  if (!title) return { error: "Title is required." };
  if (models.length === 0) return { error: "Select at least one booth model." };

  const maxOrder = await prisma.resource.aggregate({ _max: { sortOrder: true } });
  const sortOrder = (maxOrder._max.sortOrder ?? -1) + 1;

  if (type === "PDF") {
    const file = formData.get("file");
    if (!(file instanceof File) || file.size === 0) {
      return { error: "Please choose a PDF file." };
    }

    try {
      const blob = await put(`resources/${file.name}`, file, {
        access: "private",
        addRandomSuffix: true,
      });

      await prisma.resource.create({
        data: {
          title,
          description,
          type: ResourceType.PDF,
          storageKey: blob.pathname,
          fileName: file.name,
          mimeType: file.type || "application/pdf",
          sortOrder,
          models: { create: models.map((boothModel) => ({ boothModel })) },
        },
      });
    } catch {
      return { error: "Failed to upload PDF. Try again." };
    }
  } else if (type === "YOUTUBE") {
    const youtubeUrl = String(formData.get("youtubeUrl") ?? "").trim();
    const youtubeVideoId = parseYoutubeVideoId(youtubeUrl);
    if (!youtubeVideoId) return { error: "Enter a valid YouTube link." };

    await prisma.resource.create({
      data: {
        title,
        description,
        type: ResourceType.YOUTUBE,
        youtubeUrl,
        youtubeVideoId,
        sortOrder,
        models: { create: models.map((boothModel) => ({ boothModel })) },
      },
    });
  } else if (type === "LINK") {
    const linkUrl = parseHttpUrl(String(formData.get("linkUrl") ?? ""));
    if (!linkUrl) return { error: "Enter a valid http or https link." };

    await prisma.resource.create({
      data: {
        title,
        description,
        type: ResourceType.LINK,
        linkUrl,
        sortOrder,
        models: { create: models.map((boothModel) => ({ boothModel })) },
      },
    });
  } else {
    return { error: "Choose PDF, YouTube, or Link." };
  }

  revalidatePath("/resources");
  return {};
}

export async function deleteResource(formData: FormData): Promise<void> {
  await requireMeavoAccess();
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const resource = await prisma.resource.findUnique({ where: { id } });
  if (!resource) return;

  if (resource.type === ResourceType.PDF && resource.storageKey) {
    try {
      await del(resource.storageKey);
    } catch {
      // Blob may already be gone; still remove DB row.
    }
  }

  await prisma.resource.delete({ where: { id } });
  revalidatePath("/resources");
}
