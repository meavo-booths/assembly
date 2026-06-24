import { QuestionType, QuestionnaireLocale } from "@prisma/client";
import type { TranslationLookup } from "@/lib/questionnaire-locales";

export type QuestionRecord = {
  id: string;
  text: string;
  type: QuestionType;
  sortOrder: number;
  parentQuestionId: string | null;
  endsQuestionnaireOnNo: boolean;
};

export type SectionRecord = {
  id: string;
  title: string;
  sortOrder: number;
  questions: QuestionRecord[];
};

export type AnswerRecord = {
  checked: boolean;
  text: string;
  yesNo: boolean | null;
};

export type WizardStep =
  | { kind: "section"; sectionId: string; title: string; questions: QuestionRecord[] }
  | { kind: "yes_no"; question: QuestionRecord }
  | { kind: "follow_up"; question: QuestionRecord }
  | { kind: "photos" };

export function buildWizardSteps(sections: SectionRecord[], answers: Record<string, AnswerRecord>): WizardStep[] {
  const steps: WizardStep[] = [];

  for (const section of sections) {
    const topLevel = [...section.questions].sort((a, b) => a.sortOrder - b.sortOrder);
    const yesNo = topLevel.find((q) => q.type === QuestionType.YES_NO && !q.parentQuestionId);
    const checkboxes = topLevel.filter((q) => q.type === QuestionType.CHECKBOX && !q.parentQuestionId);

    if (yesNo) {
      steps.push({ kind: "yes_no", question: yesNo });
      if (answers[yesNo.id]?.yesNo === true) {
        const followUp = topLevel.find((q) => q.parentQuestionId === yesNo.id);
        if (followUp) steps.push({ kind: "follow_up", question: followUp });
      }
    } else if (checkboxes.length > 0) {
      steps.push({
        kind: "section",
        sectionId: section.id,
        title: section.title,
        questions: checkboxes,
      });
    }
  }

  const endsEarly = sections.some((section) => {
    const yesNo = section.questions.find((q) => q.type === QuestionType.YES_NO && !q.parentQuestionId);
    return yesNo?.endsQuestionnaireOnNo && answers[yesNo.id]?.yesNo === false;
  });

  if (!endsEarly) {
    steps.push({ kind: "photos" });
  }

  return steps;
}

export function isStepComplete(step: WizardStep, answers: Record<string, AnswerRecord>): boolean {
  if (step.kind === "section") {
    return step.questions.every((q) => answers[q.id]?.checked);
  }
  if (step.kind === "yes_no") {
    return answers[step.question.id]?.yesNo !== null && answers[step.question.id]?.yesNo !== undefined;
  }
  if (step.kind === "follow_up") {
    return (answers[step.question.id]?.text ?? "").trim().length > 0;
  }
  return true;
}

export function questionTypeLabel(type: QuestionType): string {
  if (type === QuestionType.TEXT) return "Free text";
  if (type === QuestionType.YES_NO) return "Yes / No";
  return "Checkbox";
}

type DbQuestionnaireSection = {
  id: string;
  title: string;
  sortOrder: number;
  questions: Array<{
    id: string;
    text: string;
    type: QuestionType;
    sortOrder: number;
    parentQuestionId: string | null;
    endsQuestionnaireOnNo: boolean;
  }>;
};

export function mapQuestionnaireSections(
  sections: DbQuestionnaireSection[],
  locale: QuestionnaireLocale = QuestionnaireLocale.EN,
  translations?: TranslationLookup,
): SectionRecord[] {
  const useTranslations =
    locale !== QuestionnaireLocale.EN && translations !== undefined;

  return sections.map((section) => ({
    id: section.id,
    title: useTranslations
      ? (translations.sections[section.id] ?? section.title)
      : section.title,
    sortOrder: section.sortOrder,
    questions: section.questions.map((q) => ({
      id: q.id,
      text: useTranslations ? (translations.questions[q.id] ?? q.text) : q.text,
      type: q.type,
      sortOrder: q.sortOrder,
      parentQuestionId: q.parentQuestionId,
      endsQuestionnaireOnNo: q.endsQuestionnaireOnNo,
    })),
  }));
}
