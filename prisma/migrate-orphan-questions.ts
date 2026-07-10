/**
 * One-time data migration: attach orphan questions (sectionId = null) to a new
 * "Install checks" section. Previously ran on every questionnaire page load
 * ("migrate-on-read"); now run once via:
 *
 *   npx tsx prisma/migrate-orphan-questions.ts
 */
import { prisma } from "../src/lib/prisma";
import { migrateOrphanQuestions } from "../src/lib/questionnaire-db";

async function main() {
  const questionnaires = await prisma.questionnaire.findMany({ select: { id: true } });
  for (const questionnaire of questionnaires) {
    const orphans = await prisma.question.count({
      where: { questionnaireId: questionnaire.id, sectionId: null },
    });
    await migrateOrphanQuestions(questionnaire.id);
    console.log(`Questionnaire ${questionnaire.id}: migrated ${orphans} orphan question(s).`);
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
