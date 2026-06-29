"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { SubmissionStatus } from "@prisma/client";
import { put } from "@vercel/blob";
import { prisma } from "@/lib/prisma";
import { verifySecret } from "@/lib/password";
import { setPartnerSession, clearPartnerSession, requirePartnerSession } from "@/lib/partner-session";

export async function partnerLogin(slug: string, formData: FormData): Promise<{ error?: string }> {
  const code = String(formData.get("code") ?? "").trim();
  const partner = await prisma.assemblyPartner.findFirst({
    where: { slug, isActive: true },
  });

  if (!partner?.codeHash) {
    return { error: "Access is not configured for this partner. Contact MEAVO." };
  }

  const valid = await verifySecret(code, partner.codeHash);
  if (!valid) return { error: "Invalid access code." };

  await setPartnerSession(partner.id);
  revalidatePath(`/${slug}`);
  redirect(`/${slug}`);
}

export async function partnerLogout(slug: string): Promise<void> {
  await clearPartnerSession();
  redirect(`/${slug}`);
}

async function requirePartnerAssembly(slug: string, dealId: string) {
  const partner = await requirePartnerSession(slug);
  if (!partner) throw new Error("Unauthorized");

  const assembly = await prisma.assembly.findFirst({
    where: { dealId, installPartnerId: partner.id },
  });
  if (!assembly) throw new Error("Assembly not found");

  return { partner, assembly };
}

export async function saveQuestionAnswer(
  slug: string,
  dealId: string,
  questionId: string,
  answer: { checked?: boolean; textAnswer?: string; yesNoAnswer?: boolean },
): Promise<void> {
  const { partner, assembly } = await requirePartnerAssembly(slug, dealId);

  const submission = await prisma.questionnaireSubmission.upsert({
    where: { assemblyId_partnerId: { assemblyId: assembly.id, partnerId: partner.id } },
    create: {
      assemblyId: assembly.id,
      partnerId: partner.id,
      status: SubmissionStatus.IN_PROGRESS,
    },
    update: {},
  });
  if (submission.status === SubmissionStatus.SUBMITTED) {
    throw new Error("Questionnaire already submitted");
  }

  const data =
    answer.yesNoAnswer !== undefined
      ? { yesNoAnswer: answer.yesNoAnswer, checked: false, textAnswer: "" }
      : answer.textAnswer !== undefined
        ? { textAnswer: answer.textAnswer.trim(), checked: false, yesNoAnswer: null }
        : { checked: answer.checked ?? false, yesNoAnswer: null };

  await prisma.questionAnswer.upsert({
    where: {
      submissionId_questionId: { submissionId: submission.id, questionId },
    },
    create: { submissionId: submission.id, questionId, ...data },
    update: data,
  });
}

export async function uploadSubmissionPhotos(
  slug: string,
  dealId: string,
  formData: FormData,
): Promise<{ error?: string }> {
  let partnerAssembly: Awaited<ReturnType<typeof requirePartnerAssembly>>;
  try {
    partnerAssembly = await requirePartnerAssembly(slug, dealId);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unauthorized";
    return { error: message };
  }
  const { partner, assembly } = partnerAssembly;

  const submission = await prisma.questionnaireSubmission.upsert({
    where: { assemblyId_partnerId: { assemblyId: assembly.id, partnerId: partner.id } },
    create: {
      assemblyId: assembly.id,
      partnerId: partner.id,
      status: SubmissionStatus.IN_PROGRESS,
    },
    update: {},
  });
  if (submission.status === SubmissionStatus.SUBMITTED) {
    return { error: "Questionnaire already submitted." };
  }

  const files = formData.getAll("photos").filter((f): f is File => f instanceof File && f.size > 0);
  if (files.length === 0) return { error: "Please select at least one photo." };

  const existingCount = await prisma.submissionPhoto.count({ where: { submissionId: submission.id } });

  try {
    for (let i = 0; i < files.length; i += 1) {
      const file = files[i];
      const blob = await put(`assembly/${assembly.dealId}/${file.name}`, file, {
        access: "private",
        addRandomSuffix: true,
      });
      await prisma.submissionPhoto.create({
        data: {
          submissionId: submission.id,
          storageKey: blob.pathname,
          fileName: file.name,
          sortOrder: existingCount + i,
        },
      });
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Photo upload failed.";
    return { error: message };
  }

  revalidatePath(`/${slug}/${dealId}`);
  return {};
}

export async function submitQuestionnaire(slug: string, dealId: string): Promise<void> {
  const { partner, assembly } = await requirePartnerAssembly(slug, dealId);

  await prisma.questionnaireSubmission.upsert({
    where: { assemblyId_partnerId: { assemblyId: assembly.id, partnerId: partner.id } },
    create: {
      assemblyId: assembly.id,
      partnerId: partner.id,
      status: SubmissionStatus.SUBMITTED,
      submittedAt: new Date(),
    },
    update: {
      status: SubmissionStatus.SUBMITTED,
      submittedAt: new Date(),
    },
  });

  revalidatePath(`/${slug}`);
  redirect(`/${slug}`);
}
