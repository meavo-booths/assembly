"use server";

import { QuestionnaireLocale, TranslationStatus } from "@prisma/client";
import { requireMeavoAccess } from "@/lib/meavo-auth";
import { prisma } from "@/lib/prisma";
import { TARGET_QUESTIONNAIRE_LOCALES } from "@/lib/questionnaire-locales";
import { revalidateQuestionnaireAdmin } from "@/lib/questionnaire-revalidate";
import { translateQuestionnaireToLocale, type TranslationResult } from "@/lib/questionnaire-translate-ai";

type ActionResult = { ok: true } | { ok: false; error: string };

async function upsertLocaleTranslations(
  locale: QuestionnaireLocale,
  translated: TranslationResult,
): Promise<void> {
  await prisma.$transaction([
    ...translated.sections.map((section) =>
      prisma.questionnaireSectionTranslation.upsert({
        where: {
          sectionId_locale: { sectionId: section.id, locale },
        },
        create: {
          sectionId: section.id,
          locale,
          title: section.title,
          status: TranslationStatus.DRAFT,
        },
        update: {
          title: section.title,
          status: TranslationStatus.DRAFT,
        },
      }),
    ),
    ...translated.questions.map((question) =>
      prisma.questionTranslation.upsert({
        where: {
          questionId_locale: { questionId: question.id, locale },
        },
        create: {
          questionId: question.id,
          locale,
          text: question.text,
          status: TranslationStatus.DRAFT,
        },
        update: {
          text: question.text,
          status: TranslationStatus.DRAFT,
        },
      }),
    ),
  ]);
}

function formatTranslationError(error: unknown): string {
  const message = error instanceof Error ? error.message : "Translation generation failed.";
  return message.includes("authentication") || message.includes("401")
    ? "AI Gateway is not configured. Enable AI Gateway on the assembly Vercel project or run vercel env pull locally."
    : message;
}

async function loadQuestionnaireSource() {
  const questionnaire = await prisma.questionnaire.findFirst({
    orderBy: { createdAt: "asc" },
    include: {
      sections: {
        orderBy: { sortOrder: "asc" },
        include: { questions: { orderBy: { sortOrder: "asc" } } },
      },
    },
  });

  if (!questionnaire) {
    return null;
  }

  const sections = questionnaire.sections.map((section) => ({
    id: section.id,
    title: section.title,
  }));

  const questions = questionnaire.sections.flatMap((section) =>
    section.questions.map((question) => ({
      id: question.id,
      text: question.text,
    })),
  );

  return { questionnaire, source: { sections, questions } };
}

function parseLocale(value: FormDataEntryValue | null): QuestionnaireLocale | null {
  const raw = String(value ?? "").trim().toUpperCase();
  if (Object.values(QuestionnaireLocale).includes(raw as QuestionnaireLocale)) {
    return raw as QuestionnaireLocale;
  }
  return null;
}

export async function generateQuestionnaireTranslations(): Promise<ActionResult> {
  await requireMeavoAccess();

  const loaded = await loadQuestionnaireSource();
  if (!loaded) {
    return { ok: false, error: "No questionnaire found." };
  }

  if (loaded.source.sections.length === 0) {
    return { ok: false, error: "Add at least one section before generating translations." };
  }

  try {
    for (const locale of TARGET_QUESTIONNAIRE_LOCALES) {
      const translated = await translateQuestionnaireToLocale(locale, loaded.source);
      await upsertLocaleTranslations(locale, translated);
    }
  } catch (error) {
    return { ok: false, error: formatTranslationError(error) };
  }

  revalidateQuestionnaireAdmin();
  return { ok: true };
}

export async function generateLocaleTranslations(locale: QuestionnaireLocale): Promise<ActionResult> {
  await requireMeavoAccess();

  if (locale === QuestionnaireLocale.EN) {
    return { ok: false, error: "English is the source language." };
  }

  const loaded = await loadQuestionnaireSource();
  if (!loaded) {
    return { ok: false, error: "No questionnaire found." };
  }

  if (loaded.source.sections.length === 0) {
    return { ok: false, error: "Add at least one section before generating translations." };
  }

  try {
    const translated = await translateQuestionnaireToLocale(locale, loaded.source);
    await upsertLocaleTranslations(locale, translated);
  } catch (error) {
    return { ok: false, error: formatTranslationError(error) };
  }

  revalidateQuestionnaireAdmin();
  return { ok: true };
}

export async function saveLocaleTranslations(formData: FormData): Promise<void> {
  await requireMeavoAccess();

  const locale = parseLocale(formData.get("locale"));
  if (!locale || locale === QuestionnaireLocale.EN) return;

  const loaded = await loadQuestionnaireSource();
  if (!loaded) return;

  const ops = [];

  for (const section of loaded.source.sections) {
    const title = String(formData.get(`section_${section.id}`) ?? "").trim();
    if (!title) continue;
    ops.push(
      prisma.questionnaireSectionTranslation.upsert({
        where: { sectionId_locale: { sectionId: section.id, locale } },
        create: { sectionId: section.id, locale, title, status: TranslationStatus.DRAFT },
        update: { title, status: TranslationStatus.DRAFT },
      }),
    );
  }

  for (const question of loaded.source.questions) {
    const text = String(formData.get(`question_${question.id}`) ?? "").trim();
    if (!text) continue;
    ops.push(
      prisma.questionTranslation.upsert({
        where: { questionId_locale: { questionId: question.id, locale } },
        create: { questionId: question.id, locale, text, status: TranslationStatus.DRAFT },
        update: { text, status: TranslationStatus.DRAFT },
      }),
    );
  }

  if (ops.length > 0) {
    await prisma.$transaction(ops);
  }

  revalidateQuestionnaireAdmin();
}

export async function approveLocaleTranslations(formData: FormData): Promise<void> {
  await requireMeavoAccess();

  const locale = parseLocale(formData.get("locale"));
  if (!locale || locale === QuestionnaireLocale.EN) return;

  const loaded = await loadQuestionnaireSource();
  if (!loaded) return;

  const sectionIds = loaded.source.sections.map((section) => section.id);
  const questionIds = loaded.source.questions.map((question) => question.id);

  await prisma.$transaction([
    prisma.questionnaireSectionTranslation.updateMany({
      where: { sectionId: { in: sectionIds }, locale },
      data: { status: TranslationStatus.APPROVED },
    }),
    prisma.questionTranslation.updateMany({
      where: { questionId: { in: questionIds }, locale },
      data: { status: TranslationStatus.APPROVED },
    }),
  ]);

  revalidateQuestionnaireAdmin();
}
