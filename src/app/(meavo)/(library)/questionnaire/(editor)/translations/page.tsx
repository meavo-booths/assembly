import { prisma } from "@/lib/prisma";
import { buildLocaleTranslationBundles } from "@/lib/questionnaire-translation-status";
import { QuestionnaireTranslationsPanel } from "@/components/questionnaire-translations-panel";

export const dynamic = "force-dynamic";

export default async function QuestionnaireTranslationsPage() {
  const questionnaire = await prisma.questionnaire.findFirst({
    orderBy: { createdAt: "asc" },
    include: {
      sections: {
        orderBy: { sortOrder: "asc" },
        include: {
          questions: {
            orderBy: { sortOrder: "asc" },
            include: { translations: true },
          },
          translations: true,
        },
      },
    },
  });

  const sections = questionnaire?.sections ?? [];

  const sectionTranslations = sections.flatMap((section) => section.translations);
  const questionTranslations = sections.flatMap((section) =>
    section.questions.flatMap((question) => question.translations),
  );

  const translationBundles = buildLocaleTranslationBundles(
    sections.map((section) => ({
      id: section.id,
      title: section.title,
      questions: section.questions.map((question) => ({
        id: question.id,
        text: question.text,
      })),
    })),
    sectionTranslations,
    questionTranslations,
  );

  return (
    <div className="space-y-8">
      <QuestionnaireTranslationsPanel bundles={translationBundles} hasContent={sections.length > 0} />
    </div>
  );
}
