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
  isPublished,
}: {
  sections: SectionRecord[];
  locale: QuestionnaireLocale;
  availableLocales: QuestionnaireLocale[];
  approvedLocales: QuestionnaireLocale[];
  isPublished: boolean;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const showDraftBanner =
    locale !== QuestionnaireLocale.EN && !approvedLocales.includes(locale);

  function selectLocale(nextLocale: QuestionnaireLocale) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("lang", questionnaireLocaleToParam(nextLocale));
    const query = params.toString();
    router.push(query ? `/questionnaire/preview?${query}` : "/questionnaire/preview");
  }

  return (
    <div className="mx-auto max-w-lg space-y-6">
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
