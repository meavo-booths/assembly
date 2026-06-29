import { notFound } from "next/navigation";
import { requirePartnerSession } from "@/lib/partner-session";
import { prisma } from "@/lib/prisma";
import { MEVAO_RESERVED_SEGMENTS } from "@/lib/constants";
import { ResourceLibraryDetail } from "@/components/resource-library-detail";

export const dynamic = "force-dynamic";

export default async function PartnerResourceDetailPage({
  params,
}: {
  params: Promise<{ slug: string; resourceId: string }>;
}) {
  const { slug, resourceId } = await params;
  if (MEVAO_RESERVED_SEGMENTS.has(slug)) notFound();

  const partner = await requirePartnerSession(slug);
  if (!partner) notFound();

  const resource = await prisma.resource.findUnique({
    where: { id: resourceId },
    include: { models: true, files: { orderBy: { fileName: "asc" } } },
  });
  if (!resource) notFound();

  return (
    <div className="mx-auto min-h-screen max-w-lg px-4 py-6">
      <ResourceLibraryDetail resource={resource} backHref={`/${slug}/resources`} />
    </div>
  );
}
