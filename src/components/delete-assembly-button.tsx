"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { deleteAssembly } from "@/app/actions/assemblies";
import { Button } from "@/components/ui";

export function DeleteAssemblyButton({
  assemblyId,
  assemblyName,
}: {
  assemblyId: string;
  assemblyName: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="flex flex-wrap items-center gap-3">
      <Button
        variant="danger"
        disabled={pending}
        onClick={() => {
          if (
            confirm(
              `Delete assembly ${assemblyName}? This also clears its row in the delivery tracker sheet and cannot be undone.`,
            )
          ) {
            setError(null);
            startTransition(async () => {
              const result = await deleteAssembly(assemblyId);
              if (result.error) {
                setError(result.error);
                return;
              }
              router.push("/");
              router.refresh();
            });
          }
        }}
      >
        {pending ? "Deleting…" : "Delete assembly"}
      </Button>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
