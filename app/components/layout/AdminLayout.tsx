import { useEffect } from "react";
import { Form, NavLink, Link, useFetcher, useRevalidator } from "react-router";
import { toast } from "sonner";
import type { loader as badgesLoader } from "~/routes/admin.badges";
import { usePusherChannel, playNotifySound, PUSHER_CHANNELS, PUSHER_EVENTS } from "~/lib/pusher.realtime";
import { useT } from "~/lib/i18n";

type BadgeKey = "applicants" | "agencies" | "payments";

const NAV_LINKS: Array<{ to: string; end?: boolean; label: string; icon: React.ReactNode; badgeKey?: BadgeKey }> = [
  {
    to: "/admin",
    end: true,
    label: "Dashboard",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l9-9 9 9M5 10v10a1 1 0 001 1h3v-6h6v6h3a1 1 0 001-1V10" />
      </svg>
    ),
  },
  {
    to: "/admin/applicants",
    label: "Applicants",
    badgeKey: "applicants",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a4 4 0 00-5-3.87M9 20H4v-2a4 4 0 015-3.87m6-4.13a4 4 0 11-8 0 4 4 0 018 0zm6-4a4 4 0 11-8 0 4 4 0 018 0z" />
      </svg>
    ),
  },
  {
    to: "/admin/agencies",
    label: "Agencies",
    badgeKey: "agencies",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 21h18M5 21V7l7-4 7 4v14M9 9h.01M9 13h.01M9 17h.01M15 9h.01M15 13h.01M15 17h.01" />
      </svg>
    ),
  },
  {
    to: "/admin/payments",
    label: "Payments",
    badgeKey: "payments",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M5 6h14a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2zM7 15h4" />
      </svg>
    ),
  },
  {
    to: "/admin/packages",
    label: "Packages",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 8l-9-5-9 5m18 0l-9 5m9-5v8l-9 5m0-13L3 8m9 5v8M3 8v8l9 5" />
      </svg>
    ),
  },
];

type Badges = { applicants: number; agencies: number; payments: number };

function CountBadge({ n, size = "md" }: { n: number; size?: "sm" | "md" }) {
  if (!n || n <= 0) return null;
  const cls = size === "sm"
    ? "min-w-[16px] h-4 px-1 text-[10px]"
    : "min-w-[18px] h-[18px] px-1.5 text-[11px]";
  return (
    <span className={`inline-flex items-center justify-center ${cls} rounded-full bg-rose-500 text-white font-bold leading-none shadow-sm`}>
      {n > 99 ? "99+" : n}
    </span>
  );
}

function useAdminBadges(): Badges {
  const fetcher = useFetcher<typeof badgesLoader>();
  const revalidator = useRevalidator();
  const t = useT();

  // Initial load
  useEffect(() => {
    if (fetcher.state === "idle" && !fetcher.data) fetcher.load("/admin/badges");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Shared refresh: badges + the currently-displayed page's loader.
  const refresh = () => {
    fetcher.load("/admin/badges");
    revalidator.revalidate();
  };

  // Live updates: toast + sound on *Created events, silent refresh on *Status events.
  usePusherChannel(PUSHER_CHANNELS.admin, {
    [PUSHER_EVENTS.applicantCreated]: (data: unknown) => {
      const p = data as { fullName?: string | null };
      const msg = p.fullName
        ? t.realtime.newApplicantWithName.replace("{name}", p.fullName)
        : t.realtime.newApplicant;
      toast.info(msg);
      playNotifySound();
      refresh();
    },
    [PUSHER_EVENTS.applicantStatus]: () => refresh(),
    [PUSHER_EVENTS.agencyCreated]: (data: unknown) => {
      const p = data as { companyName?: string | null };
      const msg = p.companyName
        ? t.realtime.newAgencyWithName.replace("{name}", p.companyName)
        : t.realtime.newAgency;
      toast.info(msg);
      playNotifySound();
      refresh();
    },
    [PUSHER_EVENTS.agencyStatus]: () => refresh(),
    [PUSHER_EVENTS.paymentCreated]: (data: unknown) => {
      const p = data as { amount?: number };
      const msg = typeof p.amount === "number"
        ? t.realtime.newPaymentWithAmount.replace("{amount}", String(p.amount))
        : t.realtime.newPayment;
      toast.info(msg);
      playNotifySound();
      refresh();
    },
    [PUSHER_EVENTS.paymentStatus]: () => refresh(),
  });

  return fetcher.data ?? { applicants: 0, agencies: 0, payments: 0 };
}

function TopHeader({ badges }: { badges: Badges }) {
  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
        <Link to="/admin" className="flex items-center gap-2.5">
          <img src="/favicon.svg" alt="" className="w-8 h-8 shrink-0" />
          <div className="leading-tight">
            <p className="font-bold text-slate-900 text-sm">HanMatching</p>
            <p className="text-slate-400 text-[10px]">Admin</p>
          </div>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-1">
          {NAV_LINKS.map(({ to, end, label, icon, badgeKey }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive ? "bg-rose-50 text-rose-600" : "text-slate-600 hover:bg-slate-100"
                }`
              }
            >
              {icon}
              <span>{label}</span>
              {badgeKey && <CountBadge n={badges[badgeKey]} />}
            </NavLink>
          ))}
        </nav>

        {/* Logout */}
        <Form method="post" action="/admin/logout">
          <button
            type="submit"
            className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900 transition-colors px-2 py-1 rounded-lg"
            aria-label="Logout"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            <span className="hidden sm:inline">Logout</span>
          </button>
        </Form>
      </div>
    </header>
  );
}

function BottomNav({ badges }: { badges: Badges }) {
  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 bg-white border-t border-slate-200 z-30 pb-[env(safe-area-inset-bottom)]">
      <div className="grid grid-cols-5">
        {NAV_LINKS.map(({ to, end, label, icon, badgeKey }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `flex flex-col items-center justify-center gap-0.5 py-2 text-[10px] font-medium transition-colors ${
                isActive ? "text-rose-500" : "text-slate-500 hover:text-slate-800"
              }`
            }
          >
            <span className="relative">
              {icon}
              {badgeKey && badges[badgeKey] > 0 && (
                <span className="absolute -top-1 -right-2">
                  <CountBadge n={badges[badgeKey]} size="sm" />
                </span>
              )}
            </span>
            <span className="leading-none">{label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
}

interface AdminLayoutProps {
  children: React.ReactNode;
}

export function AdminLayout({ children }: AdminLayoutProps) {
  const badges = useAdminBadges();
  return (
    <div className="min-h-screen bg-slate-50">
      <TopHeader badges={badges} />
      <main className="pb-24 md:pb-10">{children}</main>
      <BottomNav badges={badges} />
    </div>
  );
}
