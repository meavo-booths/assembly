import Link from "next/link";
import { ResourceType } from "@prisma/client";
import { requireMeavoAccess } from "@/lib/meavo-auth";
import { prisma } from "@/lib/prisma";
import { boothModelLabel } from "@/lib/booth-models";
import { resourceFileCountLabel, resourceTypeLabel } from "@/lib/resources";
import { deleteResource, moveResource } from "@/app/actions/resources";
import { ResourceAddForm } from "@/components/resource-add-form";
import { Button, Card, PageHeader } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function ResourcesPage() {
  await requireMeavoAccess();

  const resources = await prisma.resource.findMany({
    orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
    include: { models: true, files: true },
  });

  return (
    <>
      <PageHeader
        title="Resource library"
        description="Assembly guides and troubleshooting resources for partner portals. Resources are published immediately when added."
      >
        <Link
          href="/resources/preview"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          Preview
        </Link>
      </PageHeader>

      <Card className="mb-6">
        <h2 className="font-medium text-slate-900">Add resource</h2>
        <ResourceAddForm />
      </Card>

      <div className="grid gap-4">
        {resources.map((resource, resourceIndex) => (
          <Card key={resource.id}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-medium text-slate-900">{resource.title}</p>
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                    {resourceTypeLabel(resource.type)}
                  </span>
                </div>
                {resource.description && (
                  <p className="mt-1 text-sm text-slate-600">{resource.description}</p>
                )}
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {resource.models.map((entry) => (
                    <span
                      key={entry.boothModel}
                      className="rounded-full bg-brand-50 px-2 py-0.5 text-xs font-medium text-brand-800"
                    >
                      {boothModelLabel(entry.boothModel)}
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
              <div className="flex gap-1">
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
                    disabled={resourceIndex === resources.length - 1}
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
        ))}
        {resources.length === 0 && (
          <Card>
            <p className="text-sm text-slate-600">No resources yet. Add a PDF, image gallery, YouTube video, or link above.</p>
          </Card>
        )}
      </div>
    </>
  );
}
