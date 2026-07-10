import { Suspense } from "react";
import { QuestionnaireLocale } from "@prisma/client";
import { requireMeavoAccess } from "@/lib/meavo-auth";
import { loadLocalizedQuestionnaireSections } from "@/lib/questionnaire-i18n";
import { prisma } from "@/lib/prisma";
import { QuestionnairePreview } from "@/components/questionnaire-preview";

export const dynamic = "force-dynamic";

export default async function QuestionnairePreviewPage({
  searchParams,
}: {
  searchParams: Promise<{ lang?: string; mode?: string }>;
}) {
  await requireMeavoAccess();
  const { lang, mode } = await searchParams;
  const partnerView = mode === "partner";

  const questionnaire = await prisma.questionnaire.findFirst({
    orderBy: { createdAt: "asc" },
    include: {
      sections: {
        orderBy: { sortOrder: "asc" },
        include: { questions: { orderBy: { sortOrder: "asc" } } },
      },
    },
  });

  const localized = questionnaire
    ? await loadLocalizedQuestionnaireSections(questionnaire.sections, {
        langParam: lang,
        context: "preview",
        previewPartnerView: partnerView,
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
        partnerView={partnerView}
        isPublished={questionnaire?.isPublished ?? false}
      />
    </Suspense>
  );
}
