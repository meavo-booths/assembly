import Link from "next/link";
import { notFound } from "next/navigation";
import { SubmissionStatus } from "@prisma/client";
import { partnerLogin, partnerLogout } from "@/app/actions/partner";
import { requirePartnerSession } from "@/lib/partner-session";
import { prisma } from "@/lib/prisma";
import { MEVAO_RESERVED_SEGMENTS } from "@/lib/constants";
import { Button, Card, Input } from "@/components/ui";

export const dynamic = "force-dynamic";

function startOfTodayUtc(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

export default async function PartnerPortalPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ showPast?: string }>;
}) {
  const { slug } = await params;
  if (MEVAO_RESERVED_SEGMENTS.has(slug)) notFound();

  const partnerRecord = await prisma.assemblyPartner.findFirst({
    where: { slug, isActive: true, isInternal: false },
  });
  if (!partnerRecord) notFound();

  const sessionPartner = await requirePartnerSession(slug);
  const { showPast } = await searchParams;
  const showPastDates = showPast === "1";

  if (!sessionPartner) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <Card className="w-full max-w-md">
          <h1 className="text-xl font-semibold text-slate-900">{partnerRecord.name}</h1>
          <p className="mt-2 text-sm text-slate-600">Enter your access code to view assemblies.</p>
          <form
            action={async (formData) => {
              "use server";
              await partnerLogin(slug, formData);
            }}
            className="mt-6 space-y-4"
          >
            <Input label="Access code" name="code" type="password" required autoComplete="off" />
            <Button type="submit" className="w-full">
              Continue
            </Button>
          </form>
        </Card>
      </div>
    );
  }

  const today = startOfTodayUtc();
  const assemblies = await prisma.assembly.findMany({
    where: {
      installPartnerId: partnerRecord.id,
      ...(showPastDates ? {} : { OR: [{ assemblyDate: null }, { assemblyDate: { gte: today } }] }),
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

      <div className="mb-4">
        <Link
          href={showPastDates ? `/${slug}` : `/${slug}?showPast=1`}
          className="text-sm text-brand-700 underline"
        >
          {showPastDates ? "Hide past assemblies" : "Show past assemblies"}
        </Link>
      </div>

      <div className="grid gap-3">
        {assemblies.map((assembly) => {
          const submitted = assembly.submissions.some((s) => s.status === SubmissionStatus.SUBMITTED);
          return (
            <Link key={assembly.id} href={`/${slug}/${encodeURIComponent(assembly.dealId)}`}>
              <Card className="transition hover:border-brand-500">
                <p className="font-medium text-slate-900">{assembly.dealId}</p>
                <p className="text-sm text-slate-600">{assembly.clientName || "Unknown client"}</p>
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
            <p className="text-sm text-slate-600">No upcoming assemblies assigned to you.</p>
          </Card>
        )}
      </div>
    </div>
  );
}
