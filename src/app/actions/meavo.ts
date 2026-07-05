"use server";

import { QuestionType } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireMeavoAccess } from "@/lib/meavo-auth";
import { hashSecret } from "@/lib/password";
import { importAssembliesFromSheet } from "@/lib/sheets-import";
import { slugifyPartnerName } from "@/lib/slug";
import { migrateOrphanQuestions } from "@/lib/questionnaire-db";
import { revalidateQuestionnaireAdmin } from "@/lib/questionnaire-revalidate";
import {
  markQuestionTranslationsStale,
  markSectionTranslationsStale,
} from "@/lib/questionnaire-translation-status";

export async function refreshFromSheet(): Promise<void> {
  await requireMeavoAccess();
  await importAssembliesFromSheet();
  revalidatePath("/");
  revalidatePath("/partners");
}

const MIN_ACCESS_CODE_LENGTH = 8;

export async function setPartnerAccessCode(formData: FormData): Promise<void> {
  await requireMeavoAccess();
  const partnerId = String(formData.get("partnerId") ?? "");
  const code = String(formData.get("code") ?? "").trim();
  if (!partnerId) return;
  if (code && code.length < MIN_ACCESS_CODE_LENGTH) return;

  await prisma.assemblyPartner.update({
    where: { id: partnerId },
    data: {
      ...(code ? { codeHash: await hashSecret(code) } : {}),
      isActive: true,
    },
  });
  revalidatePath("/partners");
}

export async function updatePartnerSlug(formData: FormData): Promise<void> {
  await requireMeavoAccess();
  const partnerId = String(formData.get("partnerId") ?? "");
  const slug = slugifyPartnerName(String(formData.get("slug") ?? ""));
  if (!partnerId || !slug) return;

  await prisma.assemblyPartner.update({
    where: { id: partnerId },
    data: { slug },
  });
  revalidatePath("/partners");
}

export async function updatePartnerEmail(formData: FormData): Promise<void> {
  await requireMeavoAccess();
  const partnerId = String(formData.get("partnerId") ?? "");
  const email = String(formData.get("email") ?? "").trim();
  if (!partnerId) return;

  await prisma.assemblyPartner.update({
    where: { id: partnerId },
    data: { email: email || null },
  });
  revalidatePath("/partners");
}

export async function createPartner(formData: FormData): Promise<void> {
  await requireMeavoAccess();
  const name = String(formData.get("name") ?? "").trim();
  const code = String(formData.get("code") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  if (!name) return;
  if (code && code.length < MIN_ACCESS_CODE_LENGTH) return;

  const slugBase = slugifyPartnerName(name);
  let slug = slugBase;
  let suffix = 2;
  while (await prisma.assemblyPartner.findUnique({ where: { slug } })) {
    slug = `${slugBase}-${suffix}`;
    suffix += 1;
  }

  await prisma.assemblyPartner.create({
    data: {
      name,
      slug,
      email: email || null,
      codeHash: code ? await hashSecret(code) : null,
    },
  });
  revalidatePath("/partners");
}

function parseQuestionType(value: string): QuestionType {
  if (value === "TEXT") return QuestionType.TEXT;
  if (value === "YES_NO") return QuestionType.YES_NO;
  return QuestionType.CHECKBOX;
}

export async function addSection(formData: FormData): Promise<void> {
  await requireMeavoAccess();
  const title = String(formData.get("title") ?? "").trim();
  if (!title) return;

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
}

export async function updateSectionTitle(formData: FormData): Promise<void> {
  await requireMeavoAccess();
  const id = String(formData.get("id") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  if (!id || !title) return;

  const section = await prisma.questionnaireSection.findUnique({ where: { id } });
  if (!section || section.title === title) return;

  await prisma.questionnaireSection.update({
    where: { id },
    data: { title },
  });
  await markSectionTranslationsStale(id);
  revalidateQuestionnaireAdmin();
}

export async function updateQuestionText(formData: FormData): Promise<void> {
  await requireMeavoAccess();
  const id = String(formData.get("id") ?? "");
  const text = String(formData.get("text") ?? "").trim();
  if (!id || !text) return;

  const question = await prisma.question.findUnique({ where: { id } });
  if (!question || question.text === text) return;

  await prisma.question.update({
    where: { id },
    data: { text },
  });
  await markQuestionTranslationsStale(id);
  revalidateQuestionnaireAdmin();
}

export async function deleteSection(formData: FormData): Promise<void> {
  await requireMeavoAccess();
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  await prisma.questionnaireSection.delete({ where: { id } });
  revalidateQuestionnaireAdmin();
}

export async function moveSection(formData: FormData): Promise<void> {
  await requireMeavoAccess();
  const id = String(formData.get("id") ?? "");
  const direction = formData.get("direction") === "down" ? "down" : "up";
  if (!id) return;

  const section = await prisma.questionnaireSection.findUnique({ where: { id } });
  if (!section) return;

  const sections = await prisma.questionnaireSection.findMany({
    where: { questionnaireId: section.questionnaireId },
    orderBy: { sortOrder: "asc" },
  });

  const index = sections.findIndex((s) => s.id === id);
  const swapIndex = direction === "up" ? index - 1 : index + 1;
  if (index < 0 || swapIndex < 0 || swapIndex >= sections.length) return;

  const other = sections[swapIndex];
  await prisma.$transaction([
    prisma.questionnaireSection.update({ where: { id }, data: { sortOrder: other.sortOrder } }),
    prisma.questionnaireSection.update({ where: { id: other.id }, data: { sortOrder: section.sortOrder } }),
  ]);
  revalidateQuestionnaireAdmin();
}

export async function addQuestion(formData: FormData): Promise<void> {
  await requireMeavoAccess();
  const text = String(formData.get("text") ?? "").trim();
  const sectionId = String(formData.get("sectionId") ?? "");
  if (!text || !sectionId) return;

  const type = parseQuestionType(String(formData.get("type") ?? "CHECKBOX"));
  const parentQuestionId = String(formData.get("parentQuestionId") ?? "").trim() || null;
  const endsQuestionnaireOnNo = formData.get("endsQuestionnaireOnNo") === "on";

  const section = await prisma.questionnaireSection.findUnique({ where: { id: sectionId } });
  if (!section) return;

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
}

export async function moveQuestion(formData: FormData): Promise<void> {
  await requireMeavoAccess();
  const id = String(formData.get("id") ?? "");
  const direction = formData.get("direction") === "down" ? "down" : "up";
  if (!id) return;

  const question = await prisma.question.findUnique({ where: { id } });
  if (!question?.sectionId) return;

  const questions = await prisma.question.findMany({
    where: { sectionId: question.sectionId },
    orderBy: { sortOrder: "asc" },
  });

  const index = questions.findIndex((q) => q.id === id);
  const swapIndex = direction === "up" ? index - 1 : index + 1;
  if (index < 0 || swapIndex < 0 || swapIndex >= questions.length) return;

  const other = questions[swapIndex];
  await prisma.$transaction([
    prisma.question.update({ where: { id }, data: { sortOrder: other.sortOrder } }),
    prisma.question.update({ where: { id: other.id }, data: { sortOrder: question.sortOrder } }),
  ]);
  revalidateQuestionnaireAdmin();
}

export async function deleteQuestion(formData: FormData): Promise<void> {
  await requireMeavoAccess();
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  await prisma.question.delete({ where: { id } });
  revalidateQuestionnaireAdmin();
}

export async function toggleQuestionnairePublished(formData: FormData): Promise<void> {
  await requireMeavoAccess();
  const questionnaire = await getOrCreateQuestionnaire();
  const publish = formData.get("publish") === "true";
  await prisma.questionnaire.update({
    where: { id: questionnaire.id },
    data: { isPublished: publish },
  });
  revalidateQuestionnaireAdmin();
}

async function getOrCreateQuestionnaire() {
  const existing = await prisma.questionnaire.findFirst({
    orderBy: { createdAt: "asc" },
  });
  if (existing) {
    await migrateOrphanQuestions(existing.id);
    return existing;
  }
  return prisma.questionnaire.create({ data: { isPublished: false } });
}
