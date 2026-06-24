import { QuestionnaireLocale, TranslationStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  buildTranslationLookup,
  getFullyApprovedLocales,
  getFullyTranslatedLocales,
  parseQuestionnaireLocaleParam,
  resolvePreviewLocale,
  resolveQuestionnaireLocale,
  type TranslationLookup,
} from "@/lib/questionnaire-locales";
import { mapQuestionnaireSections, type SectionRecord } from "@/lib/questionnaire";

type DbSection = Parameters<typeof mapQuestionnaireSections>[0];

type LoadOptions = {
  langParam?: string;
  cookieLang?: string;
  acceptLanguage?: string | null;
  context?: "partner" | "preview";
  previewPartnerView?: boolean;
};

export async function loadLocalizedQuestionnaireSections(
  sections: DbSection,
  options: LoadOptions = {},
): Promise<{
  sections: SectionRecord[];
  locale: QuestionnaireLocale;
  availableLocales: QuestionnaireLocale[];
  approvedLocales: QuestionnaireLocale[];
}> {
  const context = options.context ?? "partner";
  const partnerView = context === "partner" || options.previewPartnerView === true;

  const sectionIds = sections.map((section) => section.id);
  const questionIds = sections.flatMap((section) => section.questions.map((q) => q.id));
  const sectionCount = sectionIds.length;
  const questionCount = questionIds.length;

  const [approvedSectionCounts, approvedQuestionCounts, allSectionCounts, allQuestionCounts] =
    await Promise.all([
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
      sectionIds.length > 0
        ? prisma.questionnaireSectionTranslation.groupBy({
            by: ["locale"],
            where: { sectionId: { in: sectionIds } },
            _count: { sectionId: true },
          })
        : Promise.resolve([]),
      questionIds.length > 0
        ? prisma.questionTranslation.groupBy({
            by: ["locale"],
            where: { questionId: { in: questionIds } },
            _count: { questionId: true },
          })
        : Promise.resolve([]),
    ]);

  const approvedSectionCountsMap = Object.fromEntries(
    approvedSectionCounts.map((row) => [row.locale, row._count.sectionId]),
  ) as Partial<Record<QuestionnaireLocale, number>>;

  const approvedQuestionCountsMap = Object.fromEntries(
    approvedQuestionCounts.map((row) => [row.locale, row._count.questionId]),
  ) as Partial<Record<QuestionnaireLocale, number>>;

  const allSectionCountsMap = Object.fromEntries(
    allSectionCounts.map((row) => [row.locale, row._count.sectionId]),
  ) as Partial<Record<QuestionnaireLocale, number>>;

  const allQuestionCountsMap = Object.fromEntries(
    allQuestionCounts.map((row) => [row.locale, row._count.questionId]),
  ) as Partial<Record<QuestionnaireLocale, number>>;

  const approvedLocales = getFullyApprovedLocales(
    sectionCount,
    questionCount,
    approvedSectionCountsMap,
    approvedQuestionCountsMap,
  );

  const availableLocales = partnerView
    ? approvedLocales
    : getFullyTranslatedLocales(
        sectionCount,
        questionCount,
        allSectionCountsMap,
        allQuestionCountsMap,
      );

  const requested = parseQuestionnaireLocaleParam(options.langParam);
  const locale =
    context === "preview"
      ? resolvePreviewLocale(requested, availableLocales)
      : resolveQuestionnaireLocale(
          requested,
          options.acceptLanguage ?? null,
          options.cookieLang,
          availableLocales,
        );

  let translations: TranslationLookup | undefined;
  if (locale !== QuestionnaireLocale.EN && sectionIds.length > 0) {
    const statusFilter = partnerView ? TranslationStatus.APPROVED : undefined;
    const [sectionTranslations, questionTranslations] = await Promise.all([
      prisma.questionnaireSectionTranslation.findMany({
        where: {
          sectionId: { in: sectionIds },
          locale,
          ...(statusFilter ? { status: statusFilter } : {}),
        },
        select: { sectionId: true, title: true },
      }),
      questionIds.length > 0
        ? prisma.questionTranslation.findMany({
            where: {
              questionId: { in: questionIds },
              locale,
              ...(statusFilter ? { status: statusFilter } : {}),
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
    approvedLocales,
  };
}
