import { Link, redirect } from "react-router";
import type { Route } from "./+types/agency.selections";
import { requireAgency } from "~/lib/auth.server";
import { Navbar } from "~/components/layout/Navbar";
import { Card } from "~/components/ui/Card";
import { Badge } from "~/components/ui/Badge";
import { formatDate } from "~/lib/utils";
import { useT } from "~/lib/i18n";
import { useAgencyRealtime } from "~/lib/pusher.realtime";
import { prisma } from "~/lib/prisma.server";

export function meta(_: Route.MetaArgs) {
  return [{ title: "My Selections — HanMatching.com" }];
}

export async function loader({ request }: Route.LoaderArgs) {
  const session = await requireAgency(request);
  const agency = await prisma.agency.findUnique({ where: { id: session.userId } });
  if (!agency) throw redirect("/agency/login");
  if (agency.status !== "active") throw redirect("/agency/dashboard");

  await prisma.selection.updateMany({
    where: { agencyId: session.userId, expiresAt: { lt: new Date() }, isActive: true },
    data: { isActive: false },
  });

  const selections = await prisma.selection.findMany({
    where: { agencyId: session.userId },
    include: { applicant: { select: { id: true, profileId: true, fullName: true, photos: true, age: true, occupation: true } } },
    orderBy: { selectedAt: "desc" },
  });

  return { selections, agency };
}

export default function AgencySelections({ loaderData }: Route.ComponentProps) {
  const { selections, agency } = loaderData;
  const active = selections.filter((s) => s.isActive);
  const expired = selections.filter((s) => !s.isActive);
  const t = useT();
  useAgencyRealtime(agency.id);

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <Navbar user={{ role: "agency", companyName: agency.companyName }} />
      <main className="flex-1 max-w-5xl mx-auto w-full px-4 py-8">
        <div className="flex items-center gap-3 mb-6">
          <Link to="/agency/dashboard" className="text-slate-400 hover:text-slate-600 text-sm">{t.agencySelections.backBtn}</Link>
          <span className="text-slate-300">/</span>
          <h1 className="text-xl font-bold text-slate-900">{t.agencySelections.title}</h1>
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800 mb-6">
          {t.agencySelections.infoMsg} <strong>{t.agencySelections.infoMonths}</strong>{t.agencySelections.infoMsgSuffix}
        </div>

        <div className="mb-8">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">{t.agencySelections.activeTitle} ({active.length})</h2>
          {active.length === 0 ? (
            <Card className="text-center py-10 text-slate-400">
              <p className="text-3xl mb-2">⭐</p>
              <p className="text-sm">{t.agencySelections.noActiveSelections}</p>
              <Link to="/agency/search" className="mt-3 inline-block text-rose-500 text-sm hover:text-rose-600">{t.agencySelections.browseProfiles}</Link>
            </Card>
          ) : (
            <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4">
              {active.map((sel) => {
                const daysLeft = Math.ceil((new Date(sel.expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
                return (
                  <Link key={sel.id} to={`/agency/profile/${sel.applicant.id}`}>
                    <div className="bg-white rounded-2xl overflow-hidden border border-slate-100 hover:border-rose-200 hover:shadow-md transition-all">
                      <div className="aspect-[3/4] bg-slate-100 relative">
                        {sel.applicant.photos?.[0] ? <img src={sel.applicant.photos[0]} alt={sel.applicant.profileId} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-slate-300 text-4xl">👤</div>}
                        <div className={`absolute top-2 right-2 text-xs px-2 py-0.5 rounded-full font-medium ${daysLeft <= 30 ? "bg-red-500 text-white" : "bg-rose-500 text-white"}`}>{daysLeft}{t.agencySelections.daysLeft}</div>
                      </div>
                      <div className="p-3">
                        <p className="font-semibold text-sm text-slate-900">{sel.applicant.profileId}</p>
                        <p className="text-xs text-slate-500 mt-0.5">{sel.applicant.age} {t.agencySelections.yrs} · {sel.applicant.occupation}</p>
                        <p className="text-xs text-slate-400 mt-1">{t.agencySelections.expires} {formatDate(sel.expiresAt)}</p>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        {expired.length > 0 && (
          <div>
            <h2 className="text-lg font-semibold text-slate-700 mb-4">{t.agencySelections.expiredTitle} ({expired.length})</h2>
            <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4">
              {expired.map((sel) => (
                <div key={sel.id} className="bg-white rounded-2xl overflow-hidden border border-slate-100 opacity-60">
                  <div className="aspect-[3/4] bg-slate-100 relative">
                    {sel.applicant.photos?.[0] ? <img src={sel.applicant.photos[0]} alt={sel.applicant.profileId} className="w-full h-full object-cover grayscale" /> : <div className="w-full h-full flex items-center justify-center text-slate-300 text-4xl">👤</div>}
                    <div className="absolute inset-0 bg-black/20 flex items-center justify-center"><Badge variant="default">{t.agencySelections.expired}</Badge></div>
                  </div>
                  <div className="p-3">
                    <p className="font-semibold text-sm text-slate-700">{sel.applicant.profileId}</p>
                    <p className="text-xs text-slate-400 mt-1">{t.agencySelections.expired} {formatDate(sel.expiresAt)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
