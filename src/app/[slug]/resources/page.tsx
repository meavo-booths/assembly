import Link from "next/link";
import { notFound } from "next/navigation";
import { BoothModel } from "@prisma/client";
import { requirePartnerSession } from "@/lib/partner-session";
import { prisma } from "@/lib/prisma";
import { MEVAO_RESERVED_SEGMENTS } from "@/lib/constants";
import {
  ALL_BOOTH_MODELS,
  BOOTH_MODEL_GROUPS,
  boothModelLabel,
} from "@/lib/booth-models";
import { resourceTypeLabel } from "@/lib/resources";
import { Card } from "@/components/ui";

export const dynamic = "force-dynamic";

function parseModelFilter(value: string | undefined): BoothModel | null {
  if (!value) return null;
  return ALL_BOOTH_MODELS.some((entry) => entry.value === value) ? (value as BoothModel) : null;
}

export default async function PartnerResourcesPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ model?: string }>;
}) {
  const { slug } = await params;
  if (MEVAO_RESERVED_SEGMENTS.has(slug)) notFound();

  const partner = await requirePartnerSession(slug);
  if (!partner) notFound();

  const { model: modelParam } = await searchParams;
  const modelFilter = parseModelFilter(modelParam);

  const resources = await prisma.resource.findMany({
    orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
    include: { models: true },
    ...(modelFilter
      ? { where: { models: { some: { boothModel: modelFilter } } } }
      : {}),
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

      <div className="mb-4 flex flex-wrap gap-2">
        <Link
          href={`/${slug}/resources`}
          className={`rounded-full px-3 py-1 text-xs font-medium ${
            !modelFilter ? "bg-brand-600 text-white" : "bg-slate-100 text-slate-700"
          }`}
        >
          All models
        </Link>
        {BOOTH_MODEL_GROUPS.map((group) => (
          <div key={group.line} className="flex flex-wrap gap-2">
            {group.models.map((model) => (
              <Link
                key={model.value}
                href={`/${slug}/resources?model=${model.value}`}
                className={`rounded-full px-3 py-1 text-xs font-medium ${
                  modelFilter === model.value
                    ? "bg-brand-600 text-white"
                    : "bg-slate-100 text-slate-700"
                }`}
              >
                {model.label}
              </Link>
            ))}
          </div>
        ))}
      </div>

      <div className="grid gap-3">
        {resources.map((resource) => (
          <Link key={resource.id} href={`/${slug}/resources/${resource.id}`}>
            <Card className="transition hover:border-brand-500">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-medium text-slate-900">{resource.title}</p>
                  {resource.description && (
                    <p className="mt-1 line-clamp-2 text-sm text-slate-600">{resource.description}</p>
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
                </div>
                <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                  {resourceTypeLabel(resource.type)}
                </span>
              </div>
            </Card>
          </Link>
        ))}
        {resources.length === 0 && (
          <Card>
            <p className="text-sm text-slate-600">
              {modelFilter
                ? `No resources for ${boothModelLabel(modelFilter)} yet.`
                : "No resources available yet."}
            </p>
            {modelFilter && (
              <Link href={`/${slug}/resources`} className="mt-2 inline-block text-sm text-brand-700 underline">
                Show all resources
              </Link>
            )}
          </Card>
        )}
      </div>
    </div>
  );
}
