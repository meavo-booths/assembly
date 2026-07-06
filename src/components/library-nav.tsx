"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
  { href: "/partners", label: "Partners" },
  { href: "/questionnaire", label: "Questionnaire" },
  { href: "/resources", label: "Partner resources" },
];

export function LibraryNav() {
  const pathname = usePathname();

  return (
    <nav
      className="flex gap-1 overflow-x-auto border-b border-slate-200"
      aria-label="Library sections"
    >
      {tabs.map((tab) => {
        const active = pathname === tab.href || pathname.startsWith(`${tab.href}/`);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={active ? "page" : undefined}
            className={`-mb-px whitespace-nowrap border-b-2 px-4 py-2.5 text-sm font-medium transition ${
              active
                ? "border-brand-600 text-brand-700"
                : "border-transparent text-slate-600 hover:border-slate-300 hover:text-slate-900"
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
