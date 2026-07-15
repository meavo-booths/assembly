import { ResourceCategoryKind } from "@prisma/client";

export type ResourceCategoryOption = {
  value: ResourceCategoryKind;
  label: string;
};

export const RESOURCE_CATEGORIES: ResourceCategoryOption[] = [
  { value: ResourceCategoryKind.DELIVERY, label: "Delivery" },
  { value: ResourceCategoryKind.ASSEMBLY, label: "Assembly" },
  { value: ResourceCategoryKind.ELECTRICAL, label: "Electrical" },
  { value: ResourceCategoryKind.REPAIRS, label: "Repairs" },
];

export function resourceCategoryLabel(category: ResourceCategoryKind): string {
  return RESOURCE_CATEGORIES.find((entry) => entry.value === category)?.label ?? category;
}

export function parseResourceCategoryFilter(value: string | undefined): ResourceCategoryKind | null {
  if (!value) return null;
  return RESOURCE_CATEGORIES.some((entry) => entry.value === value)
    ? (value as ResourceCategoryKind)
    : null;
}

export function parseResourceCategories(formData: FormData): ResourceCategoryKind[] {
  const values = formData
    .getAll("categories")
    .map((entry) => String(entry).trim())
    .filter(Boolean);

  const allowed = new Set(RESOURCE_CATEGORIES.map((entry) => entry.value));
  return [...new Set(values.filter((value): value is ResourceCategoryKind => allowed.has(value as ResourceCategoryKind)))];
}
