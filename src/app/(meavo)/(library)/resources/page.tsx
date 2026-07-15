import Link from "next/link";
import { requireMeavoAccess } from "@/lib/meavo-auth";
import { prisma } from "@/lib/prisma";
import { ResourceAddForm } from "@/components/resource-add-form";
import { ResourceListItem } from "@/components/resource-list-item";
import { Card, PageHeader } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function ResourcesPage() {
  await requireMeavoAccess();

  const resources = await prisma.resource.findMany({
    orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
    include: {
      models: true,
      categories: true,
      files: { orderBy: { fileName: "asc" } },
    },
  });

  return (
    <>
      <PageHeader
        title="Partner resources"
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
          <ResourceListItem
            key={resource.id}
            resource={{
              id: resource.id,
              title: resource.title,
              description: resource.description,
              type: resource.type,
              youtubeUrl: resource.youtubeUrl,
              linkUrl: resource.linkUrl,
              models: resource.models.map((entry) => entry.boothModel),
              categories: resource.categories.map((entry) => entry.category),
              files: resource.files.map((file) => ({
                id: file.id,
                fileName: file.fileName,
                caption: file.caption,
              })),
            }}
            resourceIndex={resourceIndex}
            resourceCount={resources.length}
          />
        ))}
        {resources.length === 0 && (
          <Card>
            <p className="text-sm text-slate-600">
              No resources yet. Add a PDF, image gallery, YouTube video, or link above.
            </p>
          </Card>
        )}
      </div>
    </>
  );
}
