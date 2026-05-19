import { Link } from "react-router";
import { redirect } from "react-router";
import type { Route } from "./+types/dashboard";
import { requireUser } from "~/lib/auth.server";
import { Navbar } from "~/components/layout/Navbar";
import { Card, CardHeader, CardTitle, CardDescription } from "~/components/ui/Card";
import { Badge, statusBadge } from "~/components/ui/Badge";
import { Button } from "~/components/ui/Button";
import { formatDate } from "~/lib/utils";
import { useT } from "~/lib/i18n";
import { prisma } from "~/lib/prisma.server";

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

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <Navbar user={{ role: "applicant", profileId: user.profileId }} />

      <main className="flex-1 max-w-4xl mx-auto w-full px-4 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-slate-900">{t.dashboard.welcome} {user.fullName}!</h1>
          <p className="text-slate-500 text-sm mt-1">
            {t.dashboard.profileIdLabel} <span className="font-semibold text-rose-500">{user.profileId}</span>
          </p>
        </div>

        <div className={`mb-6 p-4 rounded-xl border ${user.status === "active" ? "bg-green-50 border-green-200" : user.status === "suspended" ? "bg-red-50 border-red-200" : "bg-amber-50 border-amber-200"}`}>
          <div className="flex items-center gap-3">
            <span className="text-xl">{user.status === "active" ? "✅" : user.status === "suspended" ? "🚫" : "⏳"}</span>
            <div>
              <p className="font-semibold text-sm text-slate-900">
                {t.dashboard.statusLabel} <Badge variant={statusBadge(user.status)}>{user.status}</Badge>
              </p>
              <p className="text-xs text-slate-600 mt-0.5">
                {user.status === "pending" ? t.dashboard.pendingMsg : user.status === "active" ? t.dashboard.activeMsg : t.dashboard.suspendedMsg}
              </p>
            </div>
          </div>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>{t.dashboard.completionTitle}</CardTitle>
            <CardDescription>{t.dashboard.completionDesc}</CardDescription>
          </CardHeader>
          <div className="space-y-3">
            {[
              { label: t.dashboard.check1, done: !!user.fullName && !!user.dateOfBirth, link: "/dashboard/edit" },
              { label: t.dashboard.check2, done: photoCount >= 5, link: "/dashboard/photos", badge: `${photoCount}/5` },
              { label: t.dashboard.check3, done: !!hasDocuments, link: "/dashboard/documents" },
              { label: t.dashboard.check4, done: !!user.phone, link: "/dashboard/edit" },
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
        <div className="grid sm:grid-cols-2 gap-6 mb-6">
          <Card>
            <CardHeader><CardTitle>{t.dashboard.personalDetails}</CardTitle></CardHeader>
            <dl className="space-y-2 text-sm">
              {[
                { label: "First Name",       value: user.firstName || "—" },
                { label: "Last Name",        value: user.lastName  || "—" },
                { label: t.dashboard.dobLabel,    value: user.dateOfBirth ? formatDate(user.dateOfBirth) : "—" },
                { label: t.dashboard.ageLabel,    value: user.age    ? `${user.age} ${t.dashboard.years}` : "—" },
                { label: t.dashboard.heightLabel, value: user.height ? `${user.height} ${t.dashboard.cm}` : "—" },
                { label: t.dashboard.weightLabel, value: user.weight ? `${user.weight} ${t.dashboard.kg}` : "—" },
                { label: "Education",        value: user.education  || "—" },
                { label: t.dashboard.occupationLabel, value: user.occupation || "—" },
                { label: "Family Members",   value: user.familyMembers != null ? String(user.familyMembers) : "—" },
                { label: "Marital Status",   value: user.maritalStatus || "—" },
                { label: "Tattoo",           value: user.tattooStatus  || "—" },
                { label: t.dashboard.ethnicityLabel, value: user.ethnicity || "—" },
                { label: t.dashboard.religionLabel,  value: user.religion  || "—" },
              ].map(({ label, value }) => (
                <div key={label} className="flex justify-between">
                  <dt className="text-slate-500 shrink-0">{label}</dt>
                  <dd className="font-medium text-slate-800 text-right ml-2">{value}</dd>
                </div>
              ))}
            </dl>
            <Link to="/dashboard/edit">
              <Button variant="outline" size="sm" className="mt-4 w-full">{t.dashboard.editProfile}</Button>
            </Link>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t.dashboard.photosTitle} ({photoCount})</CardTitle>
              <CardDescription>{t.dashboard.minPhotos}</CardDescription>
            </CardHeader>
            {photoCount === 0 ? (
              <div className="text-center py-6">
                <p className="text-slate-400 text-sm mb-3">{t.dashboard.noPhotos}</p>
                <Link to="/dashboard/photos"><Button size="sm">{t.dashboard.uploadPhotos}</Button></Link>
              </div>
            ) : (
              <div>
                <div className="grid grid-cols-3 gap-2 mb-3">
                  {user.photos.slice(0, 6).map((url, i) => (
                    <img key={i} src={url} alt={`Photo ${i + 1}`} className="w-full h-20 object-cover rounded-lg" />
                  ))}
                </div>
                <Link to="/dashboard/photos">
                  <Button variant="outline" size="sm" className="w-full">{t.dashboard.managePhotos}</Button>
                </Link>
              </div>
            )}
          </Card>
        </div>

        {/* Address + Contact row */}
        <div className="grid sm:grid-cols-2 gap-6 mb-6">
          <Card>
            <CardHeader><CardTitle>Addresses</CardTitle></CardHeader>
            <dl className="space-y-3 text-sm">
              <div>
                <dt className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">Place of Birth</dt>
                <dd className="text-slate-800 font-medium">
                  {[user.birthVillage, user.birthDistrict, user.birthProvince].filter(Boolean).join(", ") || "—"}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">Current Address</dt>
                <dd className="text-slate-800 font-medium">
                  {[user.currentVillage, user.currentDistrict, user.currentProvince].filter(Boolean).join(", ") || "—"}
                </dd>
              </div>
            </dl>
          </Card>
          <Card>
            <CardHeader><CardTitle>Contact & Social</CardTitle></CardHeader>
            <dl className="space-y-2 text-sm">
              {[
                { label: "Primary Phone",   value: user.phone },
                { label: "Secondary Phone", value: user.secondaryPhone || "—" },
                { label: "Facebook", value: user.facebookUrl ? "Linked" : "—" },
                { label: "TikTok",   value: user.tiktokUrl   ? "Linked" : "—" },
              ].map(({ label, value }) => (
                <div key={label} className="flex justify-between">
                  <dt className="text-slate-500">{label}</dt>
                  <dd className="font-medium text-slate-800">{value}</dd>
                </div>
              ))}
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
              { label: t.dashboard.nationalId, url: user.nationalIdUrl, required: true },
              { label: t.dashboard.passport, url: user.passportUrl, required: true },
              { label: t.dashboard.familyDoc, url: user.familyDocUrl, required: false },
            ].map((doc) => (
              <div key={doc.label} className={`p-4 rounded-xl border-2 border-dashed ${doc.url ? "border-green-200 bg-green-50" : "border-slate-200 bg-slate-50"}`}>
                <p className="text-xs font-medium text-slate-700 mb-2">{doc.label}{doc.required && <span className="text-rose-500 ml-1">*</span>}</p>
                {doc.url ? <span className="text-xs text-green-600 font-medium">{t.dashboard.docUploaded}</span> : <span className="text-xs text-slate-400">{t.dashboard.docNotUploaded}</span>}
              </div>
            ))}
          </div>
          <Link to="/dashboard/documents">
            <Button variant="outline" size="sm" className="mt-4">{t.dashboard.uploadDocs}</Button>
          </Link>
        </Card>
      </main>
    </div>
  );
}
