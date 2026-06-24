import { generateText, Output } from "ai";
import { QuestionnaireLocale } from "@prisma/client";
import { z } from "zod";
import { LOCALE_NAMES } from "@/lib/questionnaire-locales";

const TRANSLATION_MODEL =
  process.env.QUESTIONNAIRE_TRANSLATION_MODEL ?? "google/gemini-3.5-flash";

const translationOutputSchema = z.object({
  sections: z.array(
    z.object({
      id: z.string(),
      title: z.string(),
    }),
  ),
  questions: z.array(
    z.object({
      id: z.string(),
      text: z.string(),
    }),
  ),
});

export type TranslationSource = {
  sections: Array<{ id: string; title: string }>;
  questions: Array<{ id: string; text: string }>;
};

export type TranslationResult = {
  sections: Array<{ id: string; title: string }>;
  questions: Array<{ id: string; text: string }>;
};

const LOCALE_LANGUAGE: Record<QuestionnaireLocale, string> = {
  [QuestionnaireLocale.EN]: "English",
  [QuestionnaireLocale.DE]: "German",
  [QuestionnaireLocale.FR]: "French",
  [QuestionnaireLocale.ES]: "Spanish",
  [QuestionnaireLocale.IT]: "Italian",
};

function buildPrompt(locale: QuestionnaireLocale, source: TranslationSource): string {
  const language = LOCALE_LANGUAGE[locale];
  return `You translate install questionnaires for photo booth assembly partners.

Translate every section title and question prompt from English to ${language} (${LOCALE_NAMES[locale]}).

Rules:
- Preserve brand and product names exactly (MEAVO, booth model names).
- Keep technical install wording accurate and professional.
- Return the exact section and question IDs from the input.
- Translate prompts only — do not add explanations.
- Use natural ${language} suitable for field installers.

Source JSON:
${JSON.stringify(source, null, 2)}`;
}

function normalizeTranslationResult(
  source: TranslationSource,
  generated: TranslationResult,
): TranslationResult {
  const sectionById = new Map(generated.sections.map((row) => [row.id, row.title]));
  const questionById = new Map(generated.questions.map((row) => [row.id, row.text]));

  return {
    sections: source.sections.map((section) => ({
      id: section.id,
      title: sectionById.get(section.id)?.trim() || section.title,
    })),
    questions: source.questions.map((question) => ({
      id: question.id,
      text: questionById.get(question.id)?.trim() || question.text,
    })),
  };
}

export async function translateQuestionnaireToLocale(
  locale: QuestionnaireLocale,
  source: TranslationSource,
): Promise<TranslationResult> {
  const result = await generateText({
    model: TRANSLATION_MODEL,
    output: Output.object({ schema: translationOutputSchema }),
    prompt: buildPrompt(locale, source),
    providerOptions: {
      google: {
        thinkingConfig: {
          thinkingLevel: "minimal",
        },
      },
    },
  });

  if (!result.output) {
    throw new Error(`No translation output for ${locale}`);
  }

  return normalizeTranslationResult(source, result.output);
}
