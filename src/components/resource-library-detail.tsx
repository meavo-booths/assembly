import Link from "next/link";
import { BoothModel, ResourceType } from "@prisma/client";
import { boothModelLabel } from "@/lib/booth-models";
import { Card } from "@/components/ui";
import { ResourceImageCarousel } from "@/components/resource-image-carousel";

export type ResourceDetailFile = {
  id: string;
  fileName: string;
  mimeType: string;
};

export type ResourceDetailItem = {
  id: string;
  title: string;
  description: string;
  type: ResourceType;
  youtubeVideoId: string | null;
  linkUrl: string | null;
  models: { boothModel: BoothModel }[];
  files: ResourceDetailFile[];
};

function sortedFiles(files: ResourceDetailFile[]): ResourceDetailFile[] {
  return [...files].sort((a, b) => a.fileName.localeCompare(b.fileName));
}

export function ResourceLibraryDetail({
  resource,
  backHref,
  preview = false,
}: {
  resource: ResourceDetailItem;
  backHref: string;
  preview?: boolean;
}) {
  const files = sortedFiles(resource.files);

  return (
    <>
      {preview && (
        <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <span className="font-medium">Preview mode</span> — this is how partners see this resource.
        </div>
      )}

      <div className="mb-6">
        <Link href={backHref} className="text-sm text-brand-700 underline">
          ← Back to resources
        </Link>
        <h1 className="mt-2 text-xl font-semibold text-slate-900">{resource.title}</h1>
        {resource.description && <p className="mt-1 text-sm text-slate-600">{resource.description}</p>}
        <div className="mt-2 flex flex-wrap gap-1.5">
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

      {resource.type === ResourceType.YOUTUBE && resource.youtubeVideoId ? (
        <Card className="overflow-hidden p-0">
          <div className="relative aspect-video w-full bg-black">
            <iframe
              src={`https://www.youtube.com/embed/${resource.youtubeVideoId}`}
              title={resource.title}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
              className="absolute inset-0 h-full w-full border-0"
            />
          </div>
        </Card>
      ) : resource.type === ResourceType.LINK && resource.linkUrl ? (
        <Card className="text-center">
          <p className="text-sm text-slate-600">Open this resource in your browser.</p>
          <a
            href={resource.linkUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 inline-flex items-center justify-center rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
          >
            Open link
          </a>
          <p className="mt-2 truncate text-xs text-slate-500">{resource.linkUrl}</p>
        </Card>
      ) : resource.type === ResourceType.IMAGE && files.length > 0 ? (
        <Card>
          <ResourceImageCarousel files={files} />
        </Card>
      ) : resource.type === ResourceType.PDF && files.length > 0 ? (
        <Card>
          <p className="text-sm text-slate-600">Open a PDF guide in your browser.</p>
          <ul className="mt-4 space-y-2">
            {files.map((file) => (
              <li key={file.id}>
                <a
                  href={`/api/resource-files/${file.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex w-full items-center justify-between rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-medium text-brand-700 hover:border-brand-300 hover:bg-brand-50"
                >
                  <span className="truncate">{file.fileName}</span>
                  <span className="ml-3 shrink-0 text-xs text-slate-500">Open PDF</span>
                </a>
              </li>
            ))}
          </ul>
        </Card>
      ) : (
        <Card className="text-center">
          <p className="text-sm text-slate-600">This resource has no files yet.</p>
        </Card>
      )}
    </>
  );
}
