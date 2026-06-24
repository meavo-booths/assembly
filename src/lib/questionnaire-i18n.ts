import { QuestionnaireLocale, TranslationStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  buildTranslationLookup,
  getFullyApprovedLocales,
  parseQuestionnaireLocaleParam,
  resolveQuestionnaireLocale,
  type TranslationLookup,
} from "@/lib/questionnaire-locales";
import { mapQuestionnaireSections, type SectionRecord } from "@/lib/questionnaire";

type DbSection = Parameters<typeof mapQuestionnaireSections>[0];

export async function loadLocalizedQuestionnaireSections(
  sections: DbSection,
  options: {
    langParam?: string;
    cookieLang?: string;
    acceptLanguage?: string | null;
  },
): Promise<{
  sections: SectionRecord[];
  locale: QuestionnaireLocale;
  availableLocales: QuestionnaireLocale[];
}> {
  const sectionIds = sections.map((section) => section.id);
  const questionIds = sections.flatMap((section) => section.questions.map((q) => q.id));

  const [sectionCounts, questionCounts] = await Promise.all([
    sectionIds.length > 0
      ? prisma.questionnaireSectionTranslation.groupBy({
          by: ["locale"],
          where: {
            sectionId: { in: sectionIds },
            status: TranslationStatus.APPROVED,
          },
          _count: { sectionId: true },
        })
      : Promise.resolve([]),
    questionIds.length > 0
      ? prisma.questionTranslation.groupBy({
          by: ["locale"],
          where: {
            questionId: { in: questionIds },
            status: TranslationStatus.APPROVED,
          },
          _count: { questionId: true },
        })
      : Promise.resolve([]),
  ]);

  const approvedSectionCounts = Object.fromEntries(
    sectionCounts.map((row) => [row.locale, row._count.sectionId]),
  ) as Partial<Record<QuestionnaireLocale, number>>;

  const approvedQuestionCounts = Object.fromEntries(
    questionCounts.map((row) => [row.locale, row._count.questionId]),
  ) as Partial<Record<QuestionnaireLocale, number>>;

  const availableLocales = getFullyApprovedLocales(
    sectionIds.length,
    questionIds.length,
    approvedSectionCounts,
    approvedQuestionCounts,
  );

  const locale = resolveQuestionnaireLocale(
    parseQuestionnaireLocaleParam(options.langParam),
    options.acceptLanguage ?? null,
    options.cookieLang,
    availableLocales,
  );

  let translations: TranslationLookup | undefined;
  if (locale !== QuestionnaireLocale.EN && sectionIds.length > 0) {
    const [sectionTranslations, questionTranslations] = await Promise.all([
      prisma.questionnaireSectionTranslation.findMany({
        where: {
          sectionId: { in: sectionIds },
          locale,
          status: TranslationStatus.APPROVED,
        },
        select: { sectionId: true, title: true },
      }),
      questionIds.length > 0
        ? prisma.questionTranslation.findMany({
            where: {
              questionId: { in: questionIds },
              locale,
              status: TranslationStatus.APPROVED,
            },
            select: { questionId: true, text: true },
          })
        : Promise.resolve([]),
    ]);
    translations = buildTranslationLookup(sectionTranslations, questionTranslations);
  }

  return {
    sections: mapQuestionnaireSections(sections, locale, translations),
    locale,
    availableLocales,
  };
}
