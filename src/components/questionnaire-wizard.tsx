"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { QuestionnaireLocale } from "@prisma/client";
import {
  type AnswerRecord,
  type SectionRecord,
  buildWizardSteps,
  isStepComplete,
} from "@/lib/questionnaire";
import { getQuestionnaireUiCopy } from "@/lib/questionnaire-ui";
import { saveQuestionAnswer, submitQuestionnaire, uploadSubmissionPhotos } from "@/app/actions/partner";
import { MAX_SOURCE_PHOTO_BYTES, MAX_SOURCE_PHOTO_ERROR } from "@/lib/upload-limits";
import { QuestionnaireLanguagePicker } from "@/components/questionnaire-language-picker";
import { Button, Card } from "@/components/ui";

export function QuestionnaireWizard({
  slug,
  dealId,
  sections,
  initialAnswers = {},
  hasPhotos = false,
  isSubmitted = false,
  preview = false,
  locale = QuestionnaireLocale.EN,
  availableLocales = [QuestionnaireLocale.EN],
}: {
  slug?: string;
  dealId?: string;
  sections: SectionRecord[];
  initialAnswers?: Record<string, AnswerRecord>;
  hasPhotos?: boolean;
  isSubmitted?: boolean;
  preview?: boolean;
  locale?: QuestionnaireLocale;
  availableLocales?: QuestionnaireLocale[];
}) {
  const ui = getQuestionnaireUiCopy(locale);
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState(initialAnswers);
  const [pending, startTransition] = useTransition();
  const [compressing, setCompressing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadedCount, setUploadedCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [previewComplete, setPreviewComplete] = useState(false);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [failedSave, setFailedSave] = useState<{
    questionId: string;
    answer: Parameters<typeof saveQuestionAnswer>[3];
  } | null>(null);

  const steps = useMemo(() => buildWizardSteps(sections, answers), [sections, answers]);
  const currentStep = steps[step];
  const totalSteps = steps.length;

  useEffect(() => {
    setStep((s) => Math.min(s, Math.max(steps.length - 1, 0)));
  }, [steps.length]);

  function completePreview() {
    setPreviewComplete(true);
  }

  function restartPreview() {
    setAnswers({});
    setStep(0);
    setPreviewComplete(false);
    setError(null);
  }

  function persistAnswer(questionId: string, answer: Parameters<typeof saveQuestionAnswer>[3]) {
    if (preview || !slug || !dealId) return;
    setSaveState("saving");
    startTransition(async () => {
      try {
        const result = await saveQuestionAnswer(slug, dealId, questionId, answer);
        if (result?.error) throw new Error(result.error);
        setSaveState("saved");
        setFailedSave(null);
      } catch {
        setSaveState("error");
        setFailedSave({ questionId, answer });
      }
    });
  }

  function retryFailedSave() {
    if (!failedSave) return;
    persistAnswer(failedSave.questionId, failedSave.answer);
  }

  const saveIndicator =
    preview || saveState === "idle" ? null : (
      <div aria-live="polite" className="mb-3 text-center text-xs">
        {saveState === "saving" && <span className="text-slate-500">{ui.saving}</span>}
        {saveState === "saved" && <span className="text-emerald-600">{ui.saved}</span>}
        {saveState === "error" && (
          <span className="text-red-600">
            {ui.saveFailed}{" "}
            <button type="button" className="font-medium underline" onClick={retryFailedSave}>
              {ui.retrySave}
            </button>
          </span>
        )}
      </div>
    );

  if (previewComplete) {
    return (
      <Card className="text-center">
        <p className="text-lg font-medium text-slate-900">{ui.previewCompleteTitle}</p>
        <p className="mt-2 text-sm text-slate-600">{ui.previewCompleteBody}</p>
        <Button type="button" className="mt-4" onClick={restartPreview}>
          {ui.startOver}
        </Button>
      </Card>
    );
  }

  if (isSubmitted && !preview) {
    return (
      <Card className="text-center">
        <p className="text-lg font-medium text-slate-900">{ui.submittedTitle}</p>
        <p className="mt-2 text-sm text-slate-600">{ui.submittedBody}</p>
      </Card>
    );
  }

  if (!sections.length) {
    return (
      <Card>
        <p className="text-sm text-slate-600">
          {preview ? ui.noSectionsPreview : ui.noSectionsPartner}
        </p>
      </Card>
    );
  }

  if (!currentStep) {
    return (
      <Card>
        <p className="text-sm text-slate-600">{ui.noSteps}</p>
      </Card>
    );
  }

  function goNext() {
    setStep((s) => Math.min(s + 1, steps.length - 1));
  }

  function goBack() {
    setStep((s) => Math.max(0, s - 1));
  }

  return (
    <div className="mx-auto w-full max-w-lg">
      {!preview && slug && dealId && (
        <QuestionnaireLanguagePicker
          slug={slug}
          dealId={dealId}
          locale={locale}
          availableLocales={availableLocales}
          label={ui.languageLabel}
        />
      )}

      {preview && (
        <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {ui.previewBanner}
        </div>
      )}

      <p className="mb-4 text-center text-sm text-slate-500">
        {ui.step(step + 1, totalSteps)}
      </p>

      {saveIndicator}

      {error && currentStep.kind !== "photos" && (
        <p className="mb-3 text-center text-sm text-red-600">{error}</p>
      )}

      {currentStep.kind === "section" && (
        <Card>
          <p className="text-lg font-medium text-slate-900">{currentStep.title}</p>
          <div className="mt-4 space-y-3">
            {currentStep.questions.map((question) => (
              <label
                key={question.id}
                className="flex cursor-pointer items-start gap-3 rounded-lg border border-slate-200 p-4"
              >
                <input
                  type="checkbox"
                  className="mt-0.5 h-6 w-6 shrink-0 rounded border-slate-300"
                  checked={answers[question.id]?.checked ?? false}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    setAnswers((prev) => ({
                      ...prev,
                      [question.id]: {
                        checked,
                        text: prev[question.id]?.text ?? "",
                        yesNo: prev[question.id]?.yesNo ?? null,
                      },
                    }));
                    persistAnswer(question.id, { checked });
                  }}
                />
                <span className="text-base text-slate-700">{question.text}</span>
              </label>
            ))}
          </div>
          <div className="mt-6 flex gap-3">
            <Button type="button" variant="secondary" className="flex-1" disabled={step === 0} onClick={goBack}>
              {ui.back}
            </Button>
            <Button
              type="button"
              className="flex-1"
              disabled={!isStepComplete(currentStep, answers) || pending}
              onClick={goNext}
            >
              {ui.next}
            </Button>
          </div>
        </Card>
      )}

      {currentStep.kind === "yes_no" && (
        <Card>
          <p className="text-lg font-medium text-slate-900">{currentStep.question.text}</p>
          <div className="mt-6 grid grid-cols-2 gap-3">
            {[
              { label: ui.yes, value: true },
              { label: ui.no, value: false },
            ].map((option) => {
              const selected = answers[currentStep.question.id]?.yesNo === option.value;
              return (
                <button
                  key={option.label}
                  type="button"
                  aria-pressed={selected}
                  className={`rounded-lg border px-4 py-3 text-base font-medium transition ${
                    selected
                      ? "border-brand-600 bg-brand-50 text-brand-800"
                      : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                  }`}
                  onClick={() => {
                    setAnswers((prev) => ({
                      ...prev,
                      [currentStep.question.id]: {
                        checked: false,
                        text: "",
                        yesNo: option.value,
                      },
                    }));
                    persistAnswer(currentStep.question.id, { yesNoAnswer: option.value });
                  }}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
          <div className="mt-6 flex gap-3">
            <Button type="button" variant="secondary" className="flex-1" disabled={step === 0} onClick={goBack}>
              {ui.back}
            </Button>
            <Button
              type="button"
              className="flex-1"
              disabled={!isStepComplete(currentStep, answers) || pending}
              onClick={() => {
                const answer = answers[currentStep.question.id];
                if (answer?.yesNo === false && currentStep.question.endsQuestionnaireOnNo) {
                  if (preview) {
                    completePreview();
                    return;
                  }
                  setError(null);
                  startTransition(async () => {
                    if (slug && dealId) {
                      const result = await submitQuestionnaire(slug, dealId);
                      if (result?.error) setError(result.error);
                    }
                  });
                  return;
                }
                goNext();
              }}
            >
              {answers[currentStep.question.id]?.yesNo === false &&
              currentStep.question.endsQuestionnaireOnNo
                ? preview
                  ? ui.finishPreview
                  : ui.finish
                : ui.next}
            </Button>
          </div>
        </Card>
      )}

      {currentStep.kind === "follow_up" && (
        <Card>
          <p className="text-lg font-medium text-slate-900">{currentStep.question.text}</p>
          <textarea
            className="mt-6 w-full rounded-lg border border-slate-300 px-3 py-2 text-base focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
            rows={4}
            placeholder={ui.followUpPlaceholder}
            value={answers[currentStep.question.id]?.text ?? ""}
            onChange={(e) => {
              const text = e.target.value;
              setAnswers((prev) => ({
                ...prev,
                [currentStep.question.id]: {
                  checked: false,
                  text,
                  yesNo: null,
                },
              }));
            }}
            onBlur={(e) => {
              persistAnswer(currentStep.question.id, { textAnswer: e.target.value });
            }}
          />
          <div className="mt-6 flex gap-3">
            <Button type="button" variant="secondary" className="flex-1" onClick={goBack}>
              {ui.back}
            </Button>
            <Button
              type="button"
              className="flex-1"
              disabled={!isStepComplete(currentStep, answers) || pending}
              onClick={() => {
                const text = answers[currentStep.question.id]?.text ?? "";
                if (preview) {
                  setAnswers((prev) => ({
                    ...prev,
                    [currentStep.question.id]: {
                      checked: false,
                      text,
                      yesNo: null,
                    },
                  }));
                  goNext();
                  return;
                }
                startTransition(async () => {
                  if (slug && dealId) {
                    const result = await saveQuestionAnswer(slug, dealId, currentStep.question.id, {
                      textAnswer: text,
                    });
                    if (result?.error) {
                      setSaveState("error");
                      setFailedSave({
                        questionId: currentStep.question.id,
                        answer: { textAnswer: text },
                      });
                      return;
                    }
                  }
                  goNext();
                });
              }}
            >
              {ui.next}
            </Button>
          </div>
        </Card>
      )}

      {currentStep.kind === "photos" && (
        <Card>
          <p className="text-lg font-medium text-slate-900">{ui.photosTitle}</p>
          <p className="mt-2 text-sm text-slate-600">{ui.photosDescription}</p>

          {preview ? (
            <div className="mt-4 space-y-4">
              <input
                type="file"
                accept="image/*"
                capture="environment"
                multiple
                className="block w-full text-sm"
                disabled
              />
              <p className="text-xs text-slate-500">{ui.photosDisabledPreview}</p>
              <div className="flex gap-3">
                <Button type="button" variant="secondary" className="flex-1" onClick={goBack}>
                  {ui.back}
                </Button>
                <Button type="button" className="flex-1" onClick={completePreview}>
                  {ui.completePreview}
                </Button>
              </div>
            </div>
          ) : (
            <div className="mt-4 space-y-4">
              <form
                id="photo-upload-form"
                className="space-y-4"
                action={async (formData) => {
                  setError(null);
                  if (!slug || !dealId) return;

                  const files = formData
                    .getAll("photos")
                    .filter((f): f is File => f instanceof File && f.size > 0);
                  if (files.length === 0) return;
                  if (files.some((f) => f.size > MAX_SOURCE_PHOTO_BYTES)) {
                    setError(MAX_SOURCE_PHOTO_ERROR);
                    return;
                  }

                  setCompressing(true);
                  let compressedFiles: File[];
                  // Loaded on demand so browser-image-compression stays out of
                  // the wizard's initial bundle.
                  const { COMPRESS_PHOTO_ERROR, compressPhotoForUpload } = await import(
                    "@/lib/compress-photo"
                  );
                  try {
                    compressedFiles = await Promise.all(files.map(compressPhotoForUpload));
                  } catch {
                    setError(COMPRESS_PHOTO_ERROR);
                    return;
                  } finally {
                    setCompressing(false);
                  }

                  const compressedFormData = new FormData();
                  for (const file of compressedFiles) {
                    compressedFormData.append("photos", file);
                  }

                  setUploading(true);
                  try {
                    const upload = await uploadSubmissionPhotos(slug, dealId, compressedFormData);
                    if (upload.error) {
                      setError(upload.error);
                      return;
                    }
                    setUploadedCount((count) => count + compressedFiles.length);
                    (document.getElementById("photo-upload-form") as HTMLFormElement)?.reset();
                  } finally {
                    setUploading(false);
                  }
                }}
              >
                <label className="block space-y-1 text-sm">
                  <span className="font-medium text-slate-700">{ui.photosTitle}</span>
                  <input
                    name="photos"
                    type="file"
                    accept="image/*"
                    capture="environment"
                    multiple
                    className="block w-full text-sm"
                  />
                </label>
                <p className="text-xs text-slate-500">{ui.photosCompressHint}</p>
                {(hasPhotos || uploadedCount > 0) && (
                  <p className="text-xs text-slate-500">
                    {uploadedCount > 0 && `${ui.photosUploaded(uploadedCount)} `}
                    {ui.photosAddMore}
                  </p>
                )}
                <Button
                  type="submit"
                  variant="secondary"
                  className="w-full"
                  disabled={compressing || uploading}
                >
                  {compressing ? ui.compressing : uploading ? ui.uploading : ui.uploadPhotos}
                </Button>
              </form>

              {!hasPhotos && uploadedCount === 0 && (
                <p className="text-xs text-slate-500">{ui.photosRequired}</p>
              )}
              {error && <p className="text-sm text-red-600">{error}</p>}

              <div className="flex gap-3">
                <Button type="button" variant="secondary" className="flex-1" onClick={goBack}>
                  {ui.back}
                </Button>
                <Button
                  type="button"
                  className="flex-1"
                  disabled={
                    compressing || uploading || pending || (!hasPhotos && uploadedCount === 0)
                  }
                  onClick={() => {
                    setError(null);
                    startTransition(async () => {
                      if (slug && dealId) {
                        const result = await submitQuestionnaire(slug, dealId);
                        if (result?.error) setError(result.error);
                      }
                    });
                  }}
                >
                  {pending ? ui.submitting : ui.submit}
                </Button>
              </div>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
