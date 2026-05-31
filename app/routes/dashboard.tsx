import { useState } from "react";
import { Link, redirect } from "react-router";

import { useT } from "~/lib/i18n";
import { useApplicantRealtime } from "~/lib/pusher.realtime";
import { formatDate } from "~/lib/utils";
import { prisma } from "~/lib/prisma.server";
import type { Route } from "./+types/dashboard";
import { requireUser } from "~/lib/auth.server";

import { Navbar } from "~/components/layout/Navbar";
import { DocPreview } from "~/components/ui/DocPreview";
import { ImageLightbox } from "~/components/ui/ImageLightbox";
import { Badge, statusBadge } from "~/components/ui/Badge";
import { Card, CardHeader, CardTitle, CardDescription } from "~/components/ui/Card";

export function meta(_: Route.MetaArgs) {
  return [{ title: "My Dashboard — HanMatching.com" }];
}

export async function loader({ request }: Route.LoaderArgs) {
  const session = await requireUser(request);
  const user = await prisma.user.findUnique({ where: { id: session.userId } });
  if (!user) throw redirect("/login");
  return { user };
}

export default function Dashboard({ loaderData }: Route.ComponentProps) {
  const { user } = loaderData;
  const photoCount = user.photos?.length ?? 0;
  const hasDocuments = user.nationalIdUrl || user.passportUrl || user.familyDocUrl;
  const profileComplete = photoCount >= 5 && hasDocuments && user.isProfileComplete;
  const t = useT();
  const [lightbox, setLightbox] = useState<number | null>(null);

  // Real-time updates from Pusher for this specific applicant
  useApplicantRealtime(user.id);

  // Translate a stored enum value (falls back to the raw value, then "—")
  const enumLabel = (group: Record<string, string>, val?: string | null) => (val ? group[val] ?? val : "—");
  const statusLabel = user.status === "active" ? t.dashboard.statusActive : user.status === "suspended" ? t.dashboard.statusSuspended : t.dashboard.statusPending;

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <Navbar user={{ role: "applicant", profileId: user.profileId }} />

      <main className="flex-1 max-w-4xl mx-auto w-full px-4 py-3">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-slate-900">{t.dashboard.welcome} {user.fullName}!</h1>
        </div>

        <div className={`mb-6 p-4 rounded-xl border ${user.status === "active" ? "bg-green-50 border-green-200" : user.status === "suspended" ? "bg-red-50 border-red-200" : "bg-amber-50 border-amber-200"}`}>
          <div className="flex items-center gap-3">
            <span className="text-xl">{user.status === "active" ? "✅" : user.status === "suspended" ? "🚫" : "⏳"}</span>
            <div>
              <p className="font-semibold text-sm text-slate-900">
                {t.dashboard.statusLabel} <Badge variant={statusBadge(user.status)}>{statusLabel}</Badge>
              </p>
              <p className="text-xs text-slate-600 mt-0.5">
                {user.status === "pending" ? t.dashboard.pendingMsg : user.status === "active" ? t.dashboard.activeMsg : t.dashboard.suspendedMsg}
              </p>
            </div>
          </div>
        </div>

        {/* Profile Completion */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>{t.dashboard.completionTitle}</CardTitle>
            <CardDescription>{t.dashboard.completionDesc}</CardDescription>
          </CardHeader>
          <div className="space-y-3">
            {[
              { label: t.dashboard.check1, done: !!user.fullName && !!user.dateOfBirth && !!user.phone, link: "/dashboard/edit" },
              { label: t.dashboard.check2, done: photoCount >= 5, link: "/dashboard/photos", badge: `${photoCount}/5` },
              { label: t.dashboard.check3, done: !!hasDocuments, link: "/dashboard/documents" },
            ].map((item) => (
              <div key={item.label} className="flex items-center justify-between p-3 rounded-lg bg-slate-50">
                <div className="flex items-center gap-3">
                  <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs ${item.done ? "bg-green-100 text-green-600" : "bg-slate-200 text-slate-400"}`}>
                    {item.done ? "✓" : "○"}
                  </span>
                  <span className={`text-sm ${item.done ? "text-slate-700" : "text-slate-500"}`}>{item.label}</span>
                  {item.badge && <span className="text-xs text-slate-400 bg-white px-2 py-0.5 rounded-full border">{item.badge}</span>}
                </div>
                <Link to={item.link} className="text-xs text-rose-500 hover:text-rose-600 font-medium">
                  {item.done ? t.dashboard.editBtn : t.dashboard.completeBtn}
                </Link>
              </div>
            ))}
          </div>
          {!profileComplete && <div className="mt-4 p-3 bg-amber-50 rounded-lg text-xs text-amber-700">{t.dashboard.completeAllMsg}</div>}
        </Card>

        {/* ── Profile details grid ── */}
        <div className="grid sm:grid-cols-2 gap-3 mb-6">
          <Card>
            <CardHeader><CardTitle>{t.dashboard.personalDetails}</CardTitle></CardHeader>
            <dl className="space-y-2 text-sm">
              {[
                { label: t.register.firstNameLabel, value: user.firstName || "—" },
                { label: t.register.lastNameLabel, value: user.lastName || "—" },
                { label: t.dashboard.dobLabel, value: user.dateOfBirth ? formatDate(user.dateOfBirth) : "—" },
                { label: t.dashboard.ageLabel, value: user.age ? `${user.age} ${t.dashboard.years}` : "—" },
                { label: t.dashboard.heightLabel, value: user.height ? `${user.height} ${t.dashboard.cm}` : "—" },
                { label: t.dashboard.weightLabel, value: user.weight ? `${user.weight} ${t.dashboard.kg}` : "—" },
                { label: t.register.educationLabel, value: enumLabel(t.enums.education as Record<string, string>, user.education) },
                { label: t.dashboard.occupationLabel, value: user.occupation || "—" },
                { label: t.register.familyMembersLabel, value: user.familyMembers != null ? String(user.familyMembers) : "—" },
                { label: t.register.maritalStatusLabel, value: enumLabel(t.enums.maritalStatus as Record<string, string>, user.maritalStatus) },
                { label: t.register.tattooStatusLabel, value: enumLabel(t.enums.tattooStatus as Record<string, string>, user.tattooStatus) },
                { label: t.dashboard.ethnicityLabel, value: enumLabel(t.enums.ethnicity as Record<string, string>, user.ethnicity) },
                { label: t.dashboard.religionLabel, value: enumLabel(t.enums.religion as Record<string, string>, user.religion) },
              ].map(({ label, value }) => (
                <div key={label} className="flex justify-between">
                  <dt className="text-slate-500 shrink-0">{label}</dt>
                  <dd className="font-medium text-slate-800 text-right ml-2">{value}</dd>
                </div>
              ))}
            </dl>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t.dashboard.photosTitle} ({photoCount})</CardTitle>
              <CardDescription>{t.dashboard.minPhotos}</CardDescription>
            </CardHeader>
            {photoCount === 0 ? (
              <div className="text-center py-6">
                <p className="text-slate-400 text-sm">{t.dashboard.noPhotos}</p>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-2">
                {user.photos.slice(0, 6).map((url, i) => (
                  <button key={i} type="button" onClick={() => setLightbox(i)} className="relative block">
                    <img src={url} alt={`Photo ${i + 1}`} className="w-full h-20 object-cover rounded-lg" />
                    {i === 5 && photoCount > 6 && (
                      <span className="absolute inset-0 rounded-lg bg-black/50 flex items-center justify-center text-white text-sm font-semibold">+{photoCount - 6}</span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </Card>
        </div>

        {/* Address + Contact row */}
        <div className="grid sm:grid-cols-2 gap-3 mb-6">
          <Card>
            <CardHeader><CardTitle>{t.register.addressesTitle}</CardTitle></CardHeader>
            <dl className="space-y-3 text-sm">
              <div>
                <dt className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">{t.register.birthPlaceTitle}</dt>
                <dd className="text-slate-800 font-medium">
                  {[user.birthVillage, user.birthDistrict, user.birthProvince ? enumLabel(t.enums.provinces as Record<string, string>, user.birthProvince) : null].filter(Boolean).join(", ") || "—"}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">{t.register.currentAddressTitle}</dt>
                <dd className="text-slate-800 font-medium">
                  {[user.currentVillage, user.currentDistrict, user.currentProvince ? enumLabel(t.enums.provinces as Record<string, string>, user.currentProvince) : null].filter(Boolean).join(", ") || "—"}
                </dd>
              </div>
            </dl>
          </Card>
          <Card>
            <CardHeader><CardTitle>{t.register.contactSocialTitle}</CardTitle></CardHeader>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-slate-500">{t.register.primaryPhoneLabel}</dt>
                <dd className="font-medium text-slate-800">{user.phone}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-500">{t.register.secondaryPhoneLabel}</dt>
                <dd className="font-medium text-slate-800">{user.secondaryPhone || "—"}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-slate-500 shrink-0">{t.dashboard.facebook}</dt>
                <dd className="font-medium text-slate-800 text-right truncate">
                  {user.facebookUrl
                    ? <a href={user.facebookUrl} target="_blank" rel="noopener noreferrer" className="text-rose-500 hover:text-rose-600 truncate">{user.facebookUrl}</a>
                    : "—"}
                </dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-slate-500 shrink-0">{t.dashboard.tiktok}</dt>
                <dd className="font-medium text-slate-800 text-right truncate">
                  {user.tiktokUrl
                    ? <a href={user.tiktokUrl} target="_blank" rel="noopener noreferrer" className="text-rose-500 hover:text-rose-600 truncate">{user.tiktokUrl}</a>
                    : "—"}
                </dd>
              </div>
            </dl>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{t.dashboard.identityDocs}</CardTitle>
            <CardDescription>{t.dashboard.identityDocsDesc}</CardDescription>
          </CardHeader>
          <div className="grid sm:grid-cols-3 gap-4">
            {[
              { label: t.dashboard.nationalId, url: user.nationalIdUrl, back: user.nationalIdBackUrl, required: true },
              { label: t.dashboard.passport, url: user.passportUrl, back: null, required: true },
              { label: t.dashboard.familyDoc, url: user.familyDocUrl, back: null, required: false },
            ].map((doc) => (
              <div key={doc.label} className={`p-4 rounded-xl border ${doc.url ? "border-green-200 bg-green-50" : "border-dashed border-slate-200 bg-slate-50"}`}>
                <p className="text-xs font-medium text-slate-700 mb-2">{doc.label}{doc.required && <span className="text-rose-500 ml-1">*</span>}</p>
                {doc.url ? (
                  <div className="space-y-2">
                    <DocPreview url={doc.url} label={doc.label} viewLabel={t.dashboard.viewDoc} />
                    {doc.back && <DocPreview url={doc.back} label={`${doc.label} (2)`} viewLabel={t.dashboard.viewDoc} />}
                  </div>
                ) : (
                  <span className="text-xs text-slate-400">{t.dashboard.docNotUploaded}</span>
                )}
              </div>
            ))}
          </div>
        </Card>
      </main>

      <ImageLightbox images={user.photos} index={lightbox} setIndex={setLightbox} />
    </div>
  );
}
