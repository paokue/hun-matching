import { Link } from "react-router";
import type { Route } from "./+types/admin._index";
import { requireAdmin } from "~/lib/auth.server";
import { AdminLayout } from "~/components/layout/AdminLayout";
import { Card, CardHeader, CardTitle } from "~/components/ui/Card";
import { prisma } from "~/lib/prisma.server";

export function meta(_: Route.MetaArgs) {
  return [{ title: "Admin Dashboard — HanMatching.com" }];
}

export async function loader({ request }: Route.LoaderArgs) {
  await requireAdmin(request);

  const [
    totalApplicants, activeApplicants, pendingApplicants,
    totalAgencies, activeAgencies,
    pendingPayments, verifiedPayments,
    revenueAgg, recentApplicants, recentPayments,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { status: "active" } }),
    prisma.user.count({ where: { status: "pending" } }),
    prisma.agency.count(),
    prisma.agency.count({ where: { status: "active" } }),
    prisma.payment.count({ where: { status: "pending" } }),
    prisma.payment.count({ where: { status: "verified" } }),
    prisma.payment.aggregate({ where: { status: "verified" }, _sum: { amount: true } }),
    prisma.user.findMany({
      select: { id: true, profileId: true, fullName: true, status: true, createdAt: true },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
    prisma.payment.findMany({
      where: { status: "pending" },
      include: { agency: { select: { companyName: true } } },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
  ]);

  return {
    stats: {
      totalApplicants, activeApplicants, pendingApplicants,
      totalAgencies, activeAgencies, pendingPayments, verifiedPayments,
      totalRevenue: revenueAgg._sum.amount ?? 0,
    },
    recentApplicants,
    recentPayments,
  };
}

const ICON = {
  users: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a4 4 0 00-5-3.87M9 20H4v-2a4 4 0 015-3.87m6-4.13a4 4 0 11-8 0 4 4 0 018 0zm6-4a4 4 0 11-8 0 4 4 0 018 0z" />
    </svg>
  ),
  clock: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  building: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 21h18M5 21V7l7-4 7 4v14" />
    </svg>
  ),
  card: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M5 6h14a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2z" />
    </svg>
  ),
  check: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  cash: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.66 0-3 .9-3 2s1.34 2 3 2 3 .9 3 2-1.34 2-3 2m0-8V6m0 12v-2m9-4a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  pkg: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 8l-9-5-9 5m18 0l-9 5m9-5v8l-9 5m0-13L3 8m9 5v8M3 8v8l9 5" />
    </svg>
  ),
};

function StatusPill({ status }: { status: string }) {
  const cls = status === "active" ? "bg-emerald-50 text-emerald-700"
    : status === "pending" ? "bg-amber-50 text-amber-700"
      : status === "suspended" ? "bg-red-50 text-red-700"
        : "bg-slate-100 text-slate-600";
  return <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${cls}`}>{status}</span>;
}

export default function AdminIndex({ loaderData }: Route.ComponentProps) {
  const { stats, recentApplicants, recentPayments } = loaderData;

  const statCards = [
    { label: "Total Applicants", value: stats.totalApplicants, sub: `${stats.activeApplicants} active`, color: "text-rose-500", bg: "bg-rose-50", icon: ICON.users },
    { label: "Pending Review", value: stats.pendingApplicants, sub: "need approval", color: "text-amber-500", bg: "bg-amber-50", icon: ICON.clock },
    { label: "Total Agencies", value: stats.totalAgencies, sub: `${stats.activeAgencies} active`, color: "text-blue-500", bg: "bg-blue-50", icon: ICON.building },
    { label: "Pending Payments", value: stats.pendingPayments, sub: "awaiting verification", color: "text-orange-500", bg: "bg-orange-50", icon: ICON.card },
    { label: "Verified Payments", value: stats.verifiedPayments, sub: "total transactions", color: "text-emerald-500", bg: "bg-emerald-50", icon: ICON.check },
    { label: "Total Revenue", value: `$${stats.totalRevenue.toLocaleString()}`, sub: "from memberships", color: "text-indigo-500", bg: "bg-indigo-50", icon: ICON.cash },
  ];

  const quickActions = [
    { label: "Manage Applicants", to: "/admin/applicants", icon: ICON.users, color: "bg-rose-50 text-rose-600 border border-rose-300 hover:bg-rose-100" },
    { label: "Manage Agencies", to: "/admin/agencies", icon: ICON.building, color: "bg-blue-50 text-blue-600 border border-blue-300 hover:bg-blue-100" },
    { label: "Verify Payments", to: "/admin/payments", icon: ICON.card, color: "bg-emerald-50 text-emerald-600 border border-emerald-300 hover:bg-emerald-100" },
    { label: "Membership Packages", to: "/admin/packages", icon: ICON.pkg, color: "bg-violet-50 text-violet-600 border border-violet-300 hover:bg-violet-100" },
  ];

  return (
    <AdminLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900 mb-6">Dashboard</h1>

        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 mb-8">
          {statCards.map((s) => (
            <Card key={s.label}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs text-slate-500 mb-1 truncate">{s.label}</p>
                  <p className={`text-xl sm:text-2xl font-extrabold ${s.color}`}>{s.value}</p>
                  <p className="text-xs text-slate-400 mt-0.5 truncate">{s.sub}</p>
                </div>
                <div className={`w-9 h-9 rounded-lg ${s.bg} ${s.color} flex items-center justify-center flex-shrink-0`}>{s.icon}</div>
              </div>
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
          {quickActions.map((a) => (
            <Link key={a.label} to={a.to} className={`flex items-center gap-3 p-4 rounded-md font-medium text-sm transition-colors ${a.color}`}>
              <span className="flex-shrink-0">{a.icon}</span>
              <span className="truncate">{a.label}</span>
            </Link>
          ))}
        </div>

        <div className="hidden md:grid md:grid-cols-2 gap-4 sm:gap-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Recent Applicants</CardTitle>
                <Link to="/admin/applicants" className="text-xs text-rose-500 hover:text-rose-600 font-medium">View all →</Link>
              </div>
            </CardHeader>
            <div className="space-y-1">
              {recentApplicants.map((user) => (
                <Link key={user.id} to={`/admin/applicants/${user.id}`} className="flex items-center justify-between p-2.5 rounded-lg hover:bg-slate-50 transition-colors">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-900 truncate">{user.profileId}</p>
                    <p className="text-xs text-slate-500 truncate">{user.fullName}</p>
                  </div>
                  <StatusPill status={user.status} />
                </Link>
              ))}
              {recentApplicants.length === 0 && <p className="text-sm text-slate-400 text-center py-6">No applicants yet</p>}
            </div>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Pending Payments</CardTitle>
                <Link to="/admin/payments" className="text-xs text-rose-500 hover:text-rose-600 font-medium">View all →</Link>
              </div>
            </CardHeader>
            <div className="space-y-1">
              {recentPayments.map((payment) => (
                <div key={payment.id} className="flex items-center justify-between p-2.5 rounded-lg hover:bg-slate-50 transition-colors">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-900 truncate">{payment.agency?.companyName}</p>
                    <p className="text-xs text-slate-500 truncate">{payment.packageName}</p>
                  </div>
                  <span className="text-sm font-bold text-slate-900 shrink-0">${payment.amount}</span>
                </div>
              ))}
              {recentPayments.length === 0 && <p className="text-sm text-slate-400 text-center py-6">No pending payments</p>}
            </div>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
}
