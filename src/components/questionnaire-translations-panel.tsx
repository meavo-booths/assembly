"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { QuestionnaireLocale, TranslationStatus } from "@prisma/client";
import {
  approveLocaleTranslations,
  generateLocaleTranslations,
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

function countStaleItems(bundle: LocaleTranslationBundle) {
  const staleSections = bundle.sections.filter(
    (section) => section.rowStatus === TranslationStatus.STALE,
  ).length;
  const staleQuestions = bundle.questions.filter(
    (question) => question.rowStatus === TranslationStatus.STALE,
  ).length;
  return { staleSections, staleQuestions, total: staleSections + staleQuestions };
}

function staleSummary(bundle: LocaleTranslationBundle): string {
  const { staleSections, staleQuestions } = countStaleItems(bundle);
  const parts: string[] = [];
  if (staleSections > 0) {
    parts.push(`${staleSections} section${staleSections === 1 ? "" : "s"}`);
  }
  if (staleQuestions > 0) {
    parts.push(`${staleQuestions} question${staleQuestions === 1 ? "" : "s"}`);
  }
  return parts.join(" and ");
}

function sortStaleFirst<T extends { rowStatus: TranslationStatus | null }>(items: T[]): T[] {
  return [...items].sort((a, b) => {
    const aStale = a.rowStatus === TranslationStatus.STALE ? 0 : 1;
    const bStale = b.rowStatus === TranslationStatus.STALE ? 0 : 1;
    return aStale - bStale;
  });
}

function StaleBadge() {
  return (
    <span className="rounded-full bg-orange-100 px-2 py-0.5 text-xs font-medium text-orange-800">
      Stale — English changed
    </span>
  );
}

function itemCardClass(isStale: boolean) {
  return isStale
    ? "rounded-lg border border-orange-200 bg-orange-50/40 p-4"
    : "rounded-lg border border-slate-100 p-4";
}

export function QuestionnaireTranslationsPanel({
  bundles,
  hasContent,
}: {
  bundles: LocaleTranslationBundle[];
  hasContent: boolean;
}) {
  const router = useRouter();
  const [activeLocale, setActiveLocale] = useState<QuestionnaireLocale>(QuestionnaireLocale.DE);
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [regenerateError, setRegenerateError] = useState<string | null>(null);
  const [isGenerating, startGenerate] = useTransition();
  const [isRegenerating, startRegenerate] = useTransition();

  const active = bundles.find((bundle) => bundle.locale === activeLocale) ?? bundles[0];
  if (!active) return null;

  const staleItems = countStaleItems(active);
  const sortedSections = sortStaleFirst(active.sections);
  const sortedQuestions = sortStaleFirst(active.questions);

  function handleGenerate() {
    setGenerateError(null);
    startGenerate(async () => {
      const result = await generateQuestionnaireTranslations();
      if (!result.ok) {
        setGenerateError(result.error ?? "Generation failed.");
      } else {
        router.refresh();
      }
    });
  }

  function handleRegenerateLocale() {
    setRegenerateError(null);
    startRegenerate(async () => {
      const result = await generateLocaleTranslations(active.locale);
      if (!result.ok) {
        setRegenerateError(result.error ?? "Regeneration failed.");
      } else {
        router.refresh();
      }
    });
  }

  return (
    <Card>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Translations</h2>
          <p className="mt-1 text-sm text-slate-500">
            Generate AI drafts for all target languages. Review, edit, and approve
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
              {bundle.status === "stale"
                ? `Stale (${countStaleItems(bundle).total})`
                : STATUS_LABELS[bundle.status]}
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
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm font-medium text-slate-900">
              {LOCALE_NAMES[active.locale]} translations
            </p>
            <Button
              type="button"
              variant="secondary"
              onClick={handleRegenerateLocale}
              disabled={isRegenerating || isGenerating}
            >
              {isRegenerating ? "Regenerating…" : `Regenerate ${LOCALE_NAMES[active.locale]}`}
            </Button>
          </div>
          {regenerateError && <p className="mt-2 text-sm text-red-600">{regenerateError}</p>}

          {active.status === "stale" && (
            <p className="mt-4 rounded-lg border border-orange-200 bg-orange-50 px-4 py-3 text-sm text-orange-900">
              English changed for {staleSummary(active)}. Review the highlighted items below, then
              save and approve again before partners see this language.
            </p>
          )}

          <form action={saveLocaleTranslations} className="mt-4 space-y-6">
            <input type="hidden" name="locale" value={active.locale} />

            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-base font-semibold text-slate-900">Section titles</h3>
                {staleItems.staleSections > 0 && (
                  <p className="text-xs text-orange-800">
                    {staleItems.staleSections} stale section{staleItems.staleSections === 1 ? "" : "s"}
                  </p>
                )}
              </div>
              {sortedSections.map((section) => {
                const isStale = section.rowStatus === TranslationStatus.STALE;
                return (
                <div key={section.id} className={itemCardClass(isStale)}>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-xs text-slate-500">English</p>
                    {isStale && <StaleBadge />}
                  </div>
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
              );
              })}
            </div>

            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-base font-semibold text-slate-900">Questions</h3>
                {staleItems.staleQuestions > 0 && (
                  <p className="text-xs text-orange-800">
                    {staleItems.staleQuestions} stale question{staleItems.staleQuestions === 1 ? "" : "s"}
                  </p>
                )}
              </div>
              {sortedQuestions.map((question) => {
                const isStale = question.rowStatus === TranslationStatus.STALE;
                return (
                <div key={question.id} className={itemCardClass(isStale)}>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-xs text-slate-500">English</p>
                    {isStale && <StaleBadge />}
                  </div>
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
              );
              })}
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
