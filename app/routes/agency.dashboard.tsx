import { Link, redirect, Form } from "react-router";
import type { Route } from "./+types/agency.dashboard";
import { requireAgency } from "~/lib/auth.server";
import { Navbar } from "~/components/layout/Navbar";
import { Card, CardHeader, CardTitle, CardDescription } from "~/components/ui/Card";
import { Badge, statusBadge } from "~/components/ui/Badge";
import { Button } from "~/components/ui/Button";
import { formatDate } from "~/lib/utils";
import { useT } from "~/lib/i18n";
import { prisma } from "~/lib/prisma.server";

export function meta(_: Route.MetaArgs) {
  return [{ title: "Agency Dashboard — HanMatching.com" }];
}

export async function loader({ request }: Route.LoaderArgs) {
  const session = await requireAgency(request);

  const agency = await prisma.agency.findUnique({ where: { id: session.userId } });
  if (!agency) throw redirect("/agency/login");

  // Pending / suspended agencies only get basic info — no profile data
  if (agency.status !== "active") {
    return { agency, recentProfiles: [], activeSelections: [], hasMembership: false, pendingPayment: false };
  }

  const [recentProfiles, activeSelections, pendingPayment] = await Promise.all([
    prisma.user.findMany({
      where: { status: "active" },
      select: { id: true, profileId: true, fullName: true, photos: true, age: true, height: true, occupation: true },
      orderBy: { createdAt: "desc" },
      take: 12,
    }),
    prisma.selection.findMany({
      where: { agencyId: session.userId, isActive: true },
      include: { applicant: { select: { id: true, profileId: true, fullName: true, photos: true } } },
    }),
    prisma.payment.findFirst({ where: { agencyId: session.userId, status: "pending" } }),
  ]);

  const hasMembership = agency.membershipExpiresAt && new Date(agency.membershipExpiresAt) > new Date();

  return { agency, recentProfiles, activeSelections, hasMembership, pendingPayment: !!pendingPayment };
}

// ── Pending / Suspended gate ─────────────────────────────────────────────────
function AgencyGate({ agency }: { agency: { companyName: string; agencyId: string; status: string } }) {
  const isPending = agency.status === "pending";

  return (
    <div className="flex-1 flex items-center justify-center px-4 py-20">
      <div className="max-w-md w-full text-center">
        <div className={`inline-flex items-center justify-center w-20 h-20 rounded-2xl mb-6 text-4xl ${isPending ? "bg-amber-100" : "bg-red-100"}`}>
          {isPending ? "⏳" : "🚫"}
        </div>
        <h2 className="text-2xl font-bold text-slate-900 mb-3">
          {isPending ? "Account Pending Approval" : "Account Suspended"}
        </h2>
        <p className="text-slate-500 mb-8 leading-relaxed">
          {isPending
            ? "Your agency account has been submitted and is awaiting review by our admin team. You'll have full access once approved."
            : "Your agency account has been suspended. Please contact our support team for assistance."}
        </p>
        <div className={`rounded-xl p-4 text-sm mb-8 ${isPending ? "bg-amber-50 border border-amber-200 text-amber-800" : "bg-red-50 border border-red-200 text-red-700"}`}>
          <p className="font-medium">{agency.companyName}</p>
          <p className="opacity-75 mt-0.5">Agency ID: {agency.agencyId}</p>
        </div>
        <Form method="post" action="/agency/logout">
          <button type="submit" className="text-sm text-slate-500 hover:text-slate-700 transition-colors">
            Sign out
          </button>
        </Form>
      </div>
    </div>
  );
}

// ── Main dashboard ────────────────────────────────────────────────────────────
export default function AgencyDashboard({ loaderData }: Route.ComponentProps) {
  const { agency, recentProfiles, activeSelections, hasMembership, pendingPayment } = loaderData;
  const t = useT();

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <Navbar user={{ role: "agency", companyName: agency.companyName }} />

      {/* Gate for pending / suspended agencies */}
      {agency.status !== "active" ? (
        <AgencyGate agency={agency} />
      ) : (
        <main className="flex-1 max-w-6xl mx-auto w-full px-4 py-8">
          <div className="flex items-start justify-between mb-8">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">{agency.companyName}</h1>
              <p className="text-slate-500 text-sm">{t.agencyDashboard.agencyIdLabel} <span className="font-semibold">{agency.agencyId}</span></p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={statusBadge(agency.status)}>{agency.status}</Badge>
              {agency.isVerified && <Badge variant="success">{t.agencyDashboard.verified}</Badge>}
            </div>
          </div>

          {!hasMembership && (
            <div className={`mb-6 p-5 rounded-2xl border ${pendingPayment ? "bg-amber-50 border-amber-200" : "bg-rose-50 border-rose-200"}`}>
              <div className="flex items-start gap-4">
                <span className="text-2xl">{pendingPayment ? "⏳" : "🔒"}</span>
                <div className="flex-1">
                  <h3 className="font-semibold text-slate-900">{pendingPayment ? t.agencyDashboard.paymentUnderReview : t.agencyDashboard.membershipRequired}</h3>
                  <p className="text-sm text-slate-600 mt-1">{pendingPayment ? t.agencyDashboard.paymentUnderReviewDesc : t.agencyDashboard.membershipRequiredDesc}</p>
                </div>
                {!pendingPayment && <Link to="/agency/membership"><Button size="sm">{t.agencyDashboard.viewPackages}</Button></Link>}
              </div>
            </div>
          )}

          {hasMembership && (
            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-xl text-sm text-green-800 flex items-center gap-3">
              <span className="text-lg">✅</span>
              <span>{t.agencyDashboard.activeMembershipMsg} <strong>{formatDate(agency.membershipExpiresAt!)}</strong></span>
            </div>
          )}

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            {[
              { label: t.agencyDashboard.totalApplicants, value: recentProfiles.length, icon: "👥" },
              { label: t.agencyDashboard.mySelections, value: activeSelections.length, icon: "⭐" },
              { label: t.agencyDashboard.membership, value: hasMembership ? t.agencyDashboard.active : t.agencyDashboard.none, icon: "🏅" },
              { label: t.agencyDashboard.statusLabel, value: agency.isVerified ? t.agencyDashboard.verified : t.agencyDashboard.pending, icon: "✅" },
            ].map((stat) => (
              <Card key={stat.label} className="text-center">
                <div className="text-2xl mb-1">{stat.icon}</div>
                <div className="text-2xl font-bold text-slate-900">{stat.value}</div>
                <div className="text-xs text-slate-500">{stat.label}</div>
              </Card>
            ))}
          </div>

          {activeSelections.length > 0 && (
            <div className="mb-8">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-slate-900">{t.agencyDashboard.mySelectedCandidates}</h2>
                <Link to="/agency/selections" className="text-sm text-rose-500 hover:text-rose-600">{t.agencyDashboard.viewAll}</Link>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {activeSelections.slice(0, 4).map((sel) => (
                  <Link key={sel.id} to={`/agency/profile/${sel.applicant.id}`}>
                    <div className="bg-white rounded-2xl overflow-hidden border border-slate-100 hover:border-rose-200 hover:shadow-md transition-all duration-200">
                      <div className="aspect-[3/4] bg-slate-100 relative">
                        {sel.applicant.photos?.[0]
                          ? <img src={sel.applicant.photos[0]} alt={sel.applicant.profileId} className="w-full h-full object-cover" />
                          : <div className="w-full h-full flex items-center justify-center text-slate-300 text-4xl">👤</div>}
                        <div className="absolute top-2 right-2 bg-rose-500 text-white text-xs px-2 py-0.5 rounded-full">{t.agencyDashboard.selected}</div>
                      </div>
                      <div className="p-3">
                        <p className="font-semibold text-sm text-slate-900">{sel.applicant.profileId}</p>
                        <p className="text-xs text-slate-500 mt-0.5">{t.agencyDashboard.expires} {formatDate(sel.expiresAt)}</p>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-slate-900">{t.agencyDashboard.browseApplicants}</h2>
              <Link to="/agency/search" className="text-sm text-rose-500 hover:text-rose-600">{t.agencyDashboard.searchFilter}</Link>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {recentProfiles.map((profile) => (
                <Link key={profile.id} to={hasMembership ? `/agency/profile/${profile.id}` : "#"}>
                  <div className={`bg-white rounded-2xl overflow-hidden border border-slate-100 hover:shadow-md transition-all duration-200 ${hasMembership ? "hover:border-rose-200" : "cursor-default"}`}>
                    <div className="aspect-[3/4] bg-slate-100 relative">
                      {profile.photos?.[0]
                        ? <img src={profile.photos[0]} alt={profile.profileId} className="w-full h-full object-cover" />
                        : <div className="w-full h-full flex items-center justify-center text-slate-300 text-4xl">👤</div>}
                      {!hasMembership && <div className="absolute inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center"><span className="text-white text-2xl">🔒</span></div>}
                    </div>
                    <div className="p-3">
                      <p className="font-semibold text-sm text-slate-900">{profile.profileId}</p>
                      {hasMembership
                        ? <p className="text-xs text-slate-500 mt-0.5">{profile.age ? `${profile.age} yrs` : ""}{profile.occupation ? ` · ${profile.occupation}` : ""}</p>
                        : <p className="text-xs text-slate-400 mt-0.5">{t.agencyDashboard.membersOnly}</p>}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
            {recentProfiles.length === 0 && <div className="text-center py-16 text-slate-400"><p className="text-4xl mb-3">👥</p><p>{t.agencyDashboard.noApplicants}</p></div>}
          </div>
        </main>
      )}
    </div>
  );
}
