"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { QuestionnaireLocale } from "@prisma/client";
import {
  LOCALE_SHORT_LABELS,
  QUESTIONNAIRE_LOCALE_COOKIE,
  questionnaireLocaleToParam,
} from "@/lib/questionnaire-locales";

export function QuestionnaireLanguagePicker({
  slug,
  dealId,
  locale,
  availableLocales,
  label,
}: {
  slug: string;
  dealId: string;
  locale: QuestionnaireLocale;
  availableLocales: QuestionnaireLocale[];
  label: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  if (availableLocales.length <= 1) {
    return null;
  }

  function selectLocale(nextLocale: QuestionnaireLocale) {
    document.cookie = `${QUESTIONNAIRE_LOCALE_COOKIE}=${questionnaireLocaleToParam(nextLocale)}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
    const params = new URLSearchParams(searchParams.toString());
    params.set("lang", questionnaireLocaleToParam(nextLocale));
    router.push(`/${slug}/${encodeURIComponent(dealId)}?${params.toString()}`);
  }

  return (
    <div className="mb-4">
      <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <div className="flex flex-wrap gap-2">
        {availableLocales.map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => selectLocale(option)}
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
  );
}
