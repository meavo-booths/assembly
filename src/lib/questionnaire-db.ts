import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";

export const QUESTIONNAIRE_PUBLISHED_TAG = "questionnaire-published";

/**
 * Sections + questions of the published questionnaire, cached and tag-
 * invalidated by the editor actions (via revalidateQuestionnaireAdmin). Only
 * scalar fields are selected so the JSON cache round-trip is lossless.
 */
export const getPublishedQuestionnaireSections = unstable_cache(
  async () => {
    const questionnaire = await prisma.questionnaire.findFirst({
      where: { isPublished: true },
      select: {
        sections: {
          orderBy: { sortOrder: "asc" },
          select: {
            id: true,
            title: true,
            sortOrder: true,
            questions: {
              orderBy: { sortOrder: "asc" },
              select: {
                id: true,
                text: true,
                type: true,
                sortOrder: true,
                parentQuestionId: true,
                endsQuestionnaireOnNo: true,
              },
            },
          },
        },
      },
    });
    return questionnaire?.sections ?? null;
  },
  ["published-questionnaire-sections"],
  { revalidate: 300, tags: [QUESTIONNAIRE_PUBLISHED_TAG] },
);

/**
 * One-time repair for questions created before sections existed. Run via
 * prisma/migrate-orphan-questions.ts — no longer called on page loads.
 */
export async function migrateOrphanQuestions(questionnaireId: string): Promise<void> {
  const orphans = await prisma.question.findMany({
    where: { questionnaireId, sectionId: null },
    orderBy: { sortOrder: "asc" },
  });
  if (orphans.length === 0) return;

  const maxSectionOrder = await prisma.questionnaireSection.aggregate({
    where: { questionnaireId },
    _max: { sortOrder: true },
  });

  const section = await prisma.questionnaireSection.create({
    data: {
      questionnaireId,
      title: "Install checks",
      sortOrder: (maxSectionOrder._max.sortOrder ?? -1) + 1,
    },
  });

  await prisma.$transaction(
    orphans.map((q, index) =>
      prisma.question.update({
        where: { id: q.id },
        data: { sectionId: section.id, sortOrder: index },
      }),
    ),
  );
}
