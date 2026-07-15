import Link from "next/link";
import { BoothModel, ResourceCategoryKind, ResourceType } from "@prisma/client";
import { BOOTH_MODEL_GROUPS, boothModelLabel } from "@/lib/booth-models";
import { RESOURCE_CATEGORIES, resourceCategoryLabel } from "@/lib/resource-categories";
import { resourceTypeLabel } from "@/lib/resources";
import { templateMarkupToPlainText } from "@/lib/template-markup-plain";
import { Card } from "@/components/ui";

export type ResourceListItem = {
  id: string;
  title: string;
  description: string;
  type: ResourceType;
  models: { boothModel: BoothModel }[];
  categories: { category: ResourceCategoryKind }[];
};

function buildListHref(
  basePath: string,
  modelFilter: BoothModel | null,
  categoryFilter: ResourceCategoryKind | null,
): string {
  const params = new URLSearchParams();
  if (modelFilter) params.set("model", modelFilter);
  if (categoryFilter) params.set("category", categoryFilter);
  const query = params.toString();
  return query ? `${basePath}?${query}` : basePath;
}

export function ResourceLibraryList({
  resources,
  basePath,
  modelFilter,
  categoryFilter,
  preview = false,
}: {
  resources: ResourceListItem[];
  basePath: string;
  modelFilter: BoothModel | null;
  categoryFilter: ResourceCategoryKind | null;
  preview?: boolean;
}) {
  return (
    <>
      {preview && (
        <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <span className="font-medium">Preview mode</span> — this is how partners see the resource library.
        </div>
      )}

      <div className="mb-3 flex flex-wrap gap-2">
        <Link
          href={buildListHref(basePath, modelFilter, null)}
          className={`rounded-full px-3 py-1 text-xs font-medium ${
            !categoryFilter ? "bg-violet-600 text-white" : "bg-slate-100 text-slate-700"
          }`}
        >
          All categories
        </Link>
        {RESOURCE_CATEGORIES.map((category) => (
          <Link
            key={category.value}
            href={buildListHref(basePath, modelFilter, category.value)}
            className={`rounded-full px-3 py-1 text-xs font-medium ${
              categoryFilter === category.value
                ? "bg-violet-600 text-white"
                : "bg-slate-100 text-slate-700"
            }`}
          >
            {category.label}
          </Link>
        ))}
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        <Link
          href={buildListHref(basePath, null, categoryFilter)}
          className={`rounded-full px-3 py-1 text-xs font-medium ${
            !modelFilter ? "bg-brand-600 text-white" : "bg-slate-100 text-slate-700"
          }`}
        >
          All models
        </Link>
        {BOOTH_MODEL_GROUPS.map((group) => (
          <div key={group.line} className="flex flex-wrap gap-2">
            {group.models.map((model) => (
              <Link
                key={model.value}
                href={buildListHref(basePath, model.value, categoryFilter)}
                className={`rounded-full px-3 py-1 text-xs font-medium ${
                  modelFilter === model.value
                    ? "bg-brand-600 text-white"
                    : "bg-slate-100 text-slate-700"
                }`}
              >
                {model.label}
              </Link>
            ))}
          </div>
        ))}
      </div>

      <div className="grid gap-3">
        {resources.map((resource) => {
          const plainDescription = resource.description
            ? templateMarkupToPlainText(resource.description)
            : "";

          return (
            <Link key={resource.id} href={`${basePath}/${resource.id}`}>
              <Card className="transition hover:border-brand-500">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-medium text-slate-900">{resource.title}</p>
                    {plainDescription && (
                      <p className="mt-1 line-clamp-2 text-sm text-slate-600">{plainDescription}</p>
                    )}
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {resource.categories.map((entry) => (
                        <span
                          key={entry.category}
                          className="rounded-full bg-violet-50 px-2 py-0.5 text-xs font-medium text-violet-800"
                        >
                          {resourceCategoryLabel(entry.category)}
                        </span>
                      ))}
                      {resource.models.map((entry) => (
                        <span
                          key={entry.boothModel}
                          className="rounded-full bg-brand-50 px-2 py-0.5 text-xs font-medium text-brand-800"
                        >
                          {boothModelLabel(entry.boothModel)}
                        </span>
                      ))}
                    </div>
                  </div>
                  <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                    {resourceTypeLabel(resource.type)}
                  </span>
                </div>
              </Card>
            </Link>
          );
        })}
        {resources.length === 0 && (
          <Card>
            <p className="text-sm text-slate-600">
              {modelFilter || categoryFilter
                ? "No resources match these filters yet."
                : preview
                  ? "No resources in the library yet. Add resources on the builder page, then preview again."
                  : "No resources available yet."}
            </p>
            {(modelFilter || categoryFilter) && (
              <Link href={basePath} className="mt-2 inline-block text-sm text-brand-700 underline">
                Show all resources
              </Link>
            )}
          </Card>
        )}
      </div>
    </>
  );
}
