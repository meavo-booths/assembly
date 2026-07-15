"use client";

import { useState } from "react";

type ExistingImage = {
  id: string;
  fileName: string;
  caption: string;
};

type NewImage = {
  file: File;
  caption: string;
};

export function ResourceImageEditFields({
  existingFiles,
}: {
  existingFiles: ExistingImage[];
}) {
  const [existing, setExisting] = useState(existingFiles);
  const [newImages, setNewImages] = useState<NewImage[]>([]);

  return (
    <>
      {existing.length > 0 && (
        <fieldset className="space-y-3">
          <legend className="text-sm font-medium text-slate-700">Existing images</legend>
          <ul className="space-y-3">
            {existing.map((file) => (
              <li key={file.id} className="rounded-lg border border-slate-200 p-3">
                <div className="flex items-start gap-3">
                  <label className="flex shrink-0 items-center gap-2 text-sm text-slate-700">
                    <input
                      type="checkbox"
                      name="removeFileIds"
                      value={file.id}
                      className="rounded border-slate-300"
                    />
                    <span className="sr-only">Remove {file.fileName}</span>
                  </label>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`/api/resource-files/${file.id}`}
                    alt={file.fileName}
                    className="h-16 w-16 rounded object-cover"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-slate-800">{file.fileName}</p>
                    <label className="mt-2 block space-y-1 text-sm">
                      <span className="font-medium text-slate-700">Caption (optional)</span>
                      <input
                        name={`caption_${file.id}`}
                        type="text"
                        value={file.caption}
                        onChange={(event) => {
                          setExisting((current) =>
                            current.map((entry) =>
                              entry.id === file.id
                                ? { ...entry, caption: event.target.value }
                                : entry,
                            ),
                          );
                        }}
                        placeholder="Describe this image"
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
                      />
                    </label>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </fieldset>
      )}

      <label className="block space-y-1 text-sm">
        <span className="font-medium text-slate-700">Add more images</span>
        <input
          name="files"
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          multiple
          className="block w-full text-sm text-slate-600"
          onChange={(event) => {
            const files = [...(event.target.files ?? [])];
            setNewImages(files.map((file) => ({ file, caption: "" })));
          }}
        />
        <p className="text-xs text-slate-500">
          Optional. JPEG, PNG, WebP, or GIF — max 10 MB each.
        </p>
      </label>

      {newImages.length > 0 && (
        <ul className="space-y-3">
          {newImages.map((entry, index) => (
            <li key={`${entry.file.name}-${index}`} className="rounded-lg border border-slate-200 p-3">
              <p className="truncate text-sm font-medium text-slate-800">{entry.file.name}</p>
              <label className="mt-2 block space-y-1 text-sm">
                <span className="font-medium text-slate-700">Caption (optional)</span>
                <input
                  name="newFileCaptions"
                  type="text"
                  value={entry.caption}
                  onChange={(event) => {
                    const next = [...newImages];
                    next[index] = { ...entry, caption: event.target.value };
                    setNewImages(next);
                  }}
                  placeholder="Describe this image"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
                />
              </label>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
