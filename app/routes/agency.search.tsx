import { Form, Link, useSearchParams, redirect } from "react-router";
import type { Route } from "./+types/agency.search";
import { requireAgency } from "~/lib/auth.server";
import { Navbar } from "~/components/layout/Navbar";
import { Input, Select } from "~/components/ui/Input";
import { Button } from "~/components/ui/Button";
import { Card } from "~/components/ui/Card";
import { OCCUPATIONS, MARITAL_STATUS, TATTOO_STATUS, ETHNICITIES, RELIGIONS } from "~/lib/utils";
import { useT } from "~/lib/i18n";
import { prisma } from "~/lib/prisma.server";

export function meta(_: Route.MetaArgs) {
  return [{ title: "Search Applicants — HanMatching.com" }];
}

export async function loader({ request }: Route.LoaderArgs) {
  const session = await requireAgency(request);
  const agency = await prisma.agency.findUnique({ where: { id: session.userId } });
  if (!agency) throw redirect("/agency/login");
  if (agency.status !== "active") throw redirect("/agency/dashboard");

  const hasMembership = agency.membershipExpiresAt && new Date(agency.membershipExpiresAt) > new Date();
  const url = new URL(request.url);

  const minAge = url.searchParams.get("minAge");
  const maxAge = url.searchParams.get("maxAge");
  const minHeight = url.searchParams.get("minHeight");
  const maxHeight = url.searchParams.get("maxHeight");
  const minWeight = url.searchParams.get("minWeight");
  const maxWeight = url.searchParams.get("maxWeight");
  const occupation = url.searchParams.get("occupation");
  const maritalStatus = url.searchParams.get("maritalStatus");
  const tattooStatus = url.searchParams.get("tattooStatus");
  const ethnicity = url.searchParams.get("ethnicity");
  const religion = url.searchParams.get("religion");
  const location = url.searchParams.get("location");

  const profiles = await prisma.user.findMany({
    where: {
      status: "active",
      ...(minAge || maxAge ? { age: { ...(minAge ? { gte: Number(minAge) } : {}), ...(maxAge ? { lte: Number(maxAge) } : {}) } } : {}),
      ...(minHeight || maxHeight ? { height: { ...(minHeight ? { gte: Number(minHeight) } : {}), ...(maxHeight ? { lte: Number(maxHeight) } : {}) } } : {}),
      ...(minWeight || maxWeight ? { weight: { ...(minWeight ? { gte: Number(minWeight) } : {}), ...(maxWeight ? { lte: Number(maxWeight) } : {}) } } : {}),
      ...(occupation ? { occupation } : {}),
      ...(maritalStatus ? { maritalStatus } : {}),
      ...(tattooStatus ? { tattooStatus } : {}),
      ...(ethnicity ? { ethnicity } : {}),
      ...(religion ? { religion } : {}),
      ...(location ? { currentAddress: { contains: location, mode: "insensitive" } } : {}),
    },
    select: { id: true, profileId: true, fullName: true, photos: true, age: true, height: true, weight: true, occupation: true, maritalStatus: true, tattooStatus: true, ethnicity: true, religion: true, currentAddress: true },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return { profiles, hasMembership, agency };
}

export default function AgencySearch({ loaderData }: Route.ComponentProps) {
  const { profiles, hasMembership, agency } = loaderData;
  const [searchParams] = useSearchParams();
  const t = useT();

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <Navbar user={{ role: "agency", companyName: agency.companyName }} />
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-slate-900">{t.agencySearch.title}</h1>
          <Link to="/agency/dashboard" className="text-sm text-slate-500 hover:text-slate-700">{t.agencySearch.backBtn}</Link>
        </div>

        <div className="grid md:grid-cols-4 gap-6">
          <div className="md:col-span-1">
            <Card padding="sm">
              <h2 className="font-semibold text-slate-900 mb-4 text-sm uppercase tracking-wide">{t.agencySearch.filtersTitle}</h2>
              <Form method="get" className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">{t.agencySearch.ageRange}</label>
                  <div className="flex gap-2">
                    <input type="number" name="minAge" placeholder={t.agencySearch.minPh} defaultValue={searchParams.get("minAge") ?? ""} className="w-full px-2 py-1.5 text-sm border border-slate-300 rounded-lg" min="18" max="60" />
                    <input type="number" name="maxAge" placeholder={t.agencySearch.maxPh} defaultValue={searchParams.get("maxAge") ?? ""} className="w-full px-2 py-1.5 text-sm border border-slate-300 rounded-lg" min="18" max="60" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">{t.agencySearch.heightLabel}</label>
                  <div className="flex gap-2">
                    <input type="number" name="minHeight" placeholder={t.agencySearch.minPh} defaultValue={searchParams.get("minHeight") ?? ""} className="w-full px-2 py-1.5 text-sm border border-slate-300 rounded-lg" />
                    <input type="number" name="maxHeight" placeholder={t.agencySearch.maxPh} defaultValue={searchParams.get("maxHeight") ?? ""} className="w-full px-2 py-1.5 text-sm border border-slate-300 rounded-lg" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">{t.agencySearch.weightLabel}</label>
                  <div className="flex gap-2">
                    <input type="number" name="minWeight" placeholder={t.agencySearch.minPh} defaultValue={searchParams.get("minWeight") ?? ""} className="w-full px-2 py-1.5 text-sm border border-slate-300 rounded-lg" />
                    <input type="number" name="maxWeight" placeholder={t.agencySearch.maxPh} defaultValue={searchParams.get("maxWeight") ?? ""} className="w-full px-2 py-1.5 text-sm border border-slate-300 rounded-lg" />
                  </div>
                </div>
                <Select label="" name="occupation" placeholder="Any Occupation" defaultValue={searchParams.get("occupation") ?? ""} options={OCCUPATIONS.map((o) => ({ value: o, label: o }))} />
                <Select label="" name="maritalStatus" placeholder="Any Marital Status" defaultValue={searchParams.get("maritalStatus") ?? ""} options={MARITAL_STATUS.map((s) => ({ value: s, label: s }))} />
                <Select label="" name="tattooStatus" placeholder="Any Tattoo Status" defaultValue={searchParams.get("tattooStatus") ?? ""} options={TATTOO_STATUS.map((s) => ({ value: s, label: s }))} />
                <Select label="" name="ethnicity" placeholder="Any Ethnicity" defaultValue={searchParams.get("ethnicity") ?? ""} options={ETHNICITIES.map((e) => ({ value: e, label: e }))} />
                <Select label="" name="religion" placeholder="Any Religion" defaultValue={searchParams.get("religion") ?? ""} options={RELIGIONS.map((r) => ({ value: r, label: r }))} />
                <Input name="location" placeholder={t.agencySearch.locationPh} defaultValue={searchParams.get("location") ?? ""} />
                <Button type="submit" size="sm" className="w-full">{t.agencySearch.applyFilters}</Button>
                <Link to="/agency/search" className="block text-center text-xs text-slate-400 hover:text-slate-600">{t.agencySearch.clearAll}</Link>
              </Form>
            </Card>
          </div>

          <div className="md:col-span-3">
            <p className="text-sm text-slate-500 mb-4">{profiles.length} {profiles.length !== 1 ? t.agencySearch.foundPlural : t.agencySearch.foundSingle}</p>
            {profiles.length === 0 ? (
              <div className="text-center py-20 text-slate-400"><p className="text-4xl mb-3">🔍</p><p>{t.agencySearch.noMatch}</p></div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {profiles.map((profile) => (
                  <Link key={profile.id} to={hasMembership ? `/agency/profile/${profile.id}` : "/agency/membership"}>
                    <div className="bg-white rounded-2xl overflow-hidden border border-slate-100 hover:border-rose-200 hover:shadow-md transition-all duration-200">
                      <div className="aspect-[3/4] bg-slate-100 relative">
                        {profile.photos?.[0]
                          ? <img src={profile.photos[0]} alt={profile.profileId} className="w-full h-full object-cover" />
                          : <div className="w-full h-full flex items-center justify-center text-slate-300 text-4xl">👤</div>}
                        {!hasMembership && (
                          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center">
                            <div className="text-center"><span className="text-white text-2xl">🔒</span><p className="text-white text-xs mt-1">{t.agencySearch.membersOnly}</p></div>
                          </div>
                        )}
                      </div>
                      <div className="p-3">
                        <p className="font-semibold text-sm text-slate-900">{profile.profileId}</p>
                        {hasMembership ? (
                          <div className="text-xs text-slate-500 mt-1 space-y-0.5">
                            {profile.age && <p>{profile.age} yrs · {profile.height ?? "—"} cm</p>}
                            {profile.occupation && <p>{profile.occupation}</p>}
                          </div>
                        ) : <p className="text-xs text-slate-400 mt-1">{t.agencySearch.upgradeToView}</p>}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
