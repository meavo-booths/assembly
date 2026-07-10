import { getAssemblyDropdownOptions } from "@/lib/sheets-export";
import { getPartnerNameSuggestions } from "@/lib/assembly-form-suggestions";

/**
 * Everything the schedule/edit assembly form needs (sheet dropdown options and
 * partner name suggestions), fetched in parallel. Shared by every page that
 * renders the form.
 */
export async function loadScheduleFormContext(): Promise<{
  options: Awaited<ReturnType<typeof getAssemblyDropdownOptions>>;
  deliveryCompanies: string[];
  installCompanies: string[];
}> {
  const [options, partnerSuggestions] = await Promise.all([
    getAssemblyDropdownOptions(),
    getPartnerNameSuggestions(),
  ]);
  return { options, ...partnerSuggestions };
}
