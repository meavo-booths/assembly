import Link from "next/link";
import { QuestionnaireLocale } from "@prisma/client";
import { requireMeavoAccess } from "@/lib/meavo-auth";
import { migrateOrphanQuestions } from "@/lib/questionnaire-db";
import { mapQuestionnaireSections } from "@/lib/questionnaire";
import { prisma } from "@/lib/prisma";
import { QuestionnaireWizard } from "@/components/questionnaire-wizard";
import { PageHeader } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function QuestionnairePreviewPage() {
  await requireMeavoAccess();

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

  const sections = mapQuestionnaireSections(refreshed?.sections ?? []);

  return (
    <div className="mx-auto max-w-lg">
      <PageHeader
        title="Questionnaire preview"
        description="Walk through the current questionnaire as a partner would. Nothing is saved."
      />

      <p className="mb-4">
        <Link href="/questionnaire" className="text-sm text-brand-700 underline">
          ← Back to builder
        </Link>
      </p>

      {refreshed && !refreshed.isPublished && (
        <p className="mb-4 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900">
          This questionnaire is <span className="font-medium">not published</span> yet. Partners will not see it until
          you publish.
        </p>
      )}

      <QuestionnaireWizard
        preview
        sections={sections}
        locale={QuestionnaireLocale.EN}
        availableLocales={[QuestionnaireLocale.EN]}
      />
    </div>
  );
}
