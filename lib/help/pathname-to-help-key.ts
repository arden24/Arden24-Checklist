import type { PageHelpKey } from "@/lib/help/page-help-content";

/**
 * Maps the current URL to in-app help content. Returns null when no dedicated help exists.
 */
export function pathnameToPageHelpKey(pathname: string): PageHelpKey | null {
  if (pathname === "/dashboard") return "dashboard";
  if (pathname === "/checklist") return "checklist";
  if (pathname === "/open-trades") return "live-trades";
  if (pathname === "/journal") return "journal";
  if (pathname === "/notes") return "notes";
  if (pathname === "/account") return "account";
  if (pathname === "/billing") return "billing";
  if (pathname === "/strategies" || pathname.startsWith("/strategies/")) {
    return "strategies";
  }
  return null;
}
