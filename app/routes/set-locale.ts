import { redirect } from "react-router";
import { buildLocaleCookie, type Locale } from "~/lib/locale.server";

const VALID: Locale[] = ["lo", "ko", "en"];

export async function loader({ request }: { request: Request }) {
  const url = new URL(request.url);
  const locale = url.searchParams.get("locale") as Locale;
  const redirectTo = url.searchParams.get("redirectTo") || "/";

  // Only allow relative redirects
  const safeRedirect = redirectTo.startsWith("/") ? redirectTo : "/";
  const safeLocale: Locale = VALID.includes(locale) ? locale : "lo";

  return redirect(safeRedirect, {
    headers: { "Set-Cookie": buildLocaleCookie(safeLocale) },
  });
}
