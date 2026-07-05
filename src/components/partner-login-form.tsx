"use client";

import { useState, useTransition } from "react";
import { partnerLogin } from "@/app/actions/partner";
import { Button, Input } from "@/components/ui";

export function PartnerLoginForm({ slug }: { slug: string }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <form
      className="mt-6 space-y-4"
      action={(formData) => {
        setError(null);
        startTransition(async () => {
          const result = await partnerLogin(slug, formData);
          if (result?.error) setError(result.error);
        });
      }}
    >
      <Input label="Access code" name="code" type="password" required autoComplete="off" />
      {error && <p className="text-sm text-red-600">{error}</p>}
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Checking…" : "Continue"}
      </Button>
    </form>
  );
}
