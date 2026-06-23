import Link from "next/link";
import { notFound } from "next/navigation";
import { requireMeavoAccess } from "@/lib/meavo-auth";
import { prisma } from "@/lib/prisma";
import { Card, PageHeader } from "@/components/ui";

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
            <dt className="text-slate-500">Date</dt>
            <dd>{assembly.assemblyDate?.toLocaleDateString("en-GB") ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-slate-500">Market</dt>
            <dd>{assembly.market || "—"}</dd>
          </div>
          <div>
            <dt className="text-slate-500">Type</dt>
            <dd>{assembly.channelType || "—"}</dd>
          </div>
          <div>
            <dt className="text-slate-500">Install partner</dt>
            <dd>{assembly.installPartnerName || "—"}</dd>
          </div>
          <div>
            <dt className="text-slate-500">Delivery partner</dt>
            <dd>{assembly.deliveryPartnerName || "—"}</dd>
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
          <ul className="mt-4 space-y-2">
            {submission.answers.map((answer) => (
              <li key={answer.id} className="flex gap-2 text-sm">
                <span>{answer.checked ? "✓" : "○"}</span>
                <span>{answer.question.text}</span>
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
