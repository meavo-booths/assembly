import Link from "next/link";
import { notFound } from "next/navigation";
import { Prisma, SubmissionStatus } from "@prisma/client";
import { partnerLogout } from "@/app/actions/partner";
import { requirePartnerSession } from "@/lib/partner-session";
import { londonAssemblyDate } from "@/lib/assembly-filters";
import { prisma } from "@/lib/prisma";
import { MEVAO_RESERVED_SEGMENTS } from "@/lib/constants";
import { PartnerLoginForm } from "@/components/partner-login-form";
import {
  PartnerAssemblyFilters,
  type PartnerAssemblyView,
} from "@/components/partner-assembly-filters";
import { Button, Card } from "@/components/ui";

export const dynamic = "force-dynamic";

function parsePartnerView(value: string | undefined): PartnerAssemblyView {
  if (value === "yesterday" || value === "all") return value;
  return "upcoming";
}

function emptyStateMessage(view: PartnerAssemblyView, search: string | null): string {
  if (search) return "No assemblies match your search.";
  if (view === "yesterday") return "No assemblies yesterday.";
  if (view === "all") return "No assemblies assigned to you yet.";
  return "No upcoming assemblies assigned to you.";
}

export default async function PartnerPortalPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ view?: string; q?: string }>;
}) {
  const { slug } = await params;
  if (MEVAO_RESERVED_SEGMENTS.has(slug)) notFound();

  const partnerRecord = await prisma.assemblyPartner.findFirst({
    where: { slug, isActive: true, isInternal: false },
  });
  if (!partnerRecord) notFound();

  const sessionPartner = await requirePartnerSession(slug);
  const { view: viewParam, q: qParam } = await searchParams;
  const search = qParam?.trim() || null;
  const view = parsePartnerView(viewParam);
  // Search spans all dates (ignore view filter while searching).
  const effectiveView: PartnerAssemblyView = search ? "all" : view;

  if (!sessionPartner) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <Card className="w-full max-w-md">
          <h1 className="text-xl font-semibold text-slate-900">{partnerRecord.name}</h1>
          <p className="mt-2 text-sm text-slate-600">Enter your access code to view assemblies.</p>
          <PartnerLoginForm slug={slug} />
        </Card>
      </div>
    );
  }

  const todayLondon = londonAssemblyDate(0);
  const yesterdayLondon = londonAssemblyDate(-1);

  const dateFilter: Prisma.AssemblyWhereInput =
    effectiveView === "all"
      ? {}
      : effectiveView === "yesterday"
        ? { assemblyDate: { gte: yesterdayLondon, lte: yesterdayLondon } }
        : { OR: [{ assemblyDate: null }, { assemblyDate: { gte: todayLondon } }] };

  const searchFilter: Prisma.AssemblyWhereInput = search
    ? {
        OR: [
          { dealId: { contains: search, mode: "insensitive" } },
          { linkedDealId: { contains: search, mode: "insensitive" } },
          { clientName: { contains: search, mode: "insensitive" } },
        ],
      }
    : {};

  const assemblies = await prisma.assembly.findMany({
    where: {
      installPartnerId: partnerRecord.id,
      ...dateFilter,
      ...searchFilter,
    },
    orderBy: [{ assemblyDate: "asc" }, { dealId: "asc" }],
    include: {
      submissions: {
        where: { partnerId: partnerRecord.id },
        select: { status: true },
      },
    },
  });

  return (
    <div className="mx-auto min-h-screen max-w-lg px-4 py-6">
      <div className="mb-6 flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">{partnerRecord.name}</h1>
          <p className="text-sm text-slate-600">Your assemblies</p>
        </div>
        <form
          action={async () => {
            "use server";
            await partnerLogout(slug);
          }}
        >
          <Button type="submit" variant="ghost">
            Sign out
          </Button>
        </form>
      </div>

      <Link
        href={`/${slug}/resources`}
        className="mb-4 flex w-full items-center justify-center rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
      >
        Resources
      </Link>

      <PartnerAssemblyFilters slug={slug} view={effectiveView} search={search} />

      <div className="grid gap-3">
        {assemblies.map((assembly) => {
          const submitted = assembly.submissions.some((s) => s.status === SubmissionStatus.SUBMITTED);
          return (
            <Link key={assembly.id} href={`/${slug}/${encodeURIComponent(assembly.dealId)}`}>
              <Card className="transition hover:border-brand-500">
                <p className="font-medium text-slate-900">{assembly.dealId}</p>
                <p className="text-sm text-slate-600">{assembly.clientName || "Unknown client"}</p>
                {assembly.channelType ? (
                  <p className="text-xs text-slate-500">Client type: {assembly.channelType}</p>
                ) : null}
                <div className="mt-2 space-y-1 text-xs text-slate-500">
                  <p>Install: {assembly.installPartnerName || "—"}</p>
                  <p>Delivery: {assembly.deliveryPartnerName || "—"}</p>
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                  <span className="text-slate-500">
                    {assembly.assemblyDate?.toLocaleDateString("en-GB") ?? "Date TBC"}
                  </span>
                  <span
                    className={
                      submitted
                        ? "rounded-full bg-green-100 px-2 py-0.5 font-medium text-green-800"
                        : "rounded-full bg-slate-100 px-2 py-0.5 font-medium text-slate-600"
                    }
                  >
                    {submitted ? "Questionnaire completed" : "Not completed"}
                  </span>
                </div>
              </Card>
            </Link>
          );
        })}
        {assemblies.length === 0 && (
          <Card>
            <p className="text-sm text-slate-600">{emptyStateMessage(effectiveView, search)}</p>
          </Card>
        )}
      </div>
    </div>
  );
}
