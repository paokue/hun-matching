import { Link } from "react-router";
import type { Route } from "./+types/_index";
import { Navbar } from "~/components/layout/Navbar";
import { Footer } from "~/components/layout/Footer";
import { getUserFromSession } from "~/lib/auth.server";
import { useT } from "~/lib/i18n";

export function meta(_: Route.MetaArgs) {
  return [
    { title: "HanMatching.com — Connect with Trusted Agencies" },
    { name: "description", content: "A professional matchmaking platform for female applicants and trusted agencies." },
  ];
}

export async function loader({ request }: Route.LoaderArgs) {
  const session = await getUserFromSession(request);
  return { user: session };
}

export default function Index({ loaderData }: Route.ComponentProps) {
  const { user } = loaderData;
  const t = useT();

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar user={user as any} />

      {/* ── Hero ────────────────────────────────────────────────────── */}
      <section className="relative bg-gradient-to-br from-rose-50 via-white to-pink-50 pt-20 pb-28 px-4 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,rgba(251,113,133,0.08)_0%,transparent_60%)]" />
        <div className="max-w-5xl mx-auto text-center relative">
          <span className="inline-block bg-rose-100 text-rose-600 text-xs font-semibold px-3 py-1 rounded-full mb-4 tracking-wide uppercase">
            {t.home.badge}
          </span>
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold text-slate-900 leading-tight mb-6">
            {t.home.title}<br />
            <span className="text-rose-500">{t.home.titleHighlight}</span>
          </h1>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto mb-10">
            {t.home.desc}
          </p>
          <div className="flex flex-row gap-4 justify-center">
            <Link to="/login" className="bg-rose-500 hover:bg-rose-600 text-white font-semibold px-4 sm:px-8 py-2 sm:py-3.5 rounded-xl shadow-lg shadow-rose-200 transition-all duration-200 text-sm sm:text-base">
              {t.home.applicantLoginBtn}
            </Link>
            <Link to="/agency/login" className="bg-white hover:bg-slate-50 text-slate-800 font-semibold px-4 sm:px-8 py-2 sm:py-3.5 rounded-xl border border-slate-200 shadow-sm transition-all duration-200 text-sm sm:text-base">
              {t.home.agencyLoginBtn}
            </Link>
          </div>
        </div>
        <div className="absolute -top-10 -right-10 w-64 h-64 bg-rose-100 rounded-full opacity-30 blur-3xl" />
        <div className="absolute -bottom-20 -left-10 w-80 h-80 bg-pink-100 rounded-full opacity-30 blur-3xl" />
      </section>

      {/* ── Profiles showcase ────────────────────────────────────────── */}
      <section className="bg-slate-950 py-16 px-4">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="flex items-end justify-between mb-8">
            <div>
              <span className="inline-flex items-center gap-1.5 bg-rose-500/10 text-rose-400 text-xs font-semibold px-3 py-1 rounded-full mb-3 tracking-wide uppercase border border-rose-500/20">
                <span className="w-1.5 h-1.5 bg-rose-400 rounded-full animate-pulse" />
                Live Profiles
              </span>
              <h2 className="text-2xl sm:text-3xl font-bold text-white leading-tight">Meet Our Applicants</h2>
              <p className="text-slate-400 mt-1.5 text-sm">Verified profiles · Agency membership required for full access</p>
            </div>
            <Link
              to="/profiles"
              className="hidden sm:flex items-center gap-1.5 text-sm font-medium text-rose-400 hover:text-rose-300 transition-colors group shrink-0"
            >
              View all
              <svg className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </Link>
          </div>

          {/* 5 × 2 grid */}
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-2.5">
            {[
              { src: "https://i.pravatar.cc/600?img=47", age: 22, loc: "Vientiane" },
              { src: "https://i.pravatar.cc/600?img=49", age: 24, loc: "Luang Prabang" },
              { src: "https://i.pravatar.cc/600?img=44", age: 21, loc: "Savannakhet" },
              { src: "https://i.pravatar.cc/600?img=43", age: 25, loc: "Pakse" },
              { src: "https://i.pravatar.cc/600?img=48", age: 23, loc: "Vientiane" },
              { src: "https://i.pravatar.cc/600?img=45", age: 20, loc: "Luang Prabang" },
              { src: "https://i.pravatar.cc/600?img=5", age: 26, loc: "Vientiane" },
              { src: "https://i.pravatar.cc/600?img=11", age: 22, loc: "Pakse" },
              { src: "https://i.pravatar.cc/600?img=9", age: 24, loc: "Savannakhet" },
              { src: "https://i.pravatar.cc/600?img=20", age: 21, loc: "Vientiane" },
            ].map((p, i) => (
              <Link key={i} to="/profiles" className="group">
                <div className="relative aspect-[3/4] rounded-xl overflow-hidden shadow-md shadow-black/40">
                  <img
                    src={p.src}
                    alt=""
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
                  />
                  {/* Gradient */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/5 to-transparent" />
                  {/* Lock */}
                  <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-black/50 backdrop-blur-sm border border-white/10 flex items-center justify-center">
                    <svg className="w-3 h-3 text-white/75" viewBox="0 0 24 24" fill="currentColor">
                      <path fillRule="evenodd" d="M12 1a5 5 0 0 0-5 5v2H6a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V10a2 2 0 0 0-2-2h-1V6a5 5 0 0 0-5-5zm3 7V6a3 3 0 1 0-6 0v2h6z" clipRule="evenodd" />
                    </svg>
                  </div>
                  {/* Info */}
                  <div className="absolute bottom-0 left-0 right-0 p-2.5">
                    <p className="text-white text-xs font-semibold leading-tight">{p.age} yrs</p>
                    <p className="text-white/60 text-[10px] truncate">{p.loc}</p>
                  </div>
                </div>
              </Link>
            ))}
          </div>

          {/* CTA */}
          <div className="block sm:hidden mt-7 text-center">
            <Link
              to="/profiles"
              className="inline-flex items-center gap-2 bg-rose-500 hover:bg-rose-600 text-white font-semibold px-6 py-2.5 rounded-xl text-sm transition-colors shadow-lg shadow-rose-500/25"
            >
              View All Profiles
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </Link>
          </div>
        </div>
      </section>

      {/* ── How It Works ─────────────────────────────────────────────── */}
      <section className="bg-white py-20 sm:py-40 px-4">
        <div className="max-w-5xl mx-auto">
          {/* Header */}
          <div className="text-center mb-16">
            <span className="inline-block bg-rose-50 text-rose-500 text-xs font-semibold px-3 py-1 rounded-full mb-4 tracking-wide uppercase">
              Simple Process
            </span>
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900">{t.home.howItWorks}</h2>
            <p className="text-slate-500 mt-3 max-w-md mx-auto text-sm leading-relaxed">{t.home.howSubtitle}</p>
          </div>

          {/* Steps */}
          <div className="relative">
            {/* Connector line (desktop) */}
            <div className="hidden md:block absolute top-10 left-[calc(16.67%+1rem)] right-[calc(16.67%+1rem)] h-px bg-gradient-to-r from-rose-100 via-rose-300 to-rose-100" />

            <div className="grid md:grid-cols-3 gap-10 md:gap-6 relative">
              {[
                {
                  step: "01",
                  icon: (
                    <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0zM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                    </svg>
                  ),
                  title: t.home.step1Title,
                  desc: t.home.step1Desc,
                  color: "bg-rose-500",
                  light: "bg-rose-50 text-rose-500",
                },
                {
                  step: "02",
                  icon: (
                    <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607z" />
                    </svg>
                  ),
                  title: t.home.step2Title,
                  desc: t.home.step2Desc,
                  color: "bg-violet-500",
                  light: "bg-violet-50 text-violet-500",
                },
                {
                  step: "03",
                  icon: (
                    <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z" />
                    </svg>
                  ),
                  title: t.home.step3Title,
                  desc: t.home.step3Desc,
                  color: "bg-emerald-500",
                  light: "bg-emerald-50 text-emerald-500",
                },
              ].map((s) => (
                <div key={s.step} className="flex flex-col items-center text-center relative">
                  {/* Icon circle */}
                  <div className="relative mb-6">
                    <div className={`w-20 h-20 rounded-2xl ${s.light} flex items-center justify-center shadow-sm`}>
                      {s.icon}
                    </div>
                    {/* Step badge */}
                    <span className={`absolute -top-2 -right-2 w-6 h-6 rounded-full ${s.color} text-white text-[10px] font-bold flex items-center justify-center shadow-md`}>
                      {s.step}
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 mb-2">{s.title}</h3>
                  <p className="text-slate-500 text-sm leading-relaxed max-w-xs">{s.desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Bottom CTA */}
          {/* <div className="mt-16 rounded-3xl bg-gradient-to-br from-rose-500 to-rose-600 p-10 text-center text-white shadow-xl shadow-rose-200">
            <h3 className="text-2xl font-bold mb-2">Ready to get started?</h3>
            <p className="text-rose-100 text-sm mb-7 max-w-sm mx-auto">
              Join HanMatching today — create your profile and connect with verified agencies.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link
                to="/register"
                className="inline-flex items-center justify-center gap-2 bg-white text-rose-600 font-semibold px-6 py-2.5 rounded-xl text-sm hover:bg-rose-50 transition-colors shadow"
              >
                Create Profile
              </Link>
              <Link
                to="/agency/register"
                className="inline-flex items-center justify-center gap-2 bg-rose-400/30 hover:bg-rose-400/50 text-white font-semibold px-6 py-2.5 rounded-xl text-sm transition-colors border border-white/20"
              >
                Register Agency
              </Link>
            </div>
          </div> */}
        </div>
      </section>

      <Footer />
    </div>
  );
}
