"use server";

import { del, put } from "@vercel/blob";
import { ResourceType } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireMeavoAccess } from "@/lib/meavo-auth";
import { parseBoothModels, parseYoutubeVideoId } from "@/lib/booth-models";
import { parseHttpUrl, RESOURCE_IMAGE_MIME_TYPES } from "@/lib/resources";
import {
  MAX_RESOURCE_FILES,
  MAX_RESOURCE_IMAGE_BYTES,
  MAX_RESOURCE_IMAGE_ERROR,
  MAX_RESOURCE_PDF_BYTES,
  MAX_RESOURCE_PDF_ERROR,
} from "@/lib/upload-limits";

function getUploadedFiles(formData: FormData): File[] {
  return formData
    .getAll("files")
    .filter((entry): entry is File => entry instanceof File && entry.size > 0);
}

async function uploadResourceFiles(
  files: File[],
  maxBytes: number,
  maxError: string,
): Promise<{ storageKey: string; fileName: string; mimeType: string }[]> {
  const uploaded: { storageKey: string; fileName: string; mimeType: string }[] = [];

  for (const file of files) {
    if (file.size > maxBytes) {
      throw new Error(maxError);
    }

    const blob = await put(`resources/${file.name}`, file, {
      access: "private",
      addRandomSuffix: true,
    });

    uploaded.push({
      storageKey: blob.pathname,
      fileName: file.name,
      mimeType: file.type,
    });
  }

  return uploaded;
}

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
    const files = getUploadedFiles(formData);
    if (files.length === 0) return { error: "Please choose at least one PDF file." };
    if (files.length > MAX_RESOURCE_FILES) {
      return { error: `You can upload up to ${MAX_RESOURCE_FILES} files at once.` };
    }

    for (const file of files) {
      if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
        return { error: "All files must be PDFs." };
      }
    }

    try {
      const uploaded = await uploadResourceFiles(files, MAX_RESOURCE_PDF_BYTES, MAX_RESOURCE_PDF_ERROR);

      await prisma.resource.create({
        data: {
          title,
          description,
          type: ResourceType.PDF,
          sortOrder,
          models: { create: models.map((boothModel) => ({ boothModel })) },
          files: {
            create: uploaded.map((file) => ({
              storageKey: file.storageKey,
              fileName: file.fileName,
              mimeType: file.mimeType || "application/pdf",
            })),
          },
        },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to upload PDF. Try again.";
      return { error: message };
    }
  } else if (type === "IMAGE") {
    const files = getUploadedFiles(formData);
    if (files.length === 0) return { error: "Please choose at least one image." };
    if (files.length > MAX_RESOURCE_FILES) {
      return { error: `You can upload up to ${MAX_RESOURCE_FILES} files at once.` };
    }

    for (const file of files) {
      if (!RESOURCE_IMAGE_MIME_TYPES.has(file.type)) {
        return { error: "Images must be JPEG, PNG, WebP, or GIF." };
      }
    }

    try {
      const uploaded = await uploadResourceFiles(files, MAX_RESOURCE_IMAGE_BYTES, MAX_RESOURCE_IMAGE_ERROR);

      await prisma.resource.create({
        data: {
          title,
          description,
          type: ResourceType.IMAGE,
          sortOrder,
          models: { create: models.map((boothModel) => ({ boothModel })) },
          files: {
            create: uploaded.map((file) => ({
              storageKey: file.storageKey,
              fileName: file.fileName,
              mimeType: file.mimeType,
            })),
          },
        },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to upload images. Try again.";
      return { error: message };
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
    return { error: "Choose PDF, Image, YouTube, or Link." };
  }

  revalidatePath("/resources");
  revalidatePath("/resources/preview");
  return {};
}

export async function deleteResource(formData: FormData): Promise<void> {
  await requireMeavoAccess();
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const resource = await prisma.resource.findUnique({
    where: { id },
    include: { files: true },
  });
  if (!resource) return;

  for (const file of resource.files) {
    try {
      await del(file.storageKey);
    } catch {
      // Blob may already be gone; still remove DB row.
    }
  }

  await prisma.resource.delete({ where: { id } });
  revalidatePath("/resources");
  revalidatePath("/resources/preview");
}

export async function moveResource(formData: FormData): Promise<void> {
  await requireMeavoAccess();
  const id = String(formData.get("id") ?? "");
  const direction = formData.get("direction") === "down" ? "down" : "up";
  if (!id) return;

  const resource = await prisma.resource.findUnique({ where: { id } });
  if (!resource) return;

  const resources = await prisma.resource.findMany({
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });

  const index = resources.findIndex((entry) => entry.id === id);
  const swapIndex = direction === "up" ? index - 1 : index + 1;
  if (index < 0 || swapIndex < 0 || swapIndex >= resources.length) return;

  const other = resources[swapIndex];
  await prisma.$transaction([
    prisma.resource.update({ where: { id }, data: { sortOrder: other.sortOrder } }),
    prisma.resource.update({ where: { id: other.id }, data: { sortOrder: resource.sortOrder } }),
  ]);

  revalidatePath("/resources");
  revalidatePath("/resources/preview");
}
