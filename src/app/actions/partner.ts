"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { SubmissionStatus } from "@prisma/client";
import { put } from "@vercel/blob";
import { prisma } from "@/lib/prisma";
import { verifySecret } from "@/lib/password";
import { setPartnerSession, clearPartnerSession, requirePartnerSession } from "@/lib/partner-session";
import {
  clearLoginThrottle,
  isLoginThrottled,
  recordLoginFailure,
  THROTTLE_ERROR,
} from "@/lib/login-throttle";
import {
  MAX_SUBMISSION_PHOTOS,
  MAX_UPLOAD_PHOTO_BYTES,
  MAX_UPLOAD_PHOTO_ERROR,
} from "@/lib/upload-limits";
import { enqueueNotification } from "@/lib/notifications/enqueue";

async function requireAuthenticatedPartner(slug: string) {
  const partner = await requirePartnerSession(slug);
  if (!partner) throw new Error("Unauthorized");
  return partner;
}

async function findSubmission(assemblyId: string, partnerId: string) {
  return prisma.questionnaireSubmission.findUnique({
    where: { assemblyId_partnerId: { assemblyId, partnerId } },
    select: { id: true, status: true },
  });
}

export async function partnerLogin(slug: string, formData: FormData): Promise<{ error?: string }> {
  const code = String(formData.get("code") ?? "").trim();

  const throttleKey = `assembly-partner:${slug}`;
  if (await isLoginThrottled(throttleKey)) {
    return { error: THROTTLE_ERROR };
  }

  const partner = await prisma.assemblyPartner.findFirst({
    where: { slug, isActive: true },
  });

  if (!partner?.codeHash) {
    return { error: "Access is not configured for this partner. Contact MEAVO." };
  }

  const valid = await verifySecret(code, partner.codeHash);
  if (!valid) {
    await recordLoginFailure(throttleKey);
    return { error: "Invalid access code." };
  }

  await clearLoginThrottle(throttleKey);
  await setPartnerSession(partner.id);
  revalidatePath(`/${slug}`);
  redirect(`/${slug}`);
}

export async function partnerLogout(slug: string): Promise<void> {
  await clearPartnerSession();
  redirect(`/${slug}`);
}

export async function saveQuestionAnswer(
  slug: string,
  dealId: string,
  questionId: string,
  answer: { checked?: boolean; textAnswer?: string; yesNoAnswer?: boolean },
): Promise<void> {
  const partner = await requireAuthenticatedPartner(slug);

  const assembly = await prisma.assembly.findFirst({
    where: { dealId, installPartnerId: partner.id },
  });
  if (!assembly) throw new Error("Assembly not found");

  const existing = await findSubmission(assembly.id, partner.id);
  if (existing?.status === SubmissionStatus.SUBMITTED) {
    throw new Error("Questionnaire has already been submitted and can no longer be changed.");
  }

  const question = await prisma.question.findFirst({
    where: { id: questionId, questionnaire: { isPublished: true } },
    select: { id: true },
  });
  if (!question) throw new Error("Question not found");

  const submission = await prisma.questionnaireSubmission.upsert({
    where: { assemblyId_partnerId: { assemblyId: assembly.id, partnerId: partner.id } },
    create: {
      assemblyId: assembly.id,
      partnerId: partner.id,
      status: SubmissionStatus.IN_PROGRESS,
    },
    update: {
      status: SubmissionStatus.IN_PROGRESS,
    },
  });

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
  let partner;
  try {
    partner = await requireAuthenticatedPartner(slug);
  } catch {
    return { error: "Unauthorized." };
  }

  const assembly = await prisma.assembly.findFirst({
    where: { dealId, installPartnerId: partner.id },
  });
  if (!assembly) return { error: "Assembly not found." };

  const existing = await findSubmission(assembly.id, partner.id);
  if (existing?.status === SubmissionStatus.SUBMITTED) {
    return { error: "Questionnaire has already been submitted and can no longer be changed." };
  }

  const submission = await prisma.questionnaireSubmission.upsert({
    where: { assemblyId_partnerId: { assemblyId: assembly.id, partnerId: partner.id } },
    create: {
      assemblyId: assembly.id,
      partnerId: partner.id,
      status: SubmissionStatus.IN_PROGRESS,
    },
    update: {},
  });

  const files = formData.getAll("photos").filter((f): f is File => f instanceof File && f.size > 0);
  if (files.length === 0) return { error: "Please select at least one photo." };

  const nonImage = files.find((f) => !f.type.startsWith("image/"));
  if (nonImage) return { error: "Only image files can be uploaded." };

  const oversized = files.find((f) => f.size > MAX_UPLOAD_PHOTO_BYTES);
  if (oversized) return { error: MAX_UPLOAD_PHOTO_ERROR };

  const existingCount = await prisma.submissionPhoto.count({ where: { submissionId: submission.id } });
  if (existingCount + files.length > MAX_SUBMISSION_PHOTOS) {
    return {
      error: `A submission can have at most ${MAX_SUBMISSION_PHOTOS} photos (${existingCount} already uploaded).`,
    };
  }

  try {
    for (let i = 0; i < files.length; i += 1) {
      const file = files[i];
      const blob = await put(`assembly/${assembly.dealId}/${file.name}`, file, {
        access: "private",
        addRandomSuffix: true,
        contentType: file.type || "image/jpeg",
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
  const partner = await requireAuthenticatedPartner(slug);

  const assembly = await prisma.assembly.findFirst({
    where: { dealId, installPartnerId: partner.id },
  });
  if (!assembly) throw new Error("Assembly not found");

  const existing = await findSubmission(assembly.id, partner.id);
  if (existing?.status === SubmissionStatus.SUBMITTED) {
    // Idempotent: already submitted, don't overwrite submittedAt or re-notify.
    redirect(`/${slug}`);
  }

  const submission = await prisma.questionnaireSubmission.upsert({
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

  const partnerRecord = await prisma.assemblyPartner.findUnique({
    where: { id: partner.id },
    select: { name: true },
  });

  void enqueueNotification({
    sourceApp: "assembly",
    eventType: "assembly.questionnaire.submitted",
    idempotencyKey: `assembly:questionnaire:submitted:${submission.id}`,
    payload: {
      submissionId: submission.id,
      dealId: assembly.dealId,
      assemblyId: assembly.id,
      partnerName: partnerRecord?.name ?? slug,
      clientName: assembly.clientName,
    },
  }).catch((error) => {
    console.error("Notification enqueue failed:", error);
  });

  revalidatePath(`/${slug}`);
  redirect(`/${slug}`);
}
