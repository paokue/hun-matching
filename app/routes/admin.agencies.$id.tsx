import { Link } from "react-router";
import type { Route } from "./+types/admin.agencies.$id";
import { requireAdmin } from "~/lib/auth.server";
import { AdminLayout } from "~/components/layout/AdminLayout";
import { Card, CardHeader, CardTitle } from "~/components/ui/Card";
import { Badge, statusBadge } from "~/components/ui/Badge";
import { formatDate } from "~/lib/utils";
import { prisma } from "~/lib/prisma.server";

export function meta({ data }: Route.MetaArgs) {
  return [{ title: `${data?.agency?.companyName ?? "Agency"} — Admin` }];
}

export async function loader({ request, params }: Route.LoaderArgs) {
  await requireAdmin(request);

  const agency = await prisma.agency.findUnique({
    where: { id: params.id },
    include: {
      payments: {
        where: { status: "verified" },
        orderBy: { membershipEndDate: "desc" },
        take: 1,
        select: { packageName: true, membershipEndDate: true, amount: true },
      },
      _count: { select: { selections: { where: { isActive: true } } } },
    },
  });
  if (!agency) throw new Response("Agency not found", { status: 404 });

  const selections = await prisma.selection.findMany({
    where: { agencyId: params.id, isActive: true },
    include: {
      applicant: {
        select: { id: true, profileId: true, fullName: true, age: true, phone: true, status: true, photos: true, profileImage: true, ethnicity: true },
      },
    },
    orderBy: { selectedAt: "desc" },
  });

  return { agency, selections };
}

function Avatar({ src, size = 40 }: { src?: string | null; size?: number }) {
  if (src) return <img src={src} alt="" className="rounded-full object-cover flex-shrink-0" style={{ width: size, height: size }} />;
  return (
    <div className="rounded-full bg-slate-100 flex items-center justify-center text-slate-400 flex-shrink-0" style={{ width: size, height: size }}>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} style={{ width: size * 0.55, height: size * 0.55 }}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M16 14a4 4 0 10-8 0M20 21a8 8 0 10-16 0M12 11a3 3 0 100-6 3 3 0 000 6z" />
      </svg>
    </div>
  );
}

export default function AdminAgencyDetail({ loaderData }: Route.ComponentProps) {
  const { agency, selections } = loaderData;
  const isActive = agency.membershipExpiresAt && new Date(agency.membershipExpiresAt) > new Date();
  const pkg = isActive ? agency.payments?.[0]?.packageName : null;

  return (
    <AdminLayout>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <div className="flex items-center gap-3 mb-6">
          <Link to="/admin/agencies" className="text-slate-400 hover:text-slate-600 text-sm">← Agencies</Link>
          <span className="text-slate-300">/</span>
          <h1 className="text-xl font-bold text-slate-900 truncate">{agency.companyName}</h1>
        </div>

        {/* Agency summary */}
        <Card className="mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <p className="text-xs text-slate-400 mb-1">{agency.agencyId}</p>
              <p className="font-semibold text-slate-900 text-lg">{agency.companyName}</p>
              <p className="text-sm text-slate-500">{agency.email}</p>
            </div>
            <div className="flex flex-wrap items-center gap-3 text-sm">
              <div>
                <p className="text-xs text-slate-400">Status</p>
                <Badge variant={statusBadge(agency.status)}>{agency.status}</Badge>
              </div>
              <div>
                <p className="text-xs text-slate-400">Verified</p>
                {agency.isVerified ? <Badge variant="success">Yes</Badge> : <span className="text-xs text-slate-400">No</span>}
              </div>
              <div>
                <p className="text-xs text-slate-400">Plan</p>
                {pkg
                  ? <span className="text-xs font-medium px-2 py-0.5 bg-rose-50 text-rose-600 rounded-full">{pkg}</span>
                  : <span className="text-xs text-slate-400">—</span>}
              </div>
              <div>
                <p className="text-xs text-slate-400">Membership</p>
                <p className="text-xs text-slate-700">
                  {isActive ? `Active until ${formatDate(agency.membershipExpiresAt!)}` : "None"}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-400">Selected</p>
                <p className="text-lg font-bold text-rose-500">{agency._count?.selections ?? 0}</p>
              </div>
            </div>
          </div>
        </Card>

        {/* Selected applicants */}
        <Card padding="none">
          <CardHeader className="px-4 sm:px-6 pt-4 sm:pt-5 !mb-0">
            <CardTitle>Selected Applicants ({selections.length})</CardTitle>
          </CardHeader>

          {selections.length === 0 ? (
            <div className="text-center py-12 text-slate-400 text-sm">No active selections for this agency.</div>
          ) : (
            <>
              {/* Desktop table */}
              <div className="hidden md:block overflow-x-auto mt-4">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 border-b border-slate-100">
                    <tr>
                      <th className="text-left px-4 py-3 font-medium text-slate-600 w-12">#</th>
                      <th className="text-left px-4 py-3 font-medium text-slate-600">Applicant</th>
                      <th className="text-left px-4 py-3 font-medium text-slate-600">Phone</th>
                      <th className="text-left px-4 py-3 font-medium text-slate-600">Age</th>
                      <th className="text-left px-4 py-3 font-medium text-slate-600">Ethnicity</th>
                      <th className="text-left px-4 py-3 font-medium text-slate-600">Status</th>
                      <th className="text-left px-4 py-3 font-medium text-slate-600">Selected</th>
                      <th className="text-left px-4 py-3 font-medium text-slate-600">Expires</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {selections.map((sel, i) => {
                      const u = sel.applicant;
                      return (
                        <tr key={sel.id} className="hover:bg-slate-50">
                          <td className="px-4 py-3 text-slate-400 text-xs">{i + 1}</td>
                          <td className="px-4 py-3">
                            <Link to={`/admin/applicants/${u.id}`} className="flex items-center gap-3 hover:underline">
                              <Avatar src={u.profileImage || u.photos?.[0]} size={36} />
                              <div>
                                <p className="font-medium text-slate-900">{u.profileId}</p>
                                <p className="text-xs text-slate-500">{u.fullName}</p>
                              </div>
                            </Link>
                          </td>
                          <td className="px-4 py-3 text-slate-600">{u.phone}</td>
                          <td className="px-4 py-3 text-slate-600">{u.age ?? "—"}</td>
                          <td className="px-4 py-3 text-slate-600">{u.ethnicity || "—"}</td>
                          <td className="px-4 py-3"><Badge variant={statusBadge(u.status)}>{u.status}</Badge></td>
                          <td className="px-4 py-3 text-xs text-slate-500">{formatDate(sel.selectedAt)}</td>
                          <td className="px-4 py-3 text-xs text-slate-500">{formatDate(sel.expiresAt)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile card list */}
              <div className="md:hidden p-4 space-y-3">
                {selections.map((sel, i) => {
                  const u = sel.applicant;
                  return (
                    <Link key={sel.id} to={`/admin/applicants/${u.id}`} className="block">
                      <div className="rounded-xl border border-slate-100 p-3 hover:bg-slate-50 transition-colors">
                        <div className="flex items-start gap-3">
                          <span className="text-xs text-slate-400 mt-1 shrink-0">#{i + 1}</span>
                          <Avatar src={u.profileImage || u.photos?.[0]} size={42} />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <p className="font-semibold text-slate-900 truncate">{u.profileId}</p>
                              <Badge variant={statusBadge(u.status)}>{u.status}</Badge>
                            </div>
                            <p className="text-sm text-slate-500 truncate">{u.fullName}</p>
                            <p className="text-xs text-slate-400 mt-0.5">{u.phone} · {u.age ? `${u.age} yrs` : "—"} · {u.ethnicity || "—"}</p>
                            <p className="text-xs text-slate-400 mt-1">Selected {formatDate(sel.selectedAt)} · Expires {formatDate(sel.expiresAt)}</p>
                          </div>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </>
          )}
        </Card>
      </div>
    </AdminLayout>
  );
}
