import { createContext, useContext } from "react";
import type { Translations } from "~/locales";
import type { Locale } from "~/lib/locale.server";

type I18nContextType = {
  locale: Locale;
  t: Translations;
};

export const I18nContext = createContext<I18nContextType | null>(null);

export function useT(): Translations {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useT must be used within I18nContext.Provider");
  return ctx.t;
}

export function useLocale(): Locale {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useLocale must be used within I18nContext.Provider");
  return ctx.locale;
}
