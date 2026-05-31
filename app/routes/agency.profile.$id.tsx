import { Form, Link, redirect } from "react-router";
import type { Route } from "./+types/agency.profile.$id";
import { requireAgency } from "~/lib/auth.server";
import { Navbar } from "~/components/layout/Navbar";
import { Card, CardHeader, CardTitle } from "~/components/ui/Card";
import { Button } from "~/components/ui/Button";
import { Badge } from "~/components/ui/Badge";
import { formatDate } from "~/lib/utils";
import { useT } from "~/lib/i18n";
import { useAgencyRealtime } from "~/lib/pusher.realtime";
import { prisma } from "~/lib/prisma.server";
import { addMonths } from "date-fns";

export function meta({ data }: Route.MetaArgs) {
  return [{ title: `Profile ${data?.profile?.profileId ?? ""} — HanMatching.com` }];
}

export async function loader({ request, params }: Route.LoaderArgs) {
  const session = await requireAgency(request);

  const agency = await prisma.agency.findUnique({ where: { id: session.userId } });
  if (!agency) throw redirect("/agency/login");

  const hasMembership = agency.membershipExpiresAt && new Date(agency.membershipExpiresAt) > new Date();
  if (!hasMembership) throw redirect("/agency/membership");

  const profile = await prisma.user.findUnique({ where: { id: params.id } });
  if (!profile || profile.status !== "active") throw new Response("Profile not found", { status: 404 });

  const selection = await prisma.selection.findUnique({
    where: { agencyId_applicantId: { agencyId: session.userId, applicantId: params.id! } },
  });

  // Only selected applicants can be viewed in detail
  if (!selection?.isActive) throw redirect("/agency/dashboard");

  return { profile, agency, isSelected: true, selectionExpiry: selection.expiresAt ?? null };
}

export async function action({ request, params }: Route.ActionArgs) {
  const session = await requireAgency(request);

  const agency = await prisma.agency.findUnique({ where: { id: session.userId } });
  const hasMembership = agency?.membershipExpiresAt && new Date(agency.membershipExpiresAt) > new Date();
  if (!hasMembership) return { error: "Active membership required." };

  const existing = await prisma.selection.findUnique({
    where: { agencyId_applicantId: { agencyId: session.userId, applicantId: params.id! } },
  });
  if (existing) return { message: "Already in your selection list." };

  await prisma.selection.create({
    data: { agencyId: session.userId, applicantId: params.id!, expiresAt: addMonths(new Date(), 4) },
  });
  return { success: "Candidate added to your selection list for 4 months." };
}

export default function AgencyProfileView({ loaderData, actionData }: Route.ComponentProps) {
  const { profile, agency, isSelected, selectionExpiry } = loaderData;
  const t = useT();
  useAgencyRealtime(agency.id);

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <Navbar user={{ role: "agency", companyName: agency.companyName }} />
      <main className="flex-1 max-w-5xl mx-auto w-full px-4 py-8">
        <div className="flex items-center gap-3 mb-6">
          <Link
            to="/agency/dashboard"
            className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            Dashboard
          </Link>
        </div>

        {(actionData?.success || actionData?.error || actionData?.message) && (
          <div className={`mb-4 p-4 rounded-xl text-sm ${actionData?.success ? "bg-green-50 border border-green-200 text-green-700" : "bg-amber-50 border border-amber-200 text-amber-700"}`}>
            {actionData?.success || actionData?.error || actionData?.message}
          </div>
        )}

        <div className="grid md:grid-cols-3 gap-6">
          <div className="md:col-span-1">
            <div className="sticky top-24 space-y-3">
              {profile.photos?.[0] && <div className="aspect-[3/4] rounded-2xl overflow-hidden"><img src={profile.photos[0]} alt={profile.profileId} className="w-full h-full object-cover" /></div>}
              <div className="grid grid-cols-4 gap-2">
                {profile.photos?.slice(1, 5).map((url, i) => <div key={i} className="aspect-square rounded-xl overflow-hidden"><img src={url} alt="" className="w-full h-full object-cover" /></div>)}
              </div>
              {isSelected ? (
                <div className="p-3 bg-green-50 border border-green-200 rounded-xl text-center">
                  <p className="text-green-700 font-semibold text-sm">{t.agencyProfile.inSelection}</p>
                  <p className="text-green-600 text-xs mt-1">{t.agencyProfile.selectionExpires} {formatDate(selectionExpiry!)}</p>
                </div>
              ) : (
                <Form method="post"><Button type="submit" size="lg" className="w-full">{t.agencyProfile.addToSelection}</Button></Form>
              )}
            </div>
          </div>

          <div className="md:col-span-2 space-y-5">
            <div className="flex items-start justify-between">
              <div><h1 className="text-2xl font-bold text-slate-900">{profile.profileId}</h1><p className="text-slate-500 text-sm">{profile.fullName}</p></div>
              <Badge variant="success">Active</Badge>
            </div>

            <Card>
              <CardHeader><CardTitle>{t.agencyProfile.personalInfo}</CardTitle></CardHeader>
              <dl className="grid grid-cols-2 gap-3 text-sm">
                {[
                  { label: t.agencyProfile.fullName, value: profile.fullName },
                  { label: t.agencyProfile.dateOfBirth, value: formatDate(profile.dateOfBirth) },
                  { label: t.agencyProfile.age, value: `${profile.age} ${t.agencyProfile.years}` },
                  { label: t.agencyProfile.height, value: profile.height ? `${profile.height} ${t.agencyProfile.cm}` : "—" },
                  { label: t.agencyProfile.weight, value: profile.weight ? `${profile.weight} ${t.agencyProfile.kg}` : "—" },
                  { label: t.agencyProfile.occupation, value: profile.occupation || "—" },
                  { label: t.agencyProfile.maritalStatus, value: profile.maritalStatus || "—" },
                  { label: t.agencyProfile.tattooStatus, value: profile.tattooStatus || "—" },
                  { label: t.agencyProfile.ethnicity, value: profile.ethnicity || "—" },
                  { label: t.agencyProfile.religion, value: profile.religion || "—" },
                  { label: t.agencyProfile.address, value: profile.currentAddress || "—" },
                ].map(({ label, value }) => (
                  <div key={label}><dt className="text-slate-500 text-xs">{label}</dt><dd className="font-medium text-slate-900 mt-0.5">{value}</dd></div>
                ))}
              </dl>
            </Card>

            <Card>
              <CardHeader><CardTitle>{t.agencyProfile.contactInfo}</CardTitle></CardHeader>
              <dl className="space-y-3 text-sm">
                <div><dt className="text-slate-500 text-xs">{t.agencyProfile.primaryPhone}</dt><dd className="font-medium text-slate-900 mt-0.5">{profile.phone}</dd></div>
                {profile.secondaryPhone && <div><dt className="text-slate-500 text-xs">{t.agencyProfile.secondaryPhone}</dt><dd className="font-medium text-slate-900 mt-0.5">{profile.secondaryPhone}</dd></div>}
                {profile.facebookUrl && <div><dt className="text-slate-500 text-xs">{t.agencyProfile.facebook}</dt><dd className="mt-0.5"><a href={profile.facebookUrl} target="_blank" rel="noopener noreferrer" className="text-rose-500 hover:text-rose-600 text-sm truncate block">{profile.facebookUrl}</a></dd></div>}
              </dl>
            </Card>

            <Card>
              <CardHeader><CardTitle>{t.agencyProfile.identityDocs}</CardTitle></CardHeader>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: t.agencyProfile.nationalId, url: profile.nationalIdUrl },
                  { label: t.agencyProfile.passport, url: profile.passportUrl },
                  { label: t.agencyProfile.familyDoc, url: profile.familyDocUrl },
                ].map((doc) => doc.url ? (
                  <a key={doc.label} href={doc.url} target="_blank" rel="noopener noreferrer" download className="block p-3 bg-slate-50 border border-slate-200 rounded-xl text-center hover:bg-slate-100">
                    <span className="text-xl">📄</span><p className="text-xs text-slate-700 mt-1 font-medium">{doc.label}</p><p className="text-xs text-rose-500 mt-0.5">{t.agencyProfile.download}</p>
                  </a>
                ) : (
                  <div key={doc.label} className="p-3 bg-slate-50 border border-dashed border-slate-200 rounded-xl text-center">
                    <span className="text-xl opacity-30">📄</span><p className="text-xs text-slate-400 mt-1">{doc.label}</p><p className="text-xs text-slate-300 mt-0.5">{t.agencyProfile.notUploaded}</p>
                  </div>
                ))}
              </div>
            </Card>

            {profile.photos?.length > 0 && (
              <Card>
                <CardHeader><CardTitle>{t.agencyProfile.allPhotos} ({profile.photos.length})</CardTitle></CardHeader>
                <div className="grid grid-cols-3 gap-3">
                  {profile.photos.map((url, i) => (
                    <a key={i} href={url} target="_blank" rel="noopener noreferrer" download className="group relative aspect-square">
                      <img src={url} alt={`Photo ${i + 1}`} className="w-full h-full object-cover rounded-xl" />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl flex items-center justify-center"><span className="text-white text-xs font-medium">{t.agencyProfile.download}</span></div>
                    </a>
                  ))}
                </div>
              </Card>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
