import Link from "next/link";
import { notFound } from "next/navigation";
import { ResourceType } from "@prisma/client";
import { requirePartnerSession } from "@/lib/partner-session";
import { prisma } from "@/lib/prisma";
import { MEVAO_RESERVED_SEGMENTS } from "@/lib/constants";
import { boothModelLabel } from "@/lib/booth-models";
import { Card } from "@/components/ui";

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
    include: { models: true },
  });
  if (!resource) notFound();

  return (
    <div className="mx-auto min-h-screen max-w-lg px-4 py-6">
      <div className="mb-6">
        <Link href={`/${slug}/resources`} className="text-sm text-brand-700 underline">
          ← Back to resources
        </Link>
        <h1 className="mt-2 text-xl font-semibold text-slate-900">{resource.title}</h1>
        {resource.description && <p className="mt-1 text-sm text-slate-600">{resource.description}</p>}
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
      </div>

      {resource.type === ResourceType.YOUTUBE && resource.youtubeVideoId ? (
        <Card className="overflow-hidden p-0">
          <div className="relative aspect-video w-full bg-black">
            <iframe
              src={`https://www.youtube.com/embed/${resource.youtubeVideoId}`}
              title={resource.title}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
              className="absolute inset-0 h-full w-full border-0"
            />
          </div>
        </Card>
      ) : resource.type === ResourceType.LINK && resource.linkUrl ? (
        <Card className="text-center">
          <p className="text-sm text-slate-600">Open this resource in your browser.</p>
          <a
            href={resource.linkUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 inline-flex items-center justify-center rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
          >
            Open link
          </a>
          <p className="mt-2 truncate text-xs text-slate-500">{resource.linkUrl}</p>
        </Card>
      ) : (
        <Card className="text-center">
          <p className="text-sm text-slate-600">Open the PDF guide in your browser.</p>
          <a
            href={`/api/resources/${resource.id}`}
            className="mt-4 inline-flex items-center justify-center rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
          >
            View PDF guide
          </a>
          {resource.fileName && (
            <p className="mt-2 text-xs text-slate-500">{resource.fileName}</p>
          )}
        </Card>
      )}
    </div>
  );
}
