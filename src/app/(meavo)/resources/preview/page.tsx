import Link from "next/link";
import { requireMeavoAccess } from "@/lib/meavo-auth";
import { parseBoothModelFilter } from "@/lib/booth-models";
import { prisma } from "@/lib/prisma";
import { ResourceLibraryList } from "@/components/resource-library-list";
import { PageHeader } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function ResourcesPreviewPage({
  searchParams,
}: {
  searchParams: Promise<{ model?: string }>;
}) {
  await requireMeavoAccess();

  const { model: modelParam } = await searchParams;
  const modelFilter = parseBoothModelFilter(modelParam);

  const resources = await prisma.resource.findMany({
    orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
    include: { models: true },
    ...(modelFilter ? { where: { models: { some: { boothModel: modelFilter } } } } : {}),
  });

  return (
    <div className="mx-auto max-w-lg">
      <PageHeader
        title="Partner resources preview"
        description="Browse resources as a partner would see them in their portal."
      />

      <p className="mb-4">
        <Link href="/resources" className="text-sm text-brand-700 underline">
          ← Back to builder
        </Link>
      </p>

      <ResourceLibraryList
        resources={resources}
        basePath="/resources/preview"
        modelFilter={modelFilter}
        preview
      />
    </div>
  );
}
