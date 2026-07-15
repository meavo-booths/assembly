"use client";

import { useState } from "react";
import { ResourceType } from "@prisma/client";
import { boothModelLabel } from "@/lib/booth-models";
import { resourceCategoryLabel } from "@/lib/resource-categories";
import { resourceFileCountLabel, resourceTypeLabel } from "@/lib/resources";
import { templateMarkupToPlainText } from "@/lib/template-markup-plain";
import { deleteResource, moveResource } from "@/app/actions/resources";
import { ResourceEditForm, type ResourceEditItem } from "@/components/resource-edit-form";
import { Button, Card } from "@/components/ui";

export function ResourceListItem({
  resource,
  resourceIndex,
  resourceCount,
}: {
  resource: ResourceEditItem;
  resourceIndex: number;
  resourceCount: number;
}) {
  const [editing, setEditing] = useState(false);
  const plainDescription = resource.description
    ? templateMarkupToPlainText(resource.description)
    : "";

  if (editing) {
    return (
      <Card>
        <h3 className="mb-4 font-medium text-slate-900">Edit resource</h3>
        <ResourceEditForm resource={resource} onCancel={() => setEditing(false)} />
      </Card>
    );
  }

  return (
    <Card>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-medium text-slate-900">{resource.title}</p>
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
              {resourceTypeLabel(resource.type)}
            </span>
          </div>
          {plainDescription && (
            <p className="mt-1 line-clamp-2 text-sm text-slate-600">{plainDescription}</p>
          )}
          <div className="mt-2 flex flex-wrap gap-1.5">
            {resource.categories.map((category) => (
              <span
                key={category}
                className="rounded-full bg-violet-50 px-2 py-0.5 text-xs font-medium text-violet-800"
              >
                {resourceCategoryLabel(category)}
              </span>
            ))}
            {resource.models.map((boothModel) => (
              <span
                key={boothModel}
                className="rounded-full bg-brand-50 px-2 py-0.5 text-xs font-medium text-brand-800"
              >
                {boothModelLabel(boothModel)}
              </span>
            ))}
          </div>
          {(() => {
            const fileLabel = resourceFileCountLabel(resource.type, resource.files.length);
            return fileLabel ? <p className="mt-2 text-xs text-slate-500">{fileLabel}</p> : null;
          })()}
          {resource.type === ResourceType.YOUTUBE && resource.youtubeUrl && (
            <p className="mt-2 truncate text-xs text-slate-500">{resource.youtubeUrl}</p>
          )}
          {resource.type === ResourceType.LINK && resource.linkUrl && (
            <p className="mt-2 truncate text-xs text-slate-500">{resource.linkUrl}</p>
          )}
        </div>
        <div className="flex flex-wrap gap-1">
          <Button type="button" variant="secondary" onClick={() => setEditing(true)}>
            Edit
          </Button>
          <form action={moveResource}>
            <input type="hidden" name="id" value={resource.id} />
            <input type="hidden" name="direction" value="up" />
            <Button
              type="submit"
              variant="secondary"
              className="px-2 py-1.5"
              disabled={resourceIndex === 0}
            >
              ↑
            </Button>
          </form>
          <form action={moveResource}>
            <input type="hidden" name="id" value={resource.id} />
            <input type="hidden" name="direction" value="down" />
            <Button
              type="submit"
              variant="secondary"
              className="px-2 py-1.5"
              disabled={resourceIndex === resourceCount - 1}
            >
              ↓
            </Button>
          </form>
          <form action={deleteResource}>
            <input type="hidden" name="id" value={resource.id} />
            <Button type="submit" variant="danger">
              Delete
            </Button>
          </form>
        </div>
      </div>
    </Card>
  );
}
