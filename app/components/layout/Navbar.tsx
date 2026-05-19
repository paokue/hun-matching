import { useState, useRef, useEffect } from "react";
import { Link, Form, useLocation, useSearchParams } from "react-router";
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
              className={`flex items-center gap-2.5 px-3 py-2 text-sm transition-colors ${
                locale === code
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

function NavSearch() {
  const [searchParams] = useSearchParams();
  const defaultValue = searchParams.get("search") ?? "";

  return (
    <Form method="get" action="/agency/search" className="relative">
      <svg
        className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none"
        fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
      </svg>
      <input
        type="text"
        name="search"
        defaultValue={defaultValue}
        placeholder="Search applicants..."
        className="pl-9 pr-4 py-1.5 w-48 text-sm text-slate-500 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-300 focus:border-rose-300 focus:w-64 transition-all duration-200 placeholder:text-slate-400"
      />
    </Form>
  );
}

export function Navbar({ user }: NavbarProps) {
  const t = useT();

  return (
    <header className="bg-white border-b border-slate-100 sticky top-0 z-50 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 shrink-0">
            <div className="w-8 h-8 bg-rose-500 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">H</span>
            </div>
            <span className="font-bold text-lg text-slate-900 hidden sm:inline">HanMatching</span>
          </Link>

          {/* Right group: auth links + search + lang switcher */}
          <nav className="hidden md:flex items-center gap-3 ml-auto">
            {user?.role === "applicant" && (
              <>
                <Link to="/dashboard" className="text-sm text-slate-600 hover:text-rose-500 transition-colors">
                  {t.nav.myProfile}
                </Link>
                <Form method="post" action="/logout">
                  <button type="submit" className="text-sm text-slate-600 hover:text-rose-500 transition-colors">
                    {t.nav.logout}
                  </button>
                </Form>
              </>
            )}
            {user?.role === "agency" && (
              <>
                <Link to="/agency/dashboard" className="text-sm text-slate-600 hover:text-rose-500 transition-colors">
                  {t.nav.dashboard}
                </Link>
                <Form method="post" action="/agency/logout">
                  <button type="submit" className="text-sm text-slate-600 hover:text-rose-500 transition-colors">
                    {t.nav.logout}
                  </button>
                </Form>
              </>
            )}
            {user?.role === "admin" && (
              <>
                <Link to="/admin" className="text-sm text-slate-600 hover:text-rose-500 transition-colors">
                  {t.nav.adminPanel}
                </Link>
                <Form method="post" action="/logout">
                  <button type="submit" className="text-sm text-slate-600 hover:text-rose-500 transition-colors">
                    {t.nav.logout}
                  </button>
                </Form>
              </>
            )}
            <NavSearch />
            <LanguageSwitcher />
          </nav>

          {/* Mobile right */}
          <div className="md:hidden flex items-center gap-2 ml-auto">
            <NavSearch />
            <LanguageSwitcher />
            {user && (
              <Link
                to={user.role === "agency" ? "/agency/dashboard" : user.role === "admin" ? "/admin" : "/dashboard"}
                className="text-sm font-medium text-rose-500"
              >
                {t.nav.dashboard}
              </Link>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
