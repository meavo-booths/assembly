import Link from "next/link";
import { requireMeavoAccess } from "@/lib/meavo-auth";
import { parseBoothModelFilter } from "@/lib/booth-models";
import { parseResourceCategoryFilter } from "@/lib/resource-categories";
import { prisma } from "@/lib/prisma";
import { ResourceLibraryList } from "@/components/resource-library-list";
import { PageHeader } from "@/components/ui";
import { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

export default async function ResourcesPreviewPage({
  searchParams,
}: {
  searchParams: Promise<{ model?: string; category?: string }>;
}) {
  await requireMeavoAccess();

  const { model: modelParam, category: categoryParam } = await searchParams;
  const modelFilter = parseBoothModelFilter(modelParam);
  const categoryFilter = parseResourceCategoryFilter(categoryParam);

  const where: Prisma.ResourceWhereInput = {
    ...(modelFilter ? { models: { some: { boothModel: modelFilter } } } : {}),
    ...(categoryFilter ? { categories: { some: { category: categoryFilter } } } : {}),
  };

  const resources = await prisma.resource.findMany({
    orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
    include: { models: true, categories: true },
    ...(Object.keys(where).length > 0 ? { where } : {}),
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
        categoryFilter={categoryFilter}
        preview
      />
    </div>
  );
}
