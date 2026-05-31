import { useState, useRef, useEffect } from "react";
import { Link, Form, useLocation } from "react-router";
import { useT, useLocale } from "~/lib/i18n";

interface NavbarProps {
  user?: { role: string; profileId?: string; companyName?: string } | null;
}

const LANGS = [
  { code: "lo", flag: "🇱🇦", label: "ລາວ" },
  { code: "ko", flag: "🇰🇷", label: "한국어" },
  { code: "en", flag: "🇬🇧", label: "English" },
] as const;

function LanguageSwitcher() {
  const locale = useLocale();
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const current = LANGS.find((l) => l.code === locale) ?? LANGS[0];

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 px-2.5 py-1.5 border border-slate-200 rounded-lg bg-white hover:bg-slate-50 transition-colors"
      >
        <span className="text-lg leading-none">{current.flag}</span>
        <span className="text-xs font-medium text-slate-700 hidden sm:inline">{current.label}</span>
        <svg
          className={`w-3 h-3 text-slate-400 transition-transform duration-150 ${open ? "rotate-180" : ""}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 mt-1.5 w-40 bg-white border border-slate-200 rounded-xl shadow-lg z-50 overflow-hidden py-1">
          {LANGS.map(({ code, flag, label }) => (
            <Link
              key={code}
              to={`/set-locale?locale=${code}&redirectTo=${encodeURIComponent(pathname)}`}
              onClick={() => setOpen(false)}
              className={`flex items-center gap-2.5 px-3 py-2 text-sm transition-colors ${locale === code
                ? "bg-rose-50 text-rose-600 font-semibold"
                : "text-slate-700 hover:bg-slate-50"
                }`}
            >
              <span className="text-lg leading-none">{flag}</span>
              <span className="flex-1">{label}</span>
              {locale === code && (
                <svg className="w-3.5 h-3.5 text-rose-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

export function Navbar({ user }: NavbarProps) {
  const t = useT();

  const logoutAction = user?.role === "agency" ? "/agency/logout" : "/logout";

  return (
    <header className="bg-white border-b border-slate-100 sticky top-0 z-50 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 shrink-0">
            <div className="w-8 h-8 bg-rose-500 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">H</span>
            </div>
            <span className="font-bold text-lg text-slate-900 inline">HanMatching</span>
          </Link>

          {/* Right: language switcher + logout */}
          <div className="flex items-center gap-1 sm:gap-3 ml-auto">
            <LanguageSwitcher />
            {user && (
              <Form method="post" action={logoutAction}>
                <button
                  type="submit"
                  className="text-sm text-slate-600 hover:text-rose-500 transition-colors px-2.5 py-1.5"
                >
                  {t.nav.logout}
                </button>
              </Form>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
