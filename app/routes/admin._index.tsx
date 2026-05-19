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
    totalApplicants,
    activeApplicants,
    pendingApplicants,
    totalAgencies,
    activeAgencies,
    pendingPayments,
    verifiedPayments,
    revenueAgg,
    recentApplicants,
    recentPayments,
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
      where: {},
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

export default function AdminIndex({ loaderData }: Route.ComponentProps) {
  const { stats, recentApplicants, recentPayments } = loaderData;

  const statCards = [
    { label: "Total Applicants", value: stats.totalApplicants, sub: `${stats.activeApplicants} active`, color: "text-rose-500", icon: "👥" },
    { label: "Pending Review", value: stats.pendingApplicants, sub: "need approval", color: "text-amber-500", icon: "⏳" },
    { label: "Total Agencies", value: stats.totalAgencies, sub: `${stats.activeAgencies} active`, color: "text-blue-500", icon: "🏢" },
    { label: "Pending Payments", value: stats.pendingPayments, sub: "awaiting verification", color: "text-orange-500", icon: "💳" },
    { label: "Verified Payments", value: stats.verifiedPayments, sub: "total transactions", color: "text-green-500", icon: "✅" },
    { label: "Total Revenue", value: `$${stats.totalRevenue.toLocaleString()}`, sub: "from memberships", color: "text-indigo-500", icon: "💰" },
  ];

  return (
    <AdminLayout>
      <div className="max-w-7xl mx-auto px-6 py-8">
        <h1 className="text-2xl font-bold text-slate-900 mb-8">Dashboard</h1>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
          {statCards.map((stat) => (
            <Card key={stat.label}>
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs text-slate-500 mb-1">{stat.label}</p>
                  <p className={`text-2xl font-extrabold ${stat.color}`}>{stat.value}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{stat.sub}</p>
                </div>
                <span className="text-2xl opacity-70">{stat.icon}</span>
              </div>
            </Card>
          ))}
        </div>

        <div className="grid md:grid-cols-4 gap-3 mb-8">
          {[
            { label: "Manage Applicants", to: "/admin/applicants", icon: "👥", color: "bg-rose-50 text-rose-600 hover:bg-rose-100" },
            { label: "Manage Agencies", to: "/admin/agencies", icon: "🏢", color: "bg-blue-50 text-blue-600 hover:bg-blue-100" },
            { label: "Verify Payments", to: "/admin/payments", icon: "💳", color: "bg-green-50 text-green-600 hover:bg-green-100" },
            { label: "Membership Packages", to: "/admin/packages", icon: "📦", color: "bg-purple-50 text-purple-600 hover:bg-purple-100" },
          ].map((action) => (
            <Link key={action.label} to={action.to} className={`flex items-center gap-3 p-4 rounded-xl font-medium text-sm transition-colors ${action.color}`}>
              <span className="text-xl">{action.icon}</span>{action.label}
            </Link>
          ))}
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Recent Applicants</CardTitle>
                <Link to="/admin/applicants" className="text-xs text-rose-500 hover:text-rose-600">View all →</Link>
              </div>
            </CardHeader>
            <div className="space-y-3">
              {recentApplicants.map((user) => (
                <Link key={user.id} to={`/admin/applicants/${user.id}`} className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-50">
                  <div><p className="text-sm font-medium text-slate-900">{user.profileId}</p><p className="text-xs text-slate-500">{user.fullName}</p></div>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${user.status === "active" ? "bg-green-100 text-green-700" : user.status === "pending" ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700"}`}>{user.status}</span>
                </Link>
              ))}
              {recentApplicants.length === 0 && <p className="text-sm text-slate-400 text-center py-4">No applicants yet</p>}
            </div>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Pending Payments</CardTitle>
                <Link to="/admin/payments" className="text-xs text-rose-500 hover:text-rose-600">View all →</Link>
              </div>
            </CardHeader>
            <div className="space-y-3">
              {recentPayments.map((payment) => (
                <div key={payment.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-50">
                  <div><p className="text-sm font-medium text-slate-900">{payment.agency?.companyName}</p><p className="text-xs text-slate-500">{payment.packageName}</p></div>
                  <span className="text-sm font-bold text-slate-900">${payment.amount}</span>
                </div>
              ))}
              {recentPayments.length === 0 && <p className="text-sm text-slate-400 text-center py-4">No pending payments</p>}
            </div>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
}
