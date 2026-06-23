"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { BOOTH_MODEL_GROUPS } from "@/lib/booth-models";
import { createResource } from "@/app/actions/resources";
import { Button, Input } from "@/components/ui";

type ResourceFormType = "PDF" | "YOUTUBE" | "LINK";

export function ResourceAddForm() {
  const router = useRouter();
  const [type, setType] = useState<ResourceFormType>("PDF");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  return (
    <form
      className="mt-4 space-y-4"
      action={async (formData) => {
        setError(null);
        setPending(true);
        const result = await createResource(formData);
        setPending(false);
        if (result.error) {
          setError(result.error);
          return;
        }
        (document.getElementById("resource-add-form") as HTMLFormElement | null)?.reset();
        setType("PDF");
        router.refresh();
      }}
      id="resource-add-form"
      encType="multipart/form-data"
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Input label="Title" name="title" required placeholder="Electrics troubleshooting" />
        <label className="block space-y-1 text-sm">
          <span className="font-medium text-slate-700">Type</span>
          <select
            name="type"
            value={type}
            onChange={(e) => setType(e.target.value as ResourceFormType)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
          >
            <option value="PDF">PDF guide</option>
            <option value="YOUTUBE">YouTube video</option>
            <option value="LINK">Link</option>
          </select>
        </label>
      </div>

      <label className="block space-y-1 text-sm">
        <span className="font-medium text-slate-700">Description (optional)</span>
        <textarea
          name="description"
          rows={2}
          placeholder="Short summary for partners"
          className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
        />
      </label>

      {type === "PDF" && (
        <label className="block space-y-1 text-sm">
          <span className="font-medium text-slate-700">PDF file</span>
          <input
            name="file"
            type="file"
            accept="application/pdf,.pdf"
            required
            className="block w-full text-sm text-slate-600"
          />
        </label>
      )}

      {type === "YOUTUBE" && (
        <Input label="YouTube link" name="youtubeUrl" required placeholder="https://www.youtube.com/watch?v=..." />
      )}

      {type === "LINK" && (
        <Input label="Link URL" name="linkUrl" required placeholder="https://..." />
      )}

      <fieldset className="space-y-3">
        <legend className="text-sm font-medium text-slate-700">Applicable booth models</legend>
        {BOOTH_MODEL_GROUPS.map((group) => (
          <div key={group.line}>
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{group.line}</p>
            <div className="mt-2 flex flex-wrap gap-3">
              {group.models.map((model) => (
                <label key={model.value} className="flex items-center gap-2 text-sm text-slate-700">
                  <input type="checkbox" name="models" value={model.value} className="rounded border-slate-300" />
                  {model.label}
                </label>
              ))}
            </div>
          </div>
        ))}
      </fieldset>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <Button type="submit" disabled={pending}>
        {pending ? "Publishing…" : "Publish resource"}
      </Button>
    </form>
  );
}
