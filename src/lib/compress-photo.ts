"use client";

import imageCompression from "browser-image-compression";

export const COMPRESS_PHOTO_ERROR = "Could not process photo. Try a different image.";

function toJpegName(name: string): string {
  const base = name.replace(/\.[^.]+$/, "") || "photo";
  return `${base}.jpg`;
}

export async function compressPhotoForUpload(file: File): Promise<File> {
  const compressed = await imageCompression(file, {
    maxSizeMB: 2,
    maxWidthOrHeight: 2048,
    useWebWorker: true,
    fileType: "image/jpeg",
  });
  return new File([compressed], toJpegName(file.name), { type: "image/jpeg" });
}
