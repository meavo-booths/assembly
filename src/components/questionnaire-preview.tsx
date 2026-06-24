"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { QuestionnaireLocale } from "@prisma/client";
import {
  LOCALE_NAMES,
  LOCALE_SHORT_LABELS,
  questionnaireLocaleToParam,
} from "@/lib/questionnaire-locales";
import { QuestionnaireWizard } from "@/components/questionnaire-wizard";
import type { SectionRecord } from "@/lib/questionnaire";

export function QuestionnairePreview({
  sections,
  locale,
  availableLocales,
  approvedLocales,
  partnerView,
  isPublished,
}: {
  sections: SectionRecord[];
  locale: QuestionnaireLocale;
  availableLocales: QuestionnaireLocale[];
  approvedLocales: QuestionnaireLocale[];
  partnerView: boolean;
  isPublished: boolean;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const showDraftBanner =
    !partnerView && locale !== QuestionnaireLocale.EN && !approvedLocales.includes(locale);

  function updateParams(mutate: (params: URLSearchParams) => void) {
    const params = new URLSearchParams(searchParams.toString());
    mutate(params);
    const query = params.toString();
    router.push(query ? `/questionnaire/preview?${query}` : "/questionnaire/preview");
  }

  function selectLocale(nextLocale: QuestionnaireLocale) {
    updateParams((params) => {
      params.set("lang", questionnaireLocaleToParam(nextLocale));
    });
  }

  function setPartnerView(next: boolean) {
    updateParams((params) => {
      if (next) {
        params.set("mode", "partner");
      } else {
        params.delete("mode");
      }
    });
  }

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-slate-900">Preview</h2>
        <p className="mt-1 text-sm text-slate-500">
          Walk through the questionnaire as a partner would. Nothing is saved.
        </p>
      </div>

      <div className="space-y-3">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Preview mode</p>
        <div
          className="flex gap-1 rounded-lg border border-slate-200 bg-slate-50 p-1"
          role="tablist"
          aria-label="Preview translation mode"
        >
          <button
            type="button"
            role="tab"
            aria-selected={!partnerView}
            onClick={() => setPartnerView(false)}
            className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition ${
              !partnerView
                ? "bg-white text-brand-700 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Draft translations
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={partnerView}
            onClick={() => setPartnerView(true)}
            className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition ${
              partnerView
                ? "bg-white text-brand-700 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Partner view
          </button>
        </div>
        <p className="text-xs text-slate-500">
          {partnerView
            ? "Only approved languages — same as partners see after publication."
            : "All generated translations, including drafts and stale items not yet live."}
        </p>
      </div>

      {availableLocales.length > 1 && (
        <div>
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">Language</p>
          <div className="flex flex-wrap gap-2">
            {availableLocales.map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => selectLocale(option)}
                title={LOCALE_NAMES[option]}
                className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                  locale === option
                    ? "bg-brand-600 text-white"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                {LOCALE_SHORT_LABELS[option]}
              </button>
            ))}
          </div>
        </div>
      )}

      {showDraftBanner && (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <span className="font-medium">Draft translation</span> — {LOCALE_NAMES[locale]} is not
          approved yet. Partners will not see this language until you approve it on the Translations
          tab.
        </p>
      )}

      {!isPublished && (
        <p className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900">
          This questionnaire is <span className="font-medium">not published</span> yet. Partners will
          not see it until you publish.
        </p>
      )}

      <QuestionnaireWizard
        preview
        sections={sections}
        locale={locale}
        availableLocales={availableLocales}
      />
    </div>
  );
}
