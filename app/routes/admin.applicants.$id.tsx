import { Form, Link, redirect } from "react-router";
import type { Route } from "./+types/admin.applicants.$id";
import { requireAdmin } from "~/lib/auth.server";
import { AdminLayout } from "~/components/layout/AdminLayout";
import { Card, CardHeader, CardTitle } from "~/components/ui/Card";
import { Badge, statusBadge } from "~/components/ui/Badge";
import { Button } from "~/components/ui/Button";
import { formatDate } from "~/lib/utils";
import { prisma } from "~/lib/prisma.server";

export function meta(_: Route.MetaArgs) {
  return [{ title: "Applicant Detail — Admin" }];
}

export async function loader({ request, params }: Route.LoaderArgs) {
  await requireAdmin(request);
  const user = await prisma.user.findUnique({ where: { id: params.id } });
  if (!user) throw new Response("Not found", { status: 404 });
  return { user };
}

export async function action({ request, params }: Route.ActionArgs) {
  await requireAdmin(request);
  const formData = await request.formData();
  const intent = formData.get("intent") as string;

  const updates: Record<string, Record<string, unknown>> = {
    approve: { status: "active", isProfileComplete: true },
    reject: { status: "rejected" },
    suspend: { status: "suspended" },
    activate: { status: "active" },
  };

  if (intent === "delete") {
    await prisma.user.delete({ where: { id: params.id } });
    return redirect("/admin/applicants");
  }

  if (updates[intent]) {
    await prisma.user.update({ where: { id: params.id }, data: updates[intent] });
    return { success: `User ${intent}d successfully.` };
  }

  return { error: "Unknown action." };
}

function Field({ l, v }: { l: string; v: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-3 py-1.5 border-b border-slate-50 last:border-0">
      <dt className="text-slate-500 shrink-0">{l}</dt>
      <dd className="font-medium text-slate-800 text-right max-w-[14rem] truncate">{v ?? "—"}</dd>
    </div>
  );
}

function joinAddress(...parts: (string | null | undefined)[]) {
  const filled = parts.filter(Boolean);
  return filled.length ? filled.join(", ") : "—";
}

export default function AdminApplicantDetail({ loaderData, actionData }: Route.ComponentProps) {
  const { user } = loaderData;

  return (
    <AdminLayout>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <div className="flex items-center gap-3 mb-6">
          <Link to="/admin/applicants" className="text-slate-400 hover:text-slate-600 text-sm">← Applicants</Link>
          <span className="text-slate-300">/</span>
          <h1 className="text-xl font-bold text-slate-900">{user.profileId}</h1>
        </div>

        {(actionData?.success || actionData?.error) && (
          <div className={`mb-4 p-3 rounded-lg text-sm ${actionData?.success ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>{actionData?.success || actionData?.error}</div>
        )}

        <div className="flex gap-2 mb-6 flex-wrap items-center">
          <Badge variant={statusBadge(user.status)} className="mr-2">{user.status}</Badge>
          {user.phone && <a href={`tel:${user.phone}`}><Button size="sm" variant="outline">📞 Call</Button></a>}
          {user.status === "pending" && <Form method="post"><input type="hidden" name="intent" value="approve" /><Button type="submit" size="sm" variant="primary">✓ Approve</Button></Form>}
          {user.status === "pending" && <Form method="post"><input type="hidden" name="intent" value="reject" /><Button type="submit" size="sm" variant="outline">✗ Reject</Button></Form>}
          {user.status === "active" && <Form method="post"><input type="hidden" name="intent" value="suspend" /><Button type="submit" size="sm" variant="outline">Suspend</Button></Form>}
          {(user.status === "suspended" || user.status === "rejected") && <Form method="post"><input type="hidden" name="intent" value="activate" /><Button type="submit" size="sm" variant="outline">Reactivate</Button></Form>}
          <Form method="post" onSubmit={(e) => { if (!confirm("Delete permanently?")) e.preventDefault(); }}><input type="hidden" name="intent" value="delete" /><Button type="submit" size="sm" variant="danger">Delete</Button></Form>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <div className="space-y-5">
            <Card>
              <CardHeader><CardTitle>Personal Information</CardTitle></CardHeader>
              <dl className="space-y-0 text-sm">
                <Field l="Full Name" v={user.fullName} />
                <Field l="First Name" v={user.firstName} />
                <Field l="Last Name" v={user.lastName} />
                <Field l="Profile ID" v={user.profileId} />
                <Field l="Date of Birth" v={user.dateOfBirth ? formatDate(user.dateOfBirth) : null} />
                <Field l="Age" v={user.age ? `${user.age} yrs` : null} />
                <Field l="Height" v={user.height ? `${user.height} cm` : null} />
                <Field l="Weight" v={user.weight ? `${user.weight} kg` : null} />
                <Field l="Registered" v={formatDate(user.createdAt)} />
              </dl>
            </Card>

            <Card>
              <CardHeader><CardTitle>Background</CardTitle></CardHeader>
              <dl className="space-y-0 text-sm">
                <Field l="Education" v={user.education} />
                <Field l="Occupation" v={user.occupation} />
                <Field l="Family Members" v={user.familyMembers != null ? String(user.familyMembers) : null} />
                <Field l="Marital Status" v={user.maritalStatus} />
                <Field l="Tattoo" v={user.tattooStatus} />
                <Field l="Ethnicity" v={user.ethnicity} />
                <Field l="Religion" v={user.religion} />
              </dl>
            </Card>

            <Card>
              <CardHeader><CardTitle>Addresses</CardTitle></CardHeader>
              <dl className="space-y-0 text-sm">
                <Field l="Place of Birth" v={joinAddress(user.birthVillage, user.birthDistrict, user.birthProvince)} />
                <Field l="Current Address" v={joinAddress(user.currentVillage, user.currentDistrict, user.currentProvince) === "—" ? user.currentAddress : joinAddress(user.currentVillage, user.currentDistrict, user.currentProvince)} />
              </dl>
            </Card>
          </div>

          <div className="space-y-5">
            <Card>
              <CardHeader><CardTitle>Contact & Social</CardTitle></CardHeader>
              <dl className="space-y-0 text-sm">
                <Field l="Primary Phone" v={user.phone ? <a href={`tel:${user.phone}`} className="text-rose-500 hover:text-rose-600">{user.phone}</a> : null} />
                <Field l="Secondary Phone" v={user.secondaryPhone ? <a href={`tel:${user.secondaryPhone}`} className="text-rose-500 hover:text-rose-600">{user.secondaryPhone}</a> : null} />
                <Field l="Facebook" v={user.facebookUrl ? <a href={user.facebookUrl} target="_blank" rel="noopener noreferrer" className="text-rose-500 hover:text-rose-600">Open ↗</a> : null} />
                <Field l="TikTok" v={user.tiktokUrl ? <a href={user.tiktokUrl} target="_blank" rel="noopener noreferrer" className="text-rose-500 hover:text-rose-600">Open ↗</a> : null} />
              </dl>
            </Card>

            <Card>
              <CardHeader><CardTitle>Documents</CardTitle></CardHeader>
              <div className="space-y-2">
                {[
                  { label: "National ID (Front)", url: user.nationalIdUrl },
                  { label: "National ID (Back)", url: user.nationalIdBackUrl },
                  { label: "Passport", url: user.passportUrl },
                  { label: "Family Doc", url: user.familyDocUrl },
                ].map((doc) => (
                  <div key={doc.label} className="flex items-center justify-between text-sm">
                    <span className="text-slate-600">{doc.label}</span>
                    {doc.url
                      ? <a href={doc.url} target="_blank" rel="noopener noreferrer" className="text-rose-500 text-xs hover:text-rose-600">View →</a>
                      : <span className="text-xs text-slate-400">Not uploaded</span>}
                  </div>
                ))}
              </div>
            </Card>

            <Card>
              <CardHeader><CardTitle>Photos ({user.photos?.length ?? 0})</CardTitle></CardHeader>
              {user.photos && user.photos.length > 0 ? (
                <div className="grid grid-cols-3 gap-2">
                  {user.photos.slice(0, 9).map((url, i) => (
                    <a key={i} href={url} target="_blank" rel="noopener noreferrer">
                      <img src={url} alt="" className="w-full h-20 object-cover rounded-lg hover:opacity-80 transition-opacity" />
                    </a>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-400 text-center py-3">No photos uploaded</p>
              )}
            </Card>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
