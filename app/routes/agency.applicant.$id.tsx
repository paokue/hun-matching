import { Link, redirect } from "react-router";
import type { Route } from "./+types/agency.applicant.$id";
import { requireAgency } from "~/lib/auth.server";
import { Navbar } from "~/components/layout/Navbar";
import { Card, CardHeader, CardTitle } from "~/components/ui/Card";
import { formatDate } from "~/lib/utils";
import { prisma } from "~/lib/prisma.server";
import { SELECTED_POOL } from "~/lib/selectedPool";

export function meta({ data }: Route.MetaArgs) {
  return [{ title: `${data?.profile?.name ?? "Applicant"} — HanMatching.com` }];
}

export async function loader({ request, params }: Route.LoaderArgs) {
  const session = await requireAgency(request);
  const agency = await prisma.agency.findUnique({ where: { id: session.userId } });
  if (!agency) throw redirect("/agency/login");

  const profile = SELECTED_POOL.find((p) => p.id === params.id);
  if (!profile) throw new Response("Applicant not found", { status: 404 });

  return { profile, agency };
}

const DOCUMENTS = [
  { label: "National ID", img: "https://placehold.co/600x400/fff1f2/fb7185?text=National+ID" },
  { label: "Passport", img: "https://placehold.co/600x400/fff1f2/fb7185?text=Passport" },
  { label: "Family Document", img: "https://placehold.co/600x400/fff1f2/fb7185?text=Family+Doc" },
];

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card>
      <CardHeader className="!mb-4">
        <div className="flex items-center gap-2.5">
          <span className="w-1.5 h-5 bg-rose-500 rounded-full" />
          <CardTitle className="!text-base">{title}</CardTitle>
        </div>
      </CardHeader>
      {children}
    </Card>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-slate-400">{label}</dt>
      <dd className="font-semibold text-slate-800 mt-1">{value}</dd>
    </div>
  );
}

export default function AgencyApplicantDetail({ loaderData }: Route.ComponentProps) {
  const { profile, agency } = loaderData;

  return (
    <div className="min-h-screen flex flex-col bg-[#f8f7fc]">
      <Navbar user={{ role: "agency", companyName: agency.companyName }} />
      <main className="flex-1 max-w-5xl mx-auto w-full px-6 py-8">
        <Link to="/agency/dashboard" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 transition-colors mb-6">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Dashboard
        </Link>

        <div className="grid md:grid-cols-3 gap-6">
          {/* Photo column */}
          <div className="md:col-span-1">
            <div className="sticky top-24 space-y-4">
              <div className="aspect-[3/4] rounded-2xl overflow-hidden shadow-md relative bg-slate-100">
                <img src={profile.photo} alt={profile.name} className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/5 to-transparent pointer-events-none" />
                <div className="absolute bottom-0 left-0 p-5">
                  <span className="inline-flex items-center gap-1 bg-rose-500 text-white text-xs px-2.5 py-1 rounded-full font-semibold mb-2 shadow-md">
                    <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                    Selected
                  </span>
                  <p className="text-white font-bold text-2xl drop-shadow leading-tight">{profile.name}</p>
                  <p className="text-white/85 text-sm mt-1 drop-shadow">{profile.age} years old</p>
                </div>
              </div>
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 text-xs">Profile ID</span>
                  <span className="font-semibold text-slate-800">{profile.profileId}</span>
                </div>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-slate-400 text-xs">Selection expires</span>
                  <span className="font-semibold text-slate-800">{formatDate(profile.expiresAt)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Details column */}
          <div className="md:col-span-2 space-y-5">
            <Section title="Personal Information">
              <dl className="grid grid-cols-2 gap-x-5 gap-y-4 text-sm">
                <Field label="Full Name" value={profile.name} />
                <Field label="Date of Birth" value={formatDate(profile.dateOfBirth)} />
                <Field label="Age" value={`${profile.age} yrs`} />
                <Field label="Height" value={`${profile.height} cm`} />
                <Field label="Weight" value={`${profile.weight} kg`} />
              </dl>
            </Section>

            <Section title="Background">
              <dl className="grid grid-cols-2 gap-x-5 gap-y-4 text-sm">
                <Field label="Education" value={profile.education} />
                <Field label="Occupation" value={profile.occupation} />
                <Field label="Family Members" value={String(profile.familyMembers)} />
                <Field label="Marital Status" value={profile.maritalStatus} />
                <Field label="Tattoo" value={profile.tattooStatus} />
                <Field label="Ethnicity" value={profile.ethnicity} />
                <Field label="Religion" value={profile.religion} />
              </dl>
            </Section>

            <div className="grid sm:grid-cols-2 gap-5">
              <Section title="Place of Birth">
                <dl className="space-y-4 text-sm">
                  <Field label="Province" value={profile.birthProvince} />
                  <Field label="District" value={profile.birthDistrict} />
                  <Field label="Village" value={profile.birthVillage} />
                </dl>
              </Section>
              <Section title="Current Address">
                <dl className="space-y-4 text-sm">
                  <Field label="Province" value={profile.currentProvince} />
                  <Field label="District" value={profile.currentDistrict} />
                  <Field label="Village" value={profile.currentVillage} />
                </dl>
              </Section>
            </div>

            <Section title="Contact & Social">
              <dl className="space-y-4 text-sm">
                <Field label="Primary Phone" value={profile.phone} />
                {profile.secondaryPhone && <Field label="Secondary Phone" value={profile.secondaryPhone} />}
                {profile.facebookUrl && (
                  <div>
                    <dt className="text-xs text-slate-400">Facebook</dt>
                    <dd className="mt-1"><a href={profile.facebookUrl} target="_blank" rel="noopener noreferrer" className="text-rose-500 hover:text-rose-600 font-medium break-all">{profile.facebookUrl}</a></dd>
                  </div>
                )}
                {profile.tiktokUrl && (
                  <div>
                    <dt className="text-xs text-slate-400">TikTok</dt>
                    <dd className="mt-1"><a href={profile.tiktokUrl} target="_blank" rel="noopener noreferrer" className="text-rose-500 hover:text-rose-600 font-medium break-all">{profile.tiktokUrl}</a></dd>
                  </div>
                )}
              </dl>
            </Section>

            <Section title="Documents">
              <div className="grid grid-cols-3 gap-3">
                {DOCUMENTS.map((doc) => (
                  <a key={doc.label} href={doc.img} target="_blank" rel="noopener noreferrer" className="group/doc block">
                    <div className="aspect-[4/3] rounded-xl overflow-hidden border border-slate-200 relative">
                      <img src={doc.img} alt={doc.label} className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/0 group-hover/doc:bg-black/30 transition-colors flex items-center justify-center">
                        <span className="opacity-0 group-hover/doc:opacity-100 text-white text-xs font-semibold transition-opacity">View</span>
                      </div>
                    </div>
                    <p className="text-xs text-slate-600 mt-1.5 text-center font-medium">{doc.label}</p>
                  </a>
                ))}
              </div>
            </Section>
          </div>
        </div>
      </main>
    </div>
  );
}
