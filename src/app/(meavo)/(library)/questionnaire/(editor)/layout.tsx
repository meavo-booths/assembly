import Link from "next/link";
import { requireMeavoAccess } from "@/lib/meavo-auth";
import { prisma } from "@/lib/prisma";
import { toggleQuestionnairePublished } from "@/app/actions/meavo";
import { QuestionnaireNav } from "@/components/questionnaire-nav";
import { Button, PageHeader } from "@/components/ui";

export default async function QuestionnaireLayout({ children }: { children: React.ReactNode }) {
  await requireMeavoAccess();

  const questionnaire = await prisma.questionnaire.findFirst({
    orderBy: { createdAt: "asc" },
    select: { id: true, isPublished: true },
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Install questionnaire"
        description="Build sections with multiple checkboxes, or yes/no branches that can end early or show follow-up questions."
      >
        {questionnaire && (
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/questionnaire/preview"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Preview
            </Link>
            <form action={toggleQuestionnairePublished}>
              <input type="hidden" name="publish" value={String(!questionnaire.isPublished)} />
              <Button type="submit" variant="secondary">
                {questionnaire.isPublished ? "Unpublish" : "Publish"}
              </Button>
            </form>
          </div>
        )}
      </PageHeader>
      <QuestionnaireNav />
      {children}
    </div>
  );
}
