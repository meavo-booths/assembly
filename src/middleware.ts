import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth.config";
import { MEVAO_RESERVED_SEGMENTS } from "@/lib/constants";

const { auth } = NextAuth(authConfig);

function isMeavoRoute(pathname: string): boolean {
  if (pathname === "/") return true;
  const segment = pathname.split("/").filter(Boolean)[0] ?? "";
  return MEVAO_RESERVED_SEGMENTS.has(segment);
}

export default auth((req) => {
  const { pathname } = req.nextUrl;

  if (pathname.startsWith("/api/")) return;
  if (pathname === "/manifest.webmanifest") return;
  if (/\.(?:svg|png|jpg|jpeg|gif|webp|ico)$/i.test(pathname)) return;
  if (!isMeavoRoute(pathname)) return;

  const isLoggedIn = !!req.auth;
  const isLoginPage = pathname.startsWith("/login");

  if (!isLoggedIn && !isLoginPage) {
    return Response.redirect(new URL("/login", req.nextUrl));
  }
  if (isLoggedIn && isLoginPage) {
    return Response.redirect(new URL("/", req.nextUrl));
  }
});

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|manifest.webmanifest|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
