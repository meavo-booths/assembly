"use client";

import {
  setPartnerAccessCode,
  updatePartnerEmail,
  updatePartnerSlug,
} from "@/app/actions/partners";
import { ActionForm } from "@/components/action-form";
import { Button, Card, Input } from "@/components/ui";

export type PartnerCardData = {
  id: string;
  name: string;
  slug: string;
  email: string | null;
  codeHash: string | null;
  assemblyCount: number;
};

function ChevronIcon() {
  return (
    <svg
      className="mt-0.5 h-5 w-5 shrink-0 text-slate-400 transition group-open:rotate-180"
      viewBox="0 0 20 20"
      fill="currentColor"
      aria-hidden
    >
      <path
        fillRule="evenodd"
        d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.25a.75.75 0 01-1.06 0L5.21 8.29a.75.75 0 01.02-1.08z"
        clipRule="evenodd"
      />
    </svg>
  );
}

export function PartnerCard({
  partner,
  baseUrl,
}: {
  partner: PartnerCardData;
  baseUrl: string;
}) {
  const portalUrl = `${baseUrl}/${partner.slug}`;
  const displayHost = baseUrl.replace(/^https?:\/\//, "");
  const codeStatus = partner.codeHash ? "Code set" : "No code yet";

  return (
    <Card className="!p-0">
      <details className="group">
        <summary className="flex cursor-pointer list-none items-start justify-between gap-3 px-4 py-3 sm:px-6 sm:py-4 [&::-webkit-details-marker]:hidden">
          <div className="min-w-0">
            <p className="font-medium text-slate-900">{partner.name}</p>
            <p className="mt-0.5 text-sm text-slate-600">
              {partner.assemblyCount} {partner.assemblyCount === 1 ? "assembly" : "assemblies"} ·{" "}
              <a
                href={portalUrl}
                className="text-brand-700 underline"
                target="_blank"
                rel="noreferrer"
                onClick={(event) => event.stopPropagation()}
              >
                {displayHost}/{partner.slug}
              </a>
            </p>
          </div>
          <div className="flex shrink-0 items-start gap-2">
            <span className="text-xs text-slate-500">{codeStatus}</span>
            <ChevronIcon />
          </div>
        </summary>

        <div className="space-y-3 border-t border-slate-100 px-4 pb-4 pt-4 sm:px-6 sm:pb-6">
          <ActionForm action={updatePartnerEmail} className="grid gap-3 sm:grid-cols-2">
            <input type="hidden" name="partnerId" value={partner.id} />
            <Input
              label="Partner email"
              name="email"
              type="email"
              defaultValue={partner.email ?? ""}
              placeholder="partner@example.com"
            />
            <div className="flex items-end">
              <Button type="submit" variant="secondary">
                Update email
              </Button>
            </div>
          </ActionForm>

          <ActionForm action={setPartnerAccessCode} className="grid gap-3 sm:grid-cols-2">
            <input type="hidden" name="partnerId" value={partner.id} />
            <Input
              label="New access code"
              name="code"
              minLength={8}
              placeholder="Leave blank to keep unchanged (min 8 chars)"
            />
            <div className="flex items-end">
              <Button type="submit" variant="secondary">
                Update code
              </Button>
            </div>
          </ActionForm>

          <ActionForm action={updatePartnerSlug} className="grid gap-3 sm:grid-cols-2">
            <input type="hidden" name="partnerId" value={partner.id} />
            <Input label="URL slug" name="slug" defaultValue={partner.slug} required />
            <div className="flex items-end">
              <Button type="submit" variant="ghost">
                Update slug
              </Button>
            </div>
          </ActionForm>
        </div>
      </details>
    </Card>
  );
}
