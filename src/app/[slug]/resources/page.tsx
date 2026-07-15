import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePartnerSession } from "@/lib/partner-session";
import { parseBoothModelFilter } from "@/lib/booth-models";
import { parseResourceCategoryFilter } from "@/lib/resource-categories";
import { prisma } from "@/lib/prisma";
import { MEVAO_RESERVED_SEGMENTS } from "@/lib/constants";
import { ResourceLibraryList } from "@/components/resource-library-list";
import { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

export default async function PartnerResourcesPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ model?: string; category?: string }>;
}) {
  const { slug } = await params;
  if (MEVAO_RESERVED_SEGMENTS.has(slug)) notFound();

  const partner = await requirePartnerSession(slug);
  if (!partner) notFound();

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
    <div className="mx-auto min-h-screen max-w-lg px-4 py-6">
      <div className="mb-6">
        <Link href={`/${slug}`} className="text-sm text-brand-700 underline">
          ← Back to assemblies
        </Link>
        <h1 className="mt-2 text-xl font-semibold text-slate-900">Resource library</h1>
        <p className="text-sm text-slate-600">Assembly guides and troubleshooting</p>
      </div>

      <ResourceLibraryList
        resources={resources}
        basePath={`/${slug}/resources`}
        modelFilter={modelFilter}
        categoryFilter={categoryFilter}
      />
    </div>
  );
}
