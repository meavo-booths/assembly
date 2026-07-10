import { revalidatePath, revalidateTag } from "next/cache";
import { QUESTIONNAIRE_PUBLISHED_TAG } from "@/lib/questionnaire-db";

const QUESTIONNAIRE_ADMIN_PATHS = [
  "/questionnaire",
  "/questionnaire/translations",
  "/questionnaire/preview",
] as const;

export function revalidateQuestionnaireAdmin() {
  for (const path of QUESTIONNAIRE_ADMIN_PATHS) {
    revalidatePath(path);
  }
  // Partners see edits as soon as they're made (publish state, text changes).
  revalidateTag(QUESTIONNAIRE_PUBLISHED_TAG);
}
