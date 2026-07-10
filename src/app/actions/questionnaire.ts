"use server";

import { QuestionType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireMeavoAccess } from "@/lib/meavo-auth";
import { revalidateQuestionnaireAdmin } from "@/lib/questionnaire-revalidate";
import {
  markQuestionTranslationsStale,
  markSectionTranslationsStale,
} from "@/lib/questionnaire-translation-status";

function parseQuestionType(value: string): QuestionType {
  if (value === "TEXT") return QuestionType.TEXT;
  if (value === "YES_NO") return QuestionType.YES_NO;
  return QuestionType.CHECKBOX;
}

/**
 * Pick the neighbour to swap sort orders with. Returns null when the move is
 * out of range (already first/last, or the id is unknown).
 */
function findSwapPartner<T extends { id: string }>(
  items: T[],
  id: string,
  direction: "up" | "down",
): { current: T; other: T } | null {
  const index = items.findIndex((item) => item.id === id);
  const swapIndex = direction === "up" ? index - 1 : index + 1;
  if (index < 0 || swapIndex < 0 || swapIndex >= items.length) return null;
  return { current: items[index], other: items[swapIndex] };
}

export async function addSection(formData: FormData): Promise<{ error?: string }> {
  await requireMeavoAccess();
  const title = String(formData.get("title") ?? "").trim();
  if (!title) return { error: "Section title is required." };

  const questionnaire = await getOrCreateQuestionnaire();
  const maxOrder = await prisma.questionnaireSection.aggregate({
    where: { questionnaireId: questionnaire.id },
    _max: { sortOrder: true },
  });

  await prisma.questionnaireSection.create({
    data: {
      questionnaireId: questionnaire.id,
      title,
      sortOrder: (maxOrder._max.sortOrder ?? -1) + 1,
    },
  });
  revalidateQuestionnaireAdmin();
  return {};
}

export async function updateSectionTitle(formData: FormData): Promise<{ error?: string }> {
  await requireMeavoAccess();
  const id = String(formData.get("id") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  if (!id) return { error: "Section not found." };
  if (!title) return { error: "Section title is required." };

  const section = await prisma.questionnaireSection.findUnique({ where: { id } });
  if (!section) return { error: "Section not found." };
  if (section.title === title) return {};

  await prisma.questionnaireSection.update({
    where: { id },
    data: { title },
  });
  await markSectionTranslationsStale(id);
  revalidateQuestionnaireAdmin();
  return {};
}

export async function updateQuestionText(formData: FormData): Promise<{ error?: string }> {
  await requireMeavoAccess();
  const id = String(formData.get("id") ?? "");
  const text = String(formData.get("text") ?? "").trim();
  if (!id) return { error: "Question not found." };
  if (!text) return { error: "Question text is required." };

  const question = await prisma.question.findUnique({ where: { id } });
  if (!question) return { error: "Question not found." };
  if (question.text === text) return {};

  await prisma.question.update({
    where: { id },
    data: { text },
  });
  await markQuestionTranslationsStale(id);
  revalidateQuestionnaireAdmin();
  return {};
}

export async function deleteSection(formData: FormData): Promise<{ error?: string }> {
  await requireMeavoAccess();
  const id = String(formData.get("id") ?? "");
  if (!id) return { error: "Section not found." };
  await prisma.questionnaireSection.delete({ where: { id } });
  revalidateQuestionnaireAdmin();
  return {};
}

export async function moveSection(formData: FormData): Promise<{ error?: string }> {
  await requireMeavoAccess();
  const id = String(formData.get("id") ?? "");
  const direction = formData.get("direction") === "down" ? "down" : "up";
  if (!id) return { error: "Section not found." };

  const section = await prisma.questionnaireSection.findUnique({ where: { id } });
  if (!section) return { error: "Section not found." };

  const sections = await prisma.questionnaireSection.findMany({
    where: { questionnaireId: section.questionnaireId },
    orderBy: { sortOrder: "asc" },
  });

  const pair = findSwapPartner(sections, id, direction);
  if (!pair) return {};

  await prisma.$transaction([
    prisma.questionnaireSection.update({
      where: { id: pair.current.id },
      data: { sortOrder: pair.other.sortOrder },
    }),
    prisma.questionnaireSection.update({
      where: { id: pair.other.id },
      data: { sortOrder: pair.current.sortOrder },
    }),
  ]);
  revalidateQuestionnaireAdmin();
  return {};
}

export async function addQuestion(formData: FormData): Promise<{ error?: string }> {
  await requireMeavoAccess();
  const text = String(formData.get("text") ?? "").trim();
  const sectionId = String(formData.get("sectionId") ?? "");
  if (!text) return { error: "Question text is required." };
  if (!sectionId) return { error: "Section not found." };

  const type = parseQuestionType(String(formData.get("type") ?? "CHECKBOX"));
  const parentQuestionId = String(formData.get("parentQuestionId") ?? "").trim() || null;
  const endsQuestionnaireOnNo = formData.get("endsQuestionnaireOnNo") === "on";

  const section = await prisma.questionnaireSection.findUnique({ where: { id: sectionId } });
  if (!section) return { error: "Section not found." };

  const maxOrder = await prisma.question.aggregate({
    where: { sectionId },
    _max: { sortOrder: true },
  });

  await prisma.question.create({
    data: {
      questionnaireId: section.questionnaireId,
      sectionId,
      parentQuestionId,
      text,
      type,
      endsQuestionnaireOnNo: type === QuestionType.YES_NO ? endsQuestionnaireOnNo : false,
      sortOrder: (maxOrder._max.sortOrder ?? -1) + 1,
    },
  });
  revalidateQuestionnaireAdmin();
  return {};
}

export async function moveQuestion(formData: FormData): Promise<{ error?: string }> {
  await requireMeavoAccess();
  const id = String(formData.get("id") ?? "");
  const direction = formData.get("direction") === "down" ? "down" : "up";
  if (!id) return { error: "Question not found." };

  const question = await prisma.question.findUnique({ where: { id } });
  if (!question?.sectionId) return { error: "Question not found." };

  const questions = await prisma.question.findMany({
    where: { sectionId: question.sectionId },
    orderBy: { sortOrder: "asc" },
  });

  const pair = findSwapPartner(questions, id, direction);
  if (!pair) return {};

  await prisma.$transaction([
    prisma.question.update({
      where: { id: pair.current.id },
      data: { sortOrder: pair.other.sortOrder },
    }),
    prisma.question.update({
      where: { id: pair.other.id },
      data: { sortOrder: pair.current.sortOrder },
    }),
  ]);
  revalidateQuestionnaireAdmin();
  return {};
}

export async function deleteQuestion(formData: FormData): Promise<{ error?: string }> {
  await requireMeavoAccess();
  const id = String(formData.get("id") ?? "");
  if (!id) return { error: "Question not found." };
  await prisma.question.delete({ where: { id } });
  revalidateQuestionnaireAdmin();
  return {};
}

export async function toggleQuestionnairePublished(
  formData: FormData,
): Promise<{ error?: string }> {
  await requireMeavoAccess();
  const questionnaire = await getOrCreateQuestionnaire();
  const publish = formData.get("publish") === "true";
  await prisma.questionnaire.update({
    where: { id: questionnaire.id },
    data: { isPublished: publish },
  });
  revalidateQuestionnaireAdmin();
  return {};
}

async function getOrCreateQuestionnaire() {
  const existing = await prisma.questionnaire.findFirst({
    orderBy: { createdAt: "asc" },
  });
  if (existing) return existing;
  return prisma.questionnaire.create({ data: { isPublished: false } });
}
