"use client";

import { useState, useTransition } from "react";
import { QuestionnaireLocale } from "@prisma/client";
import {
  approveLocaleTranslations,
  generateQuestionnaireTranslations,
  saveLocaleTranslations,
} from "@/app/actions/questionnaire-translations";
import { LOCALE_NAMES } from "@/lib/questionnaire-locales";
import type { LocaleTranslationBundle } from "@/lib/questionnaire-translation-status";
import { Button, Card } from "@/components/ui";

const STATUS_STYLES: Record<LocaleTranslationBundle["status"], string> = {
  not_generated: "bg-slate-100 text-slate-600",
  draft: "bg-amber-50 text-amber-800",
  stale: "bg-orange-50 text-orange-800",
  approved: "bg-green-50 text-green-800",
};

const STATUS_LABELS: Record<LocaleTranslationBundle["status"], string> = {
  not_generated: "Not generated",
  draft: "Draft",
  stale: "Stale",
  approved: "Approved",
};

export function QuestionnaireTranslationsPanel({
  bundles,
  hasContent,
}: {
  bundles: LocaleTranslationBundle[];
  hasContent: boolean;
}) {
  const [activeLocale, setActiveLocale] = useState<QuestionnaireLocale>(QuestionnaireLocale.DE);
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [isGenerating, startGenerate] = useTransition();

  const active = bundles.find((bundle) => bundle.locale === activeLocale) ?? bundles[0];
  if (!active) return null;

  function handleGenerate() {
    setGenerateError(null);
    startGenerate(async () => {
      const result = await generateQuestionnaireTranslations();
      if (!result.ok) {
        setGenerateError(result.error ?? "Generation failed.");
      }
    });
  }

  return (
    <Card className="mb-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="font-medium text-slate-900">Translations</h2>
          <p className="mt-1 text-sm text-slate-600">
            Generate AI drafts in German, French, Spanish, and Italian. Review, edit, and approve
            before partners can switch language.
          </p>
        </div>
        <Button type="button" onClick={handleGenerate} disabled={!hasContent || isGenerating}>
          {isGenerating ? "Generating…" : "Generate all languages"}
        </Button>
      </div>

      {generateError && <p className="mt-3 text-sm text-red-600">{generateError}</p>}

      <div className="mt-4 flex flex-wrap gap-2 border-b border-slate-100 pb-4">
        {bundles.map((bundle) => (
          <button
            key={bundle.locale}
            type="button"
            onClick={() => setActiveLocale(bundle.locale)}
            className={`inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium transition ${
              activeLocale === bundle.locale
                ? "bg-brand-600 text-white"
                : "bg-slate-100 text-slate-700 hover:bg-slate-200"
            }`}
          >
            {LOCALE_NAMES[bundle.locale]}
            <span
              className={`rounded px-1.5 py-0.5 text-xs ${
                activeLocale === bundle.locale ? "bg-white/20 text-white" : STATUS_STYLES[bundle.status]
              }`}
            >
              {STATUS_LABELS[bundle.status]}
            </span>
          </button>
        ))}
      </div>

      {active.status === "not_generated" ? (
        <p className="mt-4 text-sm text-slate-600">
          No {LOCALE_NAMES[active.locale]} translations yet. Click &quot;Generate all languages&quot; to
          create drafts for every target language.
        </p>
      ) : (
        <>
          {active.status === "stale" && (
            <p className="mt-4 rounded-lg border border-orange-200 bg-orange-50 px-4 py-3 text-sm text-orange-900">
              English source changed since these translations were last approved. Regenerate or edit,
              then approve again before partners see this language.
            </p>
          )}

          <form action={saveLocaleTranslations} className="mt-4 space-y-6">
            <input type="hidden" name="locale" value={active.locale} />

            <div className="space-y-4">
              <h3 className="text-sm font-medium text-slate-900">Section titles</h3>
              {active.sections.map((section) => (
                <div key={section.id} className="rounded-lg border border-slate-100 p-4">
                  <p className="text-xs text-slate-500">English</p>
                  <p className="text-sm font-medium text-slate-900">{section.enTitle}</p>
                  <label className="mt-3 block text-sm">
                    <span className="font-medium text-slate-700">{LOCALE_NAMES[active.locale]}</span>
                    <input
                      name={`section_${section.id}`}
                      defaultValue={section.title}
                      required
                      className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
                    />
                  </label>
                </div>
              ))}
            </div>

            <div className="space-y-4">
              <h3 className="text-sm font-medium text-slate-900">Questions</h3>
              {active.questions.map((question) => (
                <div key={question.id} className="rounded-lg border border-slate-100 p-4">
                  <p className="text-xs text-slate-500">English</p>
                  <p className="text-sm font-medium text-slate-900">{question.enText}</p>
                  <label className="mt-3 block text-sm">
                    <span className="font-medium text-slate-700">{LOCALE_NAMES[active.locale]}</span>
                    <textarea
                      name={`question_${question.id}`}
                      defaultValue={question.text}
                      required
                      rows={2}
                      className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
                    />
                  </label>
                </div>
              ))}
            </div>

            <Button type="submit">Save {LOCALE_NAMES[active.locale]} edits</Button>
          </form>

          <form action={approveLocaleTranslations} className="mt-4 border-t border-slate-100 pt-4">
            <input type="hidden" name="locale" value={active.locale} />
            <p className="mb-3 text-sm text-slate-600">
              Approving makes this language available in the partner questionnaire picker.
            </p>
            <Button type="submit" variant="secondary">
              Approve {LOCALE_NAMES[active.locale]} for partners
            </Button>
          </form>
        </>
      )}
    </Card>
  );
}
