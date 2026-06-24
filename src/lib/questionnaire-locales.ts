import { QuestionnaireLocale } from "@prisma/client";

export const TARGET_QUESTIONNAIRE_LOCALES: QuestionnaireLocale[] = [
  QuestionnaireLocale.DE,
  QuestionnaireLocale.FR,
  QuestionnaireLocale.ES,
  QuestionnaireLocale.IT,
  QuestionnaireLocale.CS,
  QuestionnaireLocale.NL,
];

export const QUESTIONNAIRE_LOCALE_COOKIE = "assembly_questionnaire_lang";

export const LOCALE_SHORT_LABELS: Record<QuestionnaireLocale, string> = {
  [QuestionnaireLocale.EN]: "EN",
  [QuestionnaireLocale.DE]: "DE",
  [QuestionnaireLocale.FR]: "FR",
  [QuestionnaireLocale.ES]: "ES",
  [QuestionnaireLocale.IT]: "IT",
  [QuestionnaireLocale.CS]: "CS",
  [QuestionnaireLocale.NL]: "NL",
};

export const LOCALE_NAMES: Record<QuestionnaireLocale, string> = {
  [QuestionnaireLocale.EN]: "English",
  [QuestionnaireLocale.DE]: "Deutsch",
  [QuestionnaireLocale.FR]: "Français",
  [QuestionnaireLocale.ES]: "Español",
  [QuestionnaireLocale.IT]: "Italiano",
  [QuestionnaireLocale.CS]: "Čeština",
  [QuestionnaireLocale.NL]: "Nederlands",
};

const LOCALE_PARAM_MAP: Record<string, QuestionnaireLocale> = {
  en: QuestionnaireLocale.EN,
  de: QuestionnaireLocale.DE,
  fr: QuestionnaireLocale.FR,
  es: QuestionnaireLocale.ES,
  it: QuestionnaireLocale.IT,
  cs: QuestionnaireLocale.CS,
  nl: QuestionnaireLocale.NL,
};

export function parseQuestionnaireLocaleParam(value: string | undefined): QuestionnaireLocale | null {
  if (!value) return null;
  return LOCALE_PARAM_MAP[value.trim().toLowerCase()] ?? null;
}

export function questionnaireLocaleToParam(locale: QuestionnaireLocale): string {
  return locale.toLowerCase();
}

export function parseAcceptLanguageHeader(header: string | null): QuestionnaireLocale[] {
  if (!header) return [];

  const ordered: QuestionnaireLocale[] = [];
  for (const part of header.split(",")) {
    const code = part.split(";")[0]?.trim().toLowerCase().slice(0, 2);
    const locale = code ? LOCALE_PARAM_MAP[code] : undefined;
    if (locale && !ordered.includes(locale)) {
      ordered.push(locale);
    }
  }
  return ordered;
}

export function resolveQuestionnaireLocale(
  requested: QuestionnaireLocale | null,
  acceptLanguage: string | null,
  cookieValue: string | undefined,
  approvedLocales: QuestionnaireLocale[],
): QuestionnaireLocale {
  const approved = new Set(approvedLocales);
  const candidates: (QuestionnaireLocale | null)[] = [
    requested,
    parseQuestionnaireLocaleParam(cookieValue),
    ...parseAcceptLanguageHeader(acceptLanguage),
    QuestionnaireLocale.EN,
  ];

  for (const candidate of candidates) {
    if (candidate && approved.has(candidate)) {
      return candidate;
    }
  }

  return QuestionnaireLocale.EN;
}

export function getFullyApprovedLocales(
  sectionCount: number,
  questionCount: number,
  approvedSectionCounts: Partial<Record<QuestionnaireLocale, number>>,
  approvedQuestionCounts: Partial<Record<QuestionnaireLocale, number>>,
): QuestionnaireLocale[] {
  const locales: QuestionnaireLocale[] = [QuestionnaireLocale.EN];
  if (sectionCount === 0) return locales;

  for (const locale of TARGET_QUESTIONNAIRE_LOCALES) {
    if (
      approvedSectionCounts[locale] === sectionCount &&
      approvedQuestionCounts[locale] === questionCount
    ) {
      locales.push(locale);
    }
  }

  return locales;
}

export function getFullyTranslatedLocales(
  sectionCount: number,
  questionCount: number,
  sectionCounts: Partial<Record<QuestionnaireLocale, number>>,
  questionCounts: Partial<Record<QuestionnaireLocale, number>>,
): QuestionnaireLocale[] {
  const locales: QuestionnaireLocale[] = [QuestionnaireLocale.EN];
  if (sectionCount === 0) return locales;

  for (const locale of TARGET_QUESTIONNAIRE_LOCALES) {
    if (sectionCounts[locale] === sectionCount && questionCounts[locale] === questionCount) {
      locales.push(locale);
    }
  }

  return locales;
}

export function resolvePreviewLocale(
  requested: QuestionnaireLocale | null,
  availableLocales: QuestionnaireLocale[],
): QuestionnaireLocale {
  if (requested && availableLocales.includes(requested)) {
    return requested;
  }
  return QuestionnaireLocale.EN;
}

export type TranslationLookup = {
  sections: Record<string, string>;
  questions: Record<string, string>;
};

export function buildTranslationLookup(
  sectionTranslations: Array<{ sectionId: string; title: string }>,
  questionTranslations: Array<{ questionId: string; text: string }>,
): TranslationLookup {
  return {
    sections: Object.fromEntries(sectionTranslations.map((row) => [row.sectionId, row.title])),
    questions: Object.fromEntries(questionTranslations.map((row) => [row.questionId, row.text])),
  };
}
