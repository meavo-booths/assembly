import { LibraryNav } from "@/components/library-nav";

export default function LibraryLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="space-y-6">
      <LibraryNav />
      {children}
    </div>
  );
}
