import Link from "next/link";
import { QuestionType } from "@prisma/client";
import { requireMeavoAccess } from "@/lib/meavo-auth";
import { migrateOrphanQuestions } from "@/lib/questionnaire-db";
import { prisma } from "@/lib/prisma";
import { questionTypeLabel } from "@/lib/questionnaire";
import { buildLocaleTranslationBundles } from "@/lib/questionnaire-translation-status";
import {
  addQuestion,
  addSection,
  deleteQuestion,
  deleteSection,
  moveQuestion,
  moveSection,
  toggleQuestionnairePublished,
  updateQuestionText,
  updateSectionTitle,
} from "@/app/actions/meavo";
import { QuestionnaireTranslationsPanel } from "@/components/questionnaire-translations-panel";
import { Button, Card, Input, PageHeader } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function QuestionnairePage() {
  await requireMeavoAccess();

  const questionnaire = await prisma.questionnaire.findFirst({
    orderBy: { createdAt: "asc" },
    include: {
      sections: {
        orderBy: { sortOrder: "asc" },
        include: {
          questions: { orderBy: { sortOrder: "asc" } },
          translations: true,
        },
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
            include: {
              questions: {
                orderBy: { sortOrder: "asc" },
                include: { translations: true },
              },
              translations: true,
            },
          },
        },
      })
    : null;

  const sections = refreshed?.sections ?? [];

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
    <>
      <PageHeader
        title="Install questionnaire"
        description="Build sections with multiple checkboxes, or yes/no branches that can end early or show follow-up questions."
      >
        {refreshed && (
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
              <input type="hidden" name="publish" value={String(!refreshed.isPublished)} />
              <Button type="submit" variant="secondary">
                {refreshed.isPublished ? "Unpublish" : "Publish"}
              </Button>
            </form>
          </div>
        )}
      </PageHeader>

      {refreshed && (
        <QuestionnaireTranslationsPanel bundles={translationBundles} hasContent={sections.length > 0} />
      )}

      <Card className="mb-6">
        <h2 className="font-medium text-slate-900">Add section</h2>
        <form action={addSection} className="mt-4 flex flex-col gap-3 sm:flex-row">
          <div className="flex-1">
            <Input label="Section title" name="title" required placeholder="Electrics / Cabling" />
          </div>
          <div className="flex items-end">
            <Button type="submit">Add section</Button>
          </div>
        </form>
      </Card>

      <div className="grid gap-4">
        {sections.map((section, sectionIndex) => {
          const yesNoQuestions = section.questions.filter((q) => q.type === QuestionType.YES_NO);
          const topLevelQuestions = section.questions.filter((q) => !q.parentQuestionId);

          return (
            <Card key={section.id}>
              <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 pb-4">
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-slate-500">Section {sectionIndex + 1}</p>
                  <form action={updateSectionTitle} className="mt-1 flex flex-wrap items-end gap-2">
                    <input type="hidden" name="id" value={section.id} />
                    <input
                      name="title"
                      defaultValue={section.title}
                      required
                      className="min-w-0 flex-1 rounded-lg border border-slate-300 px-3 py-2 text-lg font-medium text-slate-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
                    />
                    <Button type="submit" variant="secondary" className="px-3 py-1.5 text-xs">
                      Save title
                    </Button>
                  </form>
                </div>
                <div className="flex gap-1">
                  <form action={moveSection}>
                    <input type="hidden" name="id" value={section.id} />
                    <input type="hidden" name="direction" value="up" />
                    <Button type="submit" variant="secondary" className="px-2 py-1.5" disabled={sectionIndex === 0}>
                      ↑
                    </Button>
                  </form>
                  <form action={moveSection}>
                    <input type="hidden" name="id" value={section.id} />
                    <input type="hidden" name="direction" value="down" />
                    <Button
                      type="submit"
                      variant="secondary"
                      className="px-2 py-1.5"
                      disabled={sectionIndex === sections.length - 1}
                    >
                      ↓
                    </Button>
                  </form>
                  <form action={deleteSection}>
                    <input type="hidden" name="id" value={section.id} />
                    <Button type="submit" variant="danger">
                      Remove section
                    </Button>
                  </form>
                </div>
              </div>

              <ul className="mt-4 space-y-2">
                {section.questions.map((q, questionIndex) => (
                  <li
                    key={q.id}
                    className="flex flex-wrap items-start justify-between gap-2 rounded-lg border border-slate-100 p-3"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
                          {questionTypeLabel(q.type)}
                        </span>
                        {q.parentQuestionId && (
                          <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs text-amber-800">
                            Follow-up if Yes
                          </span>
                        )}
                        {q.endsQuestionnaireOnNo && (
                          <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs text-blue-800">
                            Ends on No
                          </span>
                        )}
                      </div>
                      <form action={updateQuestionText} className="mt-2 flex flex-wrap items-end gap-2">
                        <input type="hidden" name="id" value={q.id} />
                        <textarea
                          name="text"
                          defaultValue={q.text}
                          required
                          rows={2}
                          className="min-w-0 flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
                        />
                        <Button type="submit" variant="secondary" className="px-3 py-1.5 text-xs">
                          Save
                        </Button>
                      </form>
                    </div>
                    <div className="flex gap-1">
                      <form action={moveQuestion}>
                        <input type="hidden" name="id" value={q.id} />
                        <input type="hidden" name="direction" value="up" />
                        <Button
                          type="submit"
                          variant="secondary"
                          className="px-2 py-1.5"
                          disabled={questionIndex === 0}
                        >
                          ↑
                        </Button>
                      </form>
                      <form action={moveQuestion}>
                        <input type="hidden" name="id" value={q.id} />
                        <input type="hidden" name="direction" value="down" />
                        <Button
                          type="submit"
                          variant="secondary"
                          className="px-2 py-1.5"
                          disabled={questionIndex === section.questions.length - 1}
                        >
                          ↓
                        </Button>
                      </form>
                      <form action={deleteQuestion}>
                        <input type="hidden" name="id" value={q.id} />
                        <Button type="submit" variant="danger">
                          Remove
                        </Button>
                      </form>
                    </div>
                  </li>
                ))}
                {topLevelQuestions.length === 0 && (
                  <p className="text-sm text-slate-500">No questions in this section yet.</p>
                )}
              </ul>

              <form action={addQuestion} className="mt-4 space-y-3 border-t border-slate-100 pt-4">
                <input type="hidden" name="sectionId" value={section.id} />
                <Input label="Question" name="text" required placeholder="Is the booth plugged in?" />
                <label className="block space-y-1 text-sm">
                  <span className="font-medium text-slate-700">Answer type</span>
                  <select
                    name="type"
                    defaultValue="CHECKBOX"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
                  >
                    <option value="CHECKBOX">Checkbox — tick to confirm</option>
                    <option value="TEXT">Free text</option>
                    <option value="YES_NO">Yes / No</option>
                  </select>
                </label>
                {yesNoQuestions.length > 0 && (
                  <label className="block space-y-1 text-sm">
                    <span className="font-medium text-slate-700">Follow-up to (optional)</span>
                    <select
                      name="parentQuestionId"
                      defaultValue=""
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
                    >
                      <option value="">None — show in section flow</option>
                      {yesNoQuestions.map((q) => (
                        <option key={q.id} value={q.id}>
                          If Yes on: {q.text}
                        </option>
                      ))}
                    </select>
                  </label>
                )}
                <label className="flex items-center gap-2 text-sm text-slate-700">
                  <input type="checkbox" name="endsQuestionnaireOnNo" className="h-4 w-4 rounded border-slate-300" />
                  End questionnaire if partner answers No (yes/no questions only)
                </label>
                <Button type="submit">Add question to section</Button>
              </form>
            </Card>
          );
        })}
        {sections.length === 0 && (
          <Card>
            <p className="text-sm text-slate-600">
              No sections yet. Add a section like &quot;Electrics / Cabling&quot; and put related checkbox questions
              inside it.
            </p>
          </Card>
        )}
      </div>
    </>
  );
}
