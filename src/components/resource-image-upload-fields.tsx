"use client";

import { useState } from "react";

type SelectedImage = {
  file: File;
  caption: string;
};

export function ResourceImageUploadFields({
  name = "files",
  required = false,
  label = "Images",
  helpText = "You can select multiple files. JPEG, PNG, WebP, or GIF — max 10 MB each.",
}: {
  name?: string;
  required?: boolean;
  label?: string;
  helpText?: string;
}) {
  const [selected, setSelected] = useState<SelectedImage[]>([]);

  return (
    <div className="space-y-3">
      <label className="block space-y-1 text-sm">
        <span className="font-medium text-slate-700">{label}</span>
        <input
          name={name}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          multiple
          required={required && selected.length === 0}
          className="block w-full text-sm text-slate-600"
          onChange={(event) => {
            const files = [...(event.target.files ?? [])];
            setSelected(files.map((file) => ({ file, caption: "" })));
          }}
        />
        <p className="text-xs text-slate-500">{helpText}</p>
      </label>

      {selected.length > 0 && (
        <ul className="space-y-3">
          {selected.map((entry, index) => (
            <li key={`${entry.file.name}-${index}`} className="rounded-lg border border-slate-200 p-3">
              <p className="truncate text-sm font-medium text-slate-800">{entry.file.name}</p>
              <label className="mt-2 block space-y-1 text-sm">
                <span className="font-medium text-slate-700">Caption (optional)</span>
                <input
                  name="fileCaptions"
                  type="text"
                  value={entry.caption}
                  onChange={(event) => {
                    const next = [...selected];
                    next[index] = { ...entry, caption: event.target.value };
                    setSelected(next);
                  }}
                  placeholder="Describe this image"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
                />
              </label>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
