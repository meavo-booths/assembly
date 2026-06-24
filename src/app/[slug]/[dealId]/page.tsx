import Link from "next/link";
import { notFound } from "next/navigation";
import { headers, cookies } from "next/headers";
import { SubmissionStatus, QuestionnaireLocale } from "@prisma/client";
import { requirePartnerSession } from "@/lib/partner-session";
import { prisma } from "@/lib/prisma";
import { MEVAO_RESERVED_SEGMENTS } from "@/lib/constants";
import { QUESTIONNAIRE_LOCALE_COOKIE } from "@/lib/questionnaire-locales";
import { loadLocalizedQuestionnaireSections } from "@/lib/questionnaire-i18n";
import { QuestionnaireWizard } from "@/components/questionnaire-wizard";

export const dynamic = "force-dynamic";

export default async function PartnerAssemblyPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string; dealId: string }>;
  searchParams: Promise<{ lang?: string }>;
}) {
  const { slug, dealId: rawDealId } = await params;
  const dealId = decodeURIComponent(rawDealId);
  const { lang } = await searchParams;

  if (MEVAO_RESERVED_SEGMENTS.has(slug)) notFound();

  const partner = await requirePartnerSession(slug);
  if (!partner) notFound();

  const assembly = await prisma.assembly.findFirst({
    where: { dealId, installPartnerId: partner.id },
  });
  if (!assembly) notFound();

  const questionnaire = await prisma.questionnaire.findFirst({
    where: { isPublished: true },
    include: {
      sections: {
        orderBy: { sortOrder: "asc" },
        include: { questions: { orderBy: { sortOrder: "asc" } } },
      },
    },
  });

  const cookieStore = await cookies();
  const headerStore = await headers();

  const localized = questionnaire
    ? await loadLocalizedQuestionnaireSections(questionnaire.sections, {
        langParam: lang,
        cookieLang: cookieStore.get(QUESTIONNAIRE_LOCALE_COOKIE)?.value,
        acceptLanguage: headerStore.get("accept-language"),
      })
    : {
        sections: [],
        locale: QuestionnaireLocale.EN,
        availableLocales: [QuestionnaireLocale.EN],
      };

  const submission = await prisma.questionnaireSubmission.findUnique({
    where: { assemblyId_partnerId: { assemblyId: assembly.id, partnerId: partner.id } },
    include: {
      answers: true,
      photos: true,
    },
  });

  const initialAnswers = Object.fromEntries(
    (submission?.answers ?? []).map((a) => [
      a.questionId,
      {
        checked: a.checked,
        text: a.textAnswer ?? "",
        yesNo: a.yesNoAnswer ?? null,
      },
    ]),
  );

  return (
    <div className="mx-auto min-h-screen max-w-lg px-4 py-6">
      <div className="mb-6">
        <Link href={`/${slug}`} className="text-sm text-brand-700 underline">
          ← Back
        </Link>
        <h1 className="mt-2 text-xl font-semibold text-slate-900">{assembly.dealId}</h1>
        <p className="text-sm text-slate-600">{assembly.clientName}</p>
      </div>

      <QuestionnaireWizard
        slug={slug}
        dealId={dealId}
        sections={localized.sections}
        locale={localized.locale}
        availableLocales={localized.availableLocales}
        initialAnswers={initialAnswers}
        hasPhotos={(submission?.photos.length ?? 0) > 0}
        isSubmitted={submission?.status === SubmissionStatus.SUBMITTED}
      />
    </div>
  );
}
