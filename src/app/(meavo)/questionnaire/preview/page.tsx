import { Suspense } from "react";
import { QuestionnaireLocale } from "@prisma/client";
import { migrateOrphanQuestions } from "@/lib/questionnaire-db";
import { loadLocalizedQuestionnaireSections } from "@/lib/questionnaire-i18n";
import { prisma } from "@/lib/prisma";
import { QuestionnairePreview } from "@/components/questionnaire-preview";

export const dynamic = "force-dynamic";

export default async function QuestionnairePreviewPage({
  searchParams,
}: {
  searchParams: Promise<{ lang?: string }>;
}) {
  const { lang } = await searchParams;

  const questionnaire = await prisma.questionnaire.findFirst({
    orderBy: { createdAt: "asc" },
    include: {
      sections: {
        orderBy: { sortOrder: "asc" },
        include: { questions: { orderBy: { sortOrder: "asc" } } },
      },
    },
  });

  if (questionnaire) {
    await migrateOrphanQuestions(questionnaire.id);
  }

  const refreshed = questionnaire
    ? await prisma.questionnaire.findFirst({
        where: { id: questionnaire.id },
        include: {
          sections: {
            orderBy: { sortOrder: "asc" },
            include: { questions: { orderBy: { sortOrder: "asc" } } },
          },
        },
      })
    : null;

  const localized = refreshed
    ? await loadLocalizedQuestionnaireSections(refreshed.sections, {
        langParam: lang,
        context: "preview",
        previewPartnerView: false,
      })
    : {
        sections: [],
        locale: QuestionnaireLocale.EN,
        availableLocales: [QuestionnaireLocale.EN],
        approvedLocales: [QuestionnaireLocale.EN],
      };

  return (
    <Suspense fallback={<p className="text-sm text-slate-500">Loading preview…</p>}>
      <QuestionnairePreview
        sections={localized.sections}
        locale={localized.locale}
        availableLocales={localized.availableLocales}
        approvedLocales={localized.approvedLocales}
        isPublished={refreshed?.isPublished ?? false}
      />
    </Suspense>
  );
}
