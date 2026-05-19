import { Form, Link, redirect } from "react-router";
import type { Route } from "./+types/profiles.$id";
import { getUserFromSession } from "~/lib/auth.server";
import { Navbar } from "~/components/layout/Navbar";
import { formatDate } from "~/lib/utils";
import { prisma } from "~/lib/prisma.server";
import { addMonths } from "date-fns";

export function meta({ data }: Route.MetaArgs) {
  return [{ title: `${data?.profile?.fullName ?? "Applicant"} — HanMatching.com` }];
}

export async function loader({ request, params }: Route.LoaderArgs) {
  const session = await getUserFromSession(request);

  if (!session || session.role !== "agency") throw redirect("/agency/login");
  const agency = await prisma.agency.findUnique({ where: { id: session.userId } });
  if (!agency || agency.status !== "active") throw redirect("/agency/dashboard");
  const hasMembership = !!(agency.membershipExpiresAt && new Date(agency.membershipExpiresAt) > new Date());
  if (!hasMembership) throw redirect("/agency/membership");

  const profile = await prisma.user.findUnique({ where: { id: params.id } });
  if (!profile || profile.status !== "active") throw new Response("Not found", { status: 404 });

  const selection = await prisma.selection.findUnique({
    where: { agencyId_applicantId: { agencyId: session.userId, applicantId: params.id! } },
  });

  return {
    profile,
    agency,
    isSelected: !!selection?.isActive,
    selectionExpiry: selection?.expiresAt ?? null,
  };
}

export async function action({ request, params }: Route.ActionArgs) {
  const session = await getUserFromSession(request);
  if (!session || session.role !== "agency") throw redirect("/agency/login");

  const agency = await prisma.agency.findUnique({ where: { id: session.userId } });
  const hasMembership = !!(agency?.membershipExpiresAt && new Date(agency.membershipExpiresAt) > new Date());
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

function InfoRow({ label, value }: { label: string; value?: string | number | null }) {
  return (
    <div className="flex justify-between items-start py-2.5 border-b border-slate-50 last:border-0">
      <dt className="text-sm text-slate-500 shrink-0 w-36">{label}</dt>
      <dd className="text-sm font-medium text-slate-900 text-right">{value || "—"}</dd>
    </div>
  );
}

export default function ProfileDetail({ loaderData, actionData }: Route.ComponentProps) {
  const { profile, agency, isSelected, selectionExpiry } = loaderData;
  const mainPhoto = profile.photos?.[0];
  const extraPhotos = profile.photos?.slice(1, 5) ?? [];

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <Navbar user={{ role: "agency", companyName: agency.companyName }} />

      <main className="flex-1 max-w-6xl mx-auto w-full px-4 py-8">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-slate-500 mb-6">
          <Link to="/profiles" className="hover:text-rose-500 transition-colors">All Applicants</Link>
          <span>/</span>
          <span className="text-slate-900 font-medium">{profile.fullName}</span>
        </div>

        {/* Action feedback */}
        {(actionData?.success || actionData?.error || actionData?.message) && (
          <div className={`mb-6 p-4 rounded-xl text-sm font-medium ${actionData?.success ? "bg-green-50 border border-green-200 text-green-700" : "bg-amber-50 border border-amber-200 text-amber-700"}`}>
            {actionData?.success || actionData?.error || actionData?.message}
          </div>
        )}

        <div className="grid lg:grid-cols-5 gap-8">
          {/* ── Left: Photos + Selection ─────────────────────────────── */}
          <div className="lg:col-span-2 space-y-4">
            <div className="sticky top-24 space-y-3">
              {/* Main photo */}
              <div className="aspect-[3/4] rounded-3xl overflow-hidden shadow-xl shadow-slate-200 bg-slate-100">
                {mainPhoto ? (
                  <img src={mainPhoto} alt={profile.fullName} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-rose-50 to-pink-100">
                    <svg className="w-20 h-20 text-rose-200" viewBox="0 0 24 24" fill="currentColor">
                      <circle cx="12" cy="8" r="4" />
                      <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
                    </svg>
                  </div>
                )}
              </div>

              {/* Thumbnail strip */}
              {extraPhotos.length > 0 && (
                <div className="grid grid-cols-4 gap-2">
                  {extraPhotos.map((url, i) => (
                    <div key={i} className="aspect-square rounded-xl overflow-hidden shadow-sm">
                      <img src={url} alt="" className="w-full h-full object-cover hover:opacity-90 transition-opacity" />
                    </div>
                  ))}
                </div>
              )}

              {/* Selection action */}
              {isSelected ? (
                <div className="p-4 bg-green-50 border border-green-200 rounded-2xl text-center">
                  <p className="text-green-700 font-semibold text-sm">⭐ In Your Selection</p>
                  {selectionExpiry && (
                    <p className="text-green-600 text-xs mt-1">Reserved until {formatDate(selectionExpiry)}</p>
                  )}
                </div>
              ) : (
                <Form method="post">
                  <button
                    type="submit"
                    className="w-full bg-rose-500 hover:bg-rose-600 text-white font-semibold py-3 rounded-2xl transition-colors shadow-lg shadow-rose-200 text-sm"
                  >
                    Add to My Selection
                  </button>
                </Form>
              )}
            </div>
          </div>

          {/* ── Right: Details ───────────────────────────────────────── */}
          <div className="lg:col-span-3 space-y-5">
            {/* Name & status */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
              <div className="flex items-start justify-between mb-1">
                <h1 className="text-2xl font-bold text-slate-900">{profile.fullName}</h1>
                <span className="inline-flex items-center gap-1.5 bg-green-50 text-green-600 text-xs font-semibold px-3 py-1 rounded-full border border-green-100">
                  <span className="w-1.5 h-1.5 bg-green-500 rounded-full" />
                  Active
                </span>
              </div>
              <p className="text-slate-400 text-sm font-mono">{profile.profileId}</p>

              {/* Quick stats */}
              <div className="grid grid-cols-3 gap-3 mt-5">
                {[
                  { label: "Age", value: profile.age ? `${profile.age} yrs` : "—" },
                  { label: "Height", value: profile.height ? `${profile.height} cm` : "—" },
                  { label: "Weight", value: profile.weight ? `${profile.weight} kg` : "—" },
                ].map(({ label, value }) => (
                  <div key={label} className="bg-slate-50 rounded-xl p-3 text-center">
                    <p className="text-xs text-slate-400 mb-1">{label}</p>
                    <p className="font-bold text-slate-900 text-sm">{value}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Personal information */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
              <h2 className="text-base font-semibold text-slate-900 mb-4 flex items-center gap-2">
                <span className="w-1 h-4 bg-rose-500 rounded-full" />
                Personal Information
              </h2>
              <dl>
                <InfoRow label="Date of Birth" value={profile.dateOfBirth ? formatDate(profile.dateOfBirth) : undefined} />
                <InfoRow label="Occupation" value={profile.occupation} />
                <InfoRow label="Marital Status" value={profile.maritalStatus} />
                <InfoRow label="Tattoo" value={profile.tattooStatus} />
                <InfoRow label="Ethnicity" value={profile.ethnicity} />
                <InfoRow label="Religion" value={profile.religion} />
                <InfoRow label="Address" value={profile.currentAddress} />
              </dl>
            </div>

            {/* Contact information */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
              <h2 className="text-base font-semibold text-slate-900 mb-4 flex items-center gap-2">
                <span className="w-1 h-4 bg-rose-500 rounded-full" />
                Contact Information
              </h2>
              <dl>
                <InfoRow label="Primary Phone" value={profile.phone} />
                {profile.secondaryPhone && <InfoRow label="Secondary Phone" value={profile.secondaryPhone} />}
                {profile.facebookUrl && (
                  <div className="flex justify-between items-start py-2.5 border-b border-slate-50">
                    <dt className="text-sm text-slate-500 shrink-0 w-36">Facebook</dt>
                    <dd className="text-sm">
                      <a href={profile.facebookUrl} target="_blank" rel="noopener noreferrer" className="text-rose-500 hover:text-rose-600 truncate max-w-48 block text-right">
                        View Profile →
                      </a>
                    </dd>
                  </div>
                )}
              </dl>
            </div>

            {/* Documents */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
              <h2 className="text-base font-semibold text-slate-900 mb-4 flex items-center gap-2">
                <span className="w-1 h-4 bg-rose-500 rounded-full" />
                Identity Documents
              </h2>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: "National ID", url: profile.nationalIdUrl },
                  { label: "Passport", url: profile.passportUrl },
                  { label: "Family Doc", url: profile.familyDocUrl },
                ].map((doc) => (
                  doc.url ? (
                    <a key={doc.label} href={doc.url} target="_blank" rel="noopener noreferrer" download
                      className="flex flex-col items-center gap-2 p-4 rounded-xl bg-slate-50 border border-slate-200 hover:bg-rose-50 hover:border-rose-200 transition-colors group">
                      <svg className="w-7 h-7 text-slate-400 group-hover:text-rose-400 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m.75 12 3 3m0 0 3-3m-3 3v-6m-1.5-9H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9z" />
                      </svg>
                      <span className="text-xs text-slate-600 group-hover:text-rose-600 font-medium text-center leading-tight">{doc.label}</span>
                      <span className="text-xs text-rose-500">Download</span>
                    </a>
                  ) : (
                    <div key={doc.label} className="flex flex-col items-center gap-2 p-4 rounded-xl bg-slate-50 border border-dashed border-slate-200 opacity-50">
                      <svg className="w-7 h-7 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m6.75 12H9m4.125-4.5h.008v.008h-.008" />
                      </svg>
                      <span className="text-xs text-slate-400 font-medium text-center leading-tight">{doc.label}</span>
                      <span className="text-xs text-slate-300">Not uploaded</span>
                    </div>
                  )
                ))}
              </div>
            </div>

            {/* All photos */}
            {profile.photos && profile.photos.length > 1 && (
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
                <h2 className="text-base font-semibold text-slate-900 mb-4 flex items-center gap-2">
                  <span className="w-1 h-4 bg-rose-500 rounded-full" />
                  All Photos ({profile.photos.length})
                </h2>
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                  {profile.photos.map((url, i) => (
                    <a key={i} href={url} target="_blank" rel="noopener noreferrer" download className="group relative aspect-square">
                      <img src={url} alt={`Photo ${i + 1}`} className="w-full h-full object-cover rounded-xl group-hover:opacity-90 transition-opacity" />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl flex items-center justify-center">
                        <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 0 0 3 3h10a3 3 0 0 0 3-3v-1m-4-4-4 4m0 0-4-4m4 4V4" />
                        </svg>
                      </div>
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
