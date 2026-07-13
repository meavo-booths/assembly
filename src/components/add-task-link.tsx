import { buildAddTaskUrl } from "@/lib/tasks-link";

export function AddTaskLink({
  entityId,
  title,
}: {
  entityId: string;
  title: string;
}) {
  const href = buildAddTaskUrl({
    linkedApp: "ASSEMBLY",
    entityId,
    title,
  });

  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="text-sm text-brand-700 underline"
    >
      Add task ↗
    </a>
  );
}
