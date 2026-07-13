import Link from "next/link";
import { notFound } from "next/navigation";
import { QuestionType } from "@prisma/client";
import { requireMeavoAccess, hasTasksAccess } from "@/lib/meavo-auth";
import { AddTaskLink } from "@/components/add-task-link";
import { AssemblyDetailCard } from "@/components/assembly-detail-card";
import { DeleteAssemblyButton } from "@/components/delete-assembly-button";
import { buildLinkedDealSummary } from "@/lib/deal-summary";
import { toAssemblyFormValues } from "@/lib/assembly-form-values";
import { loadScheduleFormContext } from "@/lib/schedule-form-context";
import { dealSummaryInclude } from "@/lib/deal-queries";
import { prisma } from "@/lib/prisma";
import { Card, PageHeader, VipBadge } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function AssemblyDetailPage({
  params,
}: {
  params: Promise<{ dealId: string }>;
}) {
  const session = await requireMeavoAccess();
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

  const [formContext, linkedDealForForm] = await Promise.all([
    loadScheduleFormContext(),
    assembly.linkedDealId
      ? prisma.deal.findUnique({
          where: { dealId: assembly.linkedDealId },
          include: dealSummaryInclude,
        })
      : null,
  ]);
  const formValues = toAssemblyFormValues(assembly);
  const dealSummary = linkedDealForForm ? buildLinkedDealSummary(linkedDealForForm) : undefined;

  // The VIP label follows the client from the sales app onto every linked assembly.
  const isVip = linkedDealForForm?.client?.isVip ?? false;
  const showAddTask = await hasTasksAccess(session.user!.id);

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
          {showAddTask && (
            <AddTaskLink
              entityId={assembly.id}
              title={`Assembly: ${assembly.dealId}`}
            />
          )}
          <Link href="/" className="text-sm text-brand-700 underline">
            Back to list
          </Link>
        </div>
      </PageHeader>

      <AssemblyDetailCard
        values={formValues}
        options={formContext.options}
        deliveryCompanies={formContext.deliveryCompanies}
        installCompanies={formContext.installCompanies}
        deal={dealSummary}
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
                    loading="lazy"
                    width={300}
                    height={300}
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
