import Link from "next/link";
import { notFound } from "next/navigation";
import { QuestionType } from "@prisma/client";
import { requireMeavoAccess } from "@/lib/meavo-auth";
import { AssemblyDetailCard } from "@/components/assembly-detail-card";
import { DeleteAssemblyButton } from "@/components/delete-assembly-button";
import { toAssemblyFormValues } from "@/lib/assembly-form-values";
import { getAssemblyDropdownOptions } from "@/lib/sheets-export";
import { getPartnerNameSuggestions } from "@/lib/assembly-form-suggestions";
import { prisma } from "@/lib/prisma";
import { Card, PageHeader, VipBadge } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function AssemblyDetailPage({
  params,
}: {
  params: Promise<{ dealId: string }>;
}) {
  await requireMeavoAccess();
  const { dealId } = await params;

  const assembly = await prisma.assembly.findUnique({
    where: { dealId: decodeURIComponent(dealId) },
    include: {
      installPartner: true,
      submissions: {
        include: {
          partner: true,
          answers: { include: { question: true } },
          photos: { orderBy: { sortOrder: "asc" } },
        },
      },
    },
  });

  if (!assembly) notFound();

  const submission = assembly.submissions[0];

  const [options, marketRows, partnerSuggestions] = await Promise.all([
    getAssemblyDropdownOptions(),
    prisma.assembly.findMany({
      where: { market: { not: "" } },
      distinct: ["market"],
      select: { market: true },
      orderBy: { market: "asc" },
    }),
    getPartnerNameSuggestions(),
  ]);
  const markets = marketRows.map((row) => row.market);
  const formValues = toAssemblyFormValues(assembly);

  // The VIP label follows the client from the sales app onto every linked assembly.
  const linkedDeal = assembly.linkedDealId
    ? await prisma.deal.findUnique({
        where: { dealId: assembly.linkedDealId },
        select: { client: { select: { isVip: true } } },
      })
    : null;
  const isVip = linkedDeal?.client?.isVip ?? false;

  return (
    <>
      <PageHeader title={assembly.dealId} description={assembly.clientName}>
        <div className="flex flex-wrap items-center gap-3">
          {isVip && <VipBadge />}
          {assembly.linkedDealId && (
            <Link
              href={`/deals/${encodeURIComponent(assembly.linkedDealId)}`}
              className="text-sm text-brand-700 underline"
            >
              Deal {assembly.linkedDealId}
            </Link>
          )}
          <Link href="/" className="text-sm text-brand-700 underline">
            Back to list
          </Link>
        </div>
      </PageHeader>

      <AssemblyDetailCard
        values={formValues}
        options={options}
        markets={markets}
        deliveryCompanies={partnerSuggestions.deliveryCompanies}
        installCompanies={partnerSuggestions.installCompanies}
      />

      {submission ? (
        <Card>
          <h2 className="font-medium text-slate-900">Submission</h2>
          <p className="mt-1 text-sm text-slate-600">
            Status: {submission.status}
            {submission.submittedAt &&
              ` · Submitted ${submission.submittedAt.toLocaleString("en-GB")}`}
          </p>
          <ul className="mt-4 space-y-3">
            {submission.answers.map((answer) => (
              <li key={answer.id} className="text-sm">
                <p className="font-medium text-slate-900">{answer.question.text}</p>
                {answer.question.type === QuestionType.TEXT ? (
                  <p className="mt-1 whitespace-pre-wrap text-slate-600">
                    {answer.textAnswer.trim() || "—"}
                  </p>
                ) : answer.question.type === QuestionType.YES_NO ? (
                  <p className="mt-1 text-slate-600">
                    {answer.yesNoAnswer === true
                      ? "Yes"
                      : answer.yesNoAnswer === false
                        ? "No"
                        : "—"}
                  </p>
                ) : (
                  <p className="mt-1 text-slate-600">{answer.checked ? "Confirmed" : "Not confirmed"}</p>
                )}
              </li>
            ))}
          </ul>
          {submission.photos.length > 0 && (
            <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
              {submission.photos.map((photo) => (
                <a key={photo.id} href={`/api/photos/${photo.id}`} target="_blank" rel="noreferrer">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`/api/photos/${photo.id}`}
                    alt={photo.fileName}
                    className="aspect-square rounded-lg object-cover"
                  />
                </a>
              ))}
            </div>
          )}
        </Card>
      ) : (
        <Card>
          <p className="text-sm text-slate-600">No questionnaire submitted yet.</p>
        </Card>
      )}

      <div className="mt-6">
        <DeleteAssemblyButton assemblyId={assembly.id} assemblyName={assembly.dealId} />
      </div>
    </>
  );
}
