import { QUESTIONNAIRE } from "@/lib/questionnaire-data";
import type { AppLocale } from "@/lib/i18n/config";
import type { Question } from "@/lib/types";
import { QUESTIONNAIRE_EN_OVERLAY } from "@/lib/i18n/questionnaire-en-overlay";

export function getLocalizedQuestionnaire(locale: AppLocale): Question[] {
  if (locale === "es") return QUESTIONNAIRE;
  return QUESTIONNAIRE.map((q) => {
    const o = QUESTIONNAIRE_EN_OVERLAY[q.id];
    if (!o) return q;
    return {
      ...q,
      category: o.category,
      text: o.text,
      description:
        o.description !== undefined ? o.description : q.description,
      options: q.options.map((opt) => ({
        ...opt,
        text: o.options[opt.id] ?? opt.text,
      })),
    };
  });
}
