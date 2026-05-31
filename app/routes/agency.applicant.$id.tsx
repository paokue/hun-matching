import { useState } from "react";
import { Link, redirect } from "react-router";
import type { Route } from "./+types/agency.applicant.$id";
import { requireAgency } from "~/lib/auth.server";
import { Navbar } from "~/components/layout/Navbar";
import { Card, CardHeader, CardTitle } from "~/components/ui/Card";
import { ImageLightbox } from "~/components/ui/ImageLightbox";
import { formatDate } from "~/lib/utils";
import { useT } from "~/lib/i18n";
import { getLocaleFromRequest } from "~/lib/locale.server";
import { getTranslations } from "~/locales";
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
  if (!profile) {
    const tr = getTranslations(getLocaleFromRequest(request));
    throw new Response(tr.agencyApplicantDetail.notFound, { status: 404 });
  }

  return { profile, agency };
}

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

// Derive 8 demo gallery images from the profile's primary photo URL.
function galleryFor(photoUrl: string): string[] {
  const match = photoUrl.match(/img=(\d+)/);
  const base = match ? Number(match[1]) : 1;
  return Array.from({ length: 8 }, (_, i) => `https://i.pravatar.cc/600?img=${((base + i * 3) % 70) + 1}`);
}

export default function AgencyApplicantDetail({ loaderData }: Route.ComponentProps) {
  const { profile, agency } = loaderData;
  const t = useT();
  const d = t.agencyApplicantDetail;

  const DOCUMENTS = [
    { label: d.nationalId, img: "https://placehold.co/600x400/fff1f2/fb7185?text=National+ID" },
    { label: d.passport, img: "https://placehold.co/600x400/fff1f2/fb7185?text=Passport" },
    { label: d.familyDoc, img: "https://placehold.co/600x400/fff1f2/fb7185?text=Family+Doc" },
  ];

  const GALLERY = galleryFor(profile.photo);

  // Combined image set for the lightbox: documents first, then gallery.
  const ALL_IMAGES = [...DOCUMENTS.map((doc) => doc.img), ...GALLERY];
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  return (
    <div className="min-h-screen flex flex-col bg-[#f8f7fc]">
      <Navbar user={{ role: "agency", companyName: agency.companyName }} />
      <main className="flex-1 max-w-5xl mx-auto w-full px-6 py-8">
        <Link to="/agency/dashboard" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 transition-colors mb-6">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          {d.backDashboard}
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
                    {d.selected}
                  </span>
                  <p className="text-white font-bold text-2xl drop-shadow leading-tight">{profile.name}</p>
                  <p className="text-white/85 text-sm mt-1 drop-shadow">{profile.age} {d.yearsOld}</p>
                </div>
              </div>
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 text-xs">{d.profileId}</span>
                  <span className="font-semibold text-slate-800">{profile.profileId}</span>
                </div>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-slate-400 text-xs">{d.selectionExpires}</span>
                  <span className="font-semibold text-slate-800">{formatDate(profile.expiresAt)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Details column */}
          <div className="md:col-span-2 space-y-5">
            <Section title={d.personalInformation}>
              <dl className="grid grid-cols-2 gap-x-5 gap-y-4 text-sm">
                <Field label={d.fullName} value={profile.name} />
                <Field label={d.dateOfBirth} value={formatDate(profile.dateOfBirth)} />
                <Field label={d.age} value={`${profile.age} ${d.yrs}`} />
                <Field label={d.height} value={`${profile.height} ${d.cm}`} />
                <Field label={d.weight} value={`${profile.weight} ${d.kg}`} />
              </dl>
            </Section>

            <Section title={d.background}>
              <dl className="grid grid-cols-2 gap-x-5 gap-y-4 text-sm">
                <Field label={d.education} value={profile.education} />
                <Field label={d.occupation} value={profile.occupation} />
                <Field label={d.familyMembers} value={String(profile.familyMembers)} />
                <Field label={d.maritalStatus} value={profile.maritalStatus} />
                <Field label={d.tattoo} value={profile.tattooStatus} />
                <Field label={d.ethnicity} value={profile.ethnicity} />
                <Field label={d.religion} value={profile.religion} />
              </dl>
            </Section>

            <div className="grid sm:grid-cols-2 gap-5">
              <Section title={d.placeOfBirth}>
                <dl className="space-y-4 text-sm">
                  <Field label={d.province} value={profile.birthProvince} />
                  <Field label={d.district} value={profile.birthDistrict} />
                  <Field label={d.village} value={profile.birthVillage} />
                </dl>
              </Section>
              <Section title={d.currentAddress}>
                <dl className="space-y-4 text-sm">
                  <Field label={d.province} value={profile.currentProvince} />
                  <Field label={d.district} value={profile.currentDistrict} />
                  <Field label={d.village} value={profile.currentVillage} />
                </dl>
              </Section>
            </div>

            <Section title={d.contactSocial}>
              <dl className="space-y-4 text-sm">
                <Field label={d.primaryPhone} value={profile.phone} />
                {profile.secondaryPhone && <Field label={d.secondaryPhone} value={profile.secondaryPhone} />}
                {profile.facebookUrl && (
                  <div>
                    <dt className="text-xs text-slate-400">{d.facebook}</dt>
                    <dd className="mt-1"><a href={profile.facebookUrl} target="_blank" rel="noopener noreferrer" className="text-rose-500 hover:text-rose-600 font-medium break-all">{profile.facebookUrl}</a></dd>
                  </div>
                )}
                {profile.tiktokUrl && (
                  <div>
                    <dt className="text-xs text-slate-400">{d.tiktok}</dt>
                    <dd className="mt-1"><a href={profile.tiktokUrl} target="_blank" rel="noopener noreferrer" className="text-rose-500 hover:text-rose-600 font-medium break-all">{profile.tiktokUrl}</a></dd>
                  </div>
                )}
              </dl>
            </Section>

            <Section title={d.documents}>
              <div className="grid grid-cols-3 gap-3">
                {DOCUMENTS.map((doc, i) => (
                  <button
                    key={doc.label}
                    type="button"
                    onClick={() => setLightboxIndex(i)}
                    className="group/doc block text-left"
                  >
                    <div className="aspect-[4/3] rounded-xl overflow-hidden border border-slate-200 relative">
                      <img src={doc.img} alt={doc.label} className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/0 group-hover/doc:bg-black/30 transition-colors flex items-center justify-center">
                        <span className="opacity-0 group-hover/doc:opacity-100 text-white text-xs font-semibold transition-opacity">{d.view}</span>
                      </div>
                    </div>
                    <p className="text-xs text-slate-600 mt-1.5 text-center font-medium">{doc.label}</p>
                  </button>
                ))}
              </div>
            </Section>

            <Section title={d.gallery}>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {GALLERY.map((src, i) => (
                  <button
                    key={src}
                    type="button"
                    onClick={() => setLightboxIndex(DOCUMENTS.length + i)}
                    className="group/img block aspect-square rounded-xl overflow-hidden border border-slate-200 relative"
                  >
                    <img src={src} alt="" className="w-full h-full object-cover group-hover/img:scale-105 transition-transform duration-300" />
                    <div className="absolute inset-0 bg-black/0 group-hover/img:bg-black/30 transition-colors flex items-center justify-center">
                      <span className="opacity-0 group-hover/img:opacity-100 text-white text-xs font-semibold transition-opacity">{d.view}</span>
                    </div>
                  </button>
                ))}
              </div>
            </Section>
          </div>
        </div>
      </main>

      <ImageLightbox images={ALL_IMAGES} index={lightboxIndex} setIndex={setLightboxIndex} />
    </div>
  );
}
