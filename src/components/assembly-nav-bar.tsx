"use client";

import {
  MeavoNavBar,
  type NavLink,
  type NotificationsState,
  type ToolSwitcherState,
} from "@meavo/navigation";

const links: NavLink[] = [
  { href: "/deals", label: "Ready deals" },
  { href: "/", label: "Assemblies" },
  { href: "/calendar", label: "Calendar" },
  { href: "/partners", label: "Library" },
];

const LIBRARY_SECTIONS = ["/partners", "/questionnaire", "/resources"];

// The Library nav item groups three sections, so it needs a wider
// active-state match than the default prefix check.
function isActiveLink(pathname: string, href: string): boolean {
  if (href === "/") {
    return pathname === "/" || pathname.startsWith("/assemblies/");
  }
  if (href === "/partners") {
    return LIBRARY_SECTIONS.some(
      (section) => pathname === section || pathname.startsWith(`${section}/`),
    );
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AssemblyNavBar({
  logoHref,
  toolSwitcher,
  userName,
  userEmail,
  userImage,
  signOutAction,
  notifications,
}: {
  logoHref: string;
  toolSwitcher: ToolSwitcherState;
  userName: string | null | undefined;
  userEmail: string | null | undefined;
  userImage?: string | null;
  signOutAction: () => void | Promise<void>;
  notifications?: NotificationsState;
}) {
  return (
    <MeavoNavBar
      links={links}
      logoHref={logoHref}
      toolSwitcher={toolSwitcher}
      userName={userName}
      userEmail={userEmail}
      userImage={userImage}
      signOutAction={signOutAction}
      notifications={notifications}
      isActiveLink={isActiveLink}
    />
  );
}
