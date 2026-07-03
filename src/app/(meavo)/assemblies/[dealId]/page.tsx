import Link from "next/link";
import { notFound } from "next/navigation";
import { QuestionType } from "@prisma/client";
import { requireMeavoAccess } from "@/lib/meavo-auth";
import { eventTypeLabel, internalTeamLabel, issueLabel } from "@/lib/assembly-schedule";
import { prisma } from "@/lib/prisma";
import { Card, PageHeader } from "@/components/ui";

function formatDate(date: Date | null): string {
  return date?.toLocaleDateString("en-GB", { timeZone: "UTC" }) ?? "—";
}

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

  return (
    <>
      <PageHeader title={assembly.dealId} description={assembly.clientName}>
        <Link href="/" className="text-sm text-brand-700 underline">
          Back to list
        </Link>
      </PageHeader>

      <Card className="mb-4">
        <dl className="grid gap-2 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-slate-500">Event type</dt>
            <dd>{eventTypeLabel(assembly.eventType)}</dd>
          </div>
          <div>
            <dt className="text-slate-500">Internal team</dt>
            <dd>{internalTeamLabel(assembly.internalTeam)}</dd>
          </div>
          <div>
            <dt className="text-slate-500">Date</dt>
            <dd>{formatDate(assembly.assemblyDate)}</dd>
          </div>
          <div>
            <dt className="text-slate-500">Market</dt>
            <dd>{assembly.market || "—"}</dd>
          </div>
          <div>
            <dt className="text-slate-500">Client type</dt>
            <dd>{assembly.channelType || "—"}</dd>
          </div>
          <div>
            <dt className="text-slate-500">Client email</dt>
            <dd>{assembly.clientEmail || "—"}</dd>
          </div>
          <div>
            <dt className="text-slate-500">Client phone</dt>
            <dd>{assembly.clientPhone || "—"}</dd>
          </div>
          <div>
            <dt className="text-slate-500">Assembly address</dt>
            <dd>{assembly.assemblyAddress || "—"}</dd>
          </div>
          <div>
            <dt className="text-slate-500">Install partner</dt>
            <dd>{assembly.installPartnerName || "—"}</dd>
          </div>
          <div>
            <dt className="text-slate-500">Delivery partner</dt>
            <dd>{assembly.deliveryPartnerName || "—"}</dd>
          </div>
          <div>
            <dt className="text-slate-500">Closure</dt>
            <dd>{assembly.closure ? "Yes" : "No"}</dd>
          </div>
          <div>
            <dt className="text-slate-500">Survey</dt>
            <dd>{assembly.survey ? "Yes" : "No"}</dd>
          </div>
          <div>
            <dt className="text-slate-500">Fulfilled</dt>
            <dd>{formatDate(assembly.fulfilledOn)}</dd>
          </div>
          <div>
            <dt className="text-slate-500">Issue</dt>
            <dd>{issueLabel(assembly.issue)}</dd>
          </div>
          <div>
            <dt className="text-slate-500">Status</dt>
            <dd>{assembly.status || "—"}</dd>
          </div>
          <div>
            <dt className="text-slate-500">Priority</dt>
            <dd>{assembly.priority || "—"}</dd>
          </div>
          <div>
            <dt className="text-slate-500">Issue category</dt>
            <dd>{assembly.issueCategory || "—"}</dd>
          </div>
        </dl>
      </Card>

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
    </>
  );
}
