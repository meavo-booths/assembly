import { QuestionnaireLocale, TranslationStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { TARGET_QUESTIONNAIRE_LOCALES } from "@/lib/questionnaire-locales";

export type LocaleTranslationStatus = "not_generated" | "draft" | "stale" | "approved";

export type LocaleTranslationBundle = {
  locale: QuestionnaireLocale;
  status: LocaleTranslationStatus;
  sections: Array<{
    id: string;
    enTitle: string;
    title: string;
    rowStatus: TranslationStatus | null;
  }>;
  questions: Array<{
    id: string;
    enText: string;
    text: string;
    rowStatus: TranslationStatus | null;
  }>;
};

type SectionRow = { sectionId: string; locale: QuestionnaireLocale; title: string; status: TranslationStatus };
type QuestionRow = { questionId: string; locale: QuestionnaireLocale; text: string; status: TranslationStatus };

export function computeLocaleTranslationStatus(
  sectionCount: number,
  questionCount: number,
  sectionRows: Array<{ status: TranslationStatus }>,
  questionRows: Array<{ status: TranslationStatus }>,
): LocaleTranslationStatus {
  const expected = sectionCount + questionCount;
  const actual = sectionRows.length + questionRows.length;
  if (expected === 0 || actual < expected) return "not_generated";

  const rows = [...sectionRows, ...questionRows];
  if (rows.some((row) => row.status === TranslationStatus.STALE)) return "stale";
  if (rows.every((row) => row.status === TranslationStatus.APPROVED)) return "approved";
  return "draft";
}

export function buildLocaleTranslationBundles(
  sections: Array<{ id: string; title: string; questions: Array<{ id: string; text: string }> }>,
  sectionTranslations: SectionRow[],
  questionTranslations: QuestionRow[],
): LocaleTranslationBundle[] {
  const sectionCount = sections.length;
  const questionCount = sections.reduce((sum, section) => sum + section.questions.length, 0);
  const allQuestions = sections.flatMap((section) => section.questions);

  return TARGET_QUESTIONNAIRE_LOCALES.map((locale) => {
    const localeSectionRows = sectionTranslations.filter((row) => row.locale === locale);
    const localeQuestionRows = questionTranslations.filter((row) => row.locale === locale);
    const sectionById = new Map(localeSectionRows.map((row) => [row.sectionId, row]));
    const questionById = new Map(localeQuestionRows.map((row) => [row.questionId, row]));

    return {
      locale,
      status: computeLocaleTranslationStatus(
        sectionCount,
        questionCount,
        localeSectionRows,
        localeQuestionRows,
      ),
      sections: sections.map((section) => {
        const row = sectionById.get(section.id);
        return {
          id: section.id,
          enTitle: section.title,
          title: row?.title ?? "",
          rowStatus: row?.status ?? null,
        };
      }),
      questions: allQuestions.map((question) => {
        const row = questionById.get(question.id);
        return {
          id: question.id,
          enText: question.text,
          text: row?.text ?? "",
          rowStatus: row?.status ?? null,
        };
      }),
    };
  });
}

export async function markSectionTranslationsStale(sectionId: string): Promise<void> {
  await prisma.questionnaireSectionTranslation.updateMany({
    where: { sectionId },
    data: { status: TranslationStatus.STALE },
  });
}

export async function markQuestionTranslationsStale(questionId: string): Promise<void> {
  await prisma.questionTranslation.updateMany({
    where: { questionId },
    data: { status: TranslationStatus.STALE },
  });
}
