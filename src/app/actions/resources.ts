"use server";

import { del, put } from "@vercel/blob";
import { ResourceType } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireMeavoAccess } from "@/lib/meavo-auth";
import { parseBoothModels, parseYoutubeVideoId } from "@/lib/booth-models";
import { parseResourceCategories } from "@/lib/resource-categories";
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

function parseFileCaptions(formData: FormData, fieldName: string): string[] {
  return formData.getAll(fieldName).map((value) => String(value).trim());
}

function parseExistingCaptions(formData: FormData, fileIds: string[]): Map<string, string> {
  const captions = new Map<string, string>();
  for (const fileId of fileIds) {
    captions.set(fileId, String(formData.get(`caption_${fileId}`) ?? "").trim());
  }
  return captions;
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

function parseRemoveFileIds(formData: FormData): string[] {
  return formData
    .getAll("removeFileIds")
    .map((value) => String(value).trim())
    .filter(Boolean);
}

export async function updateResource(formData: FormData): Promise<{ error?: string }> {
  await requireMeavoAccess();

  const id = String(formData.get("id") ?? "").trim();
  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const models = parseBoothModels(formData);
  const categories = parseResourceCategories(formData);

  if (!id) return { error: "Resource not found." };
  if (!title) return { error: "Title is required." };
  if (models.length === 0) return { error: "Select at least one booth model." };
  if (categories.length === 0) return { error: "Select at least one category." };

  const resource = await prisma.resource.findUnique({
    where: { id },
    include: { files: true, models: true },
  });
  if (!resource) return { error: "Resource not found." };

  const removeFileIds = parseRemoveFileIds(formData);
  const removableFiles = resource.files.filter((file) => removeFileIds.includes(file.id));
  if (removableFiles.length !== removeFileIds.length) {
    return { error: "One or more files could not be removed." };
  }

  const newFiles = getUploadedFiles(formData);
  const remainingCount = resource.files.length - removableFiles.length;
  const totalAfterUpdate = remainingCount + newFiles.length;

  if (resource.type === ResourceType.PDF || resource.type === ResourceType.IMAGE) {
    if (totalAfterUpdate < 1) {
      return { error: "Keep at least one file, or upload replacements." };
    }
    if (totalAfterUpdate > MAX_RESOURCE_FILES) {
      return { error: `You can have up to ${MAX_RESOURCE_FILES} files per resource.` };
    }
  }

  let uploaded: { storageKey: string; fileName: string; mimeType: string; caption?: string }[] = [];

  if (resource.type === ResourceType.PDF) {
    for (const file of newFiles) {
      if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
        return { error: "All files must be PDFs." };
      }
    }

    try {
      uploaded = await uploadResourceFiles(newFiles, MAX_RESOURCE_PDF_BYTES, MAX_RESOURCE_PDF_ERROR);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to upload PDF. Try again.";
      return { error: message };
    }
  } else if (resource.type === ResourceType.IMAGE) {
    for (const file of newFiles) {
      if (!RESOURCE_IMAGE_MIME_TYPES.has(file.type)) {
        return { error: "Images must be JPEG, PNG, WebP, or GIF." };
      }
    }

    const newCaptions = parseFileCaptions(formData, "newFileCaptions");

    try {
      const blobs = await uploadResourceFiles(newFiles, MAX_RESOURCE_IMAGE_BYTES, MAX_RESOURCE_IMAGE_ERROR);
      uploaded = blobs.map((file, index) => ({
        ...file,
        caption: newCaptions[index] ?? "",
      }));
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to upload images. Try again.";
      return { error: message };
    }
  }

  let typeUpdate: {
    youtubeUrl?: string | null;
    youtubeVideoId?: string | null;
    linkUrl?: string | null;
  } = {};

  if (resource.type === ResourceType.YOUTUBE) {
    const youtubeUrl = String(formData.get("youtubeUrl") ?? "").trim();
    const youtubeVideoId = parseYoutubeVideoId(youtubeUrl);
    if (!youtubeVideoId) return { error: "Enter a valid YouTube link." };
    typeUpdate = { youtubeUrl, youtubeVideoId };
  } else if (resource.type === ResourceType.LINK) {
    const linkUrl = parseHttpUrl(String(formData.get("linkUrl") ?? ""));
    if (!linkUrl) return { error: "Enter a valid http or https link." };
    typeUpdate = { linkUrl };
  }

  const remainingFileIds = resource.files
    .filter((file) => !removeFileIds.includes(file.id))
    .map((file) => file.id);
  const existingCaptions = parseExistingCaptions(formData, remainingFileIds);

  await prisma.$transaction(async (tx) => {
    await tx.resource.update({
      where: { id },
      data: {
        title,
        description,
        ...typeUpdate,
      },
    });

    await tx.resourceBoothModel.deleteMany({ where: { resourceId: id } });
    await tx.resourceBoothModel.createMany({
      data: models.map((boothModel) => ({ resourceId: id, boothModel })),
    });

    await tx.resourceCategory.deleteMany({ where: { resourceId: id } });
    await tx.resourceCategory.createMany({
      data: categories.map((category) => ({ resourceId: id, category })),
    });

    if (removeFileIds.length > 0) {
      await tx.resourceFile.deleteMany({
        where: { id: { in: removeFileIds }, resourceId: id },
      });
    }

    for (const fileId of remainingFileIds) {
      await tx.resourceFile.update({
        where: { id: fileId },
        data: { caption: existingCaptions.get(fileId) ?? "" },
      });
    }

    if (uploaded.length > 0) {
      await tx.resourceFile.createMany({
        data: uploaded.map((file) => ({
          resourceId: id,
          storageKey: file.storageKey,
          fileName: file.fileName,
          mimeType:
            resource.type === ResourceType.PDF
              ? file.mimeType || "application/pdf"
              : file.mimeType,
          caption: file.caption ?? "",
        })),
      });
    }
  });

  for (const file of removableFiles) {
    try {
      await del(file.storageKey);
    } catch {
      // Blob may already be gone.
    }
  }

  revalidatePath("/resources");
  revalidatePath("/resources/preview");
  return {};
}

export async function createResource(formData: FormData): Promise<{ error?: string }> {
  await requireMeavoAccess();

  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const type = String(formData.get("type") ?? "");
  const models = parseBoothModels(formData);
  const categories = parseResourceCategories(formData);

  if (!title) return { error: "Title is required." };
  if (models.length === 0) return { error: "Select at least one booth model." };
  if (categories.length === 0) return { error: "Select at least one category." };

  const maxOrder = await prisma.resource.aggregate({ _max: { sortOrder: true } });
  const sortOrder = (maxOrder._max.sortOrder ?? -1) + 1;

  const categoryCreate = categories.map((category) => ({ category }));

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
          categories: { create: categoryCreate },
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

    const captions = parseFileCaptions(formData, "fileCaptions");

    try {
      const uploaded = await uploadResourceFiles(files, MAX_RESOURCE_IMAGE_BYTES, MAX_RESOURCE_IMAGE_ERROR);

      await prisma.resource.create({
        data: {
          title,
          description,
          type: ResourceType.IMAGE,
          sortOrder,
          models: { create: models.map((boothModel) => ({ boothModel })) },
          categories: { create: categoryCreate },
          files: {
            create: uploaded.map((file, index) => ({
              storageKey: file.storageKey,
              fileName: file.fileName,
              mimeType: file.mimeType,
              caption: captions[index] ?? "",
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
        categories: { create: categoryCreate },
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
        categories: { create: categoryCreate },
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
