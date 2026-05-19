export type Locale = "lo" | "ko" | "en";

const VALID_LOCALES: Locale[] = ["lo", "ko", "en"];
const DEFAULT_LOCALE: Locale = "lo";

export function getLocaleFromRequest(request: Request): Locale {
  const cookie = request.headers.get("Cookie") ?? "";
  const match = cookie.match(/(?:^|;\s*)locale=([^;]+)/);
  const value = match?.[1] as Locale;
  return VALID_LOCALES.includes(value) ? value : DEFAULT_LOCALE;
}

export function buildLocaleCookie(locale: Locale): string {
  return `locale=${locale}; Path=/; Max-Age=31536000; SameSite=Lax; HttpOnly`;
}
