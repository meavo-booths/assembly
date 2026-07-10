"use client";

import { useActionState } from "react";

type ActionResult = { error?: string } | undefined;

/**
 * Form wrapper for server actions returning `{ error?: string }`. Renders the
 * error under the form fields and disables nothing else — the standard way to
 * surface action failures from plain (non-wizard) forms.
 */
export function ActionForm({
  action,
  className,
  children,
}: {
  action: (formData: FormData) => Promise<{ error?: string }>;
  className?: string;
  children: React.ReactNode;
}) {
  const [state, formAction] = useActionState(
    async (_previous: ActionResult, formData: FormData) => action(formData),
    undefined,
  );

  return (
    <form action={formAction} className={className}>
      {children}
      {state?.error && (
        <p className="col-span-full mt-2 text-sm text-red-600">{state.error}</p>
      )}
    </form>
  );
}
