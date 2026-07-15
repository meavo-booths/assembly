import Link from "next/link";
import { notFound } from "next/navigation";
import { requireMeavoAccess } from "@/lib/meavo-auth";
import { prisma } from "@/lib/prisma";
import { ResourceLibraryDetail } from "@/components/resource-library-detail";
import { PageHeader } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function ResourcePreviewDetailPage({
  params,
}: {
  params: Promise<{ resourceId: string }>;
}) {
  await requireMeavoAccess();

  const { resourceId } = await params;

  const resource = await prisma.resource.findUnique({
    where: { id: resourceId },
    include: {
      models: true,
      categories: true,
      files: { orderBy: { fileName: "asc" } },
    },
  });
  if (!resource) notFound();

  return (
    <div className="mx-auto max-w-lg">
      <PageHeader title="Resource preview" description="Partner view of a single resource." />

      <p className="mb-4">
        <Link href="/resources" className="text-sm text-brand-700 underline">
          ← Back to builder
        </Link>
      </p>

      <ResourceLibraryDetail
        resource={resource}
        backHref="/resources/preview"
        preview
      />
    </div>
  );
}
