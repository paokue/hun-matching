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

export default function AdminApplicantDetail({ loaderData, actionData }: Route.ComponentProps) {
  const { user } = loaderData;

  return (
    <AdminLayout>
      <div className="max-w-5xl mx-auto px-6 py-8">
        <div className="flex items-center gap-3 mb-6">
          <Link to="/admin/applicants" className="text-slate-400 hover:text-slate-600 text-sm">← Applicants</Link>
          <span className="text-slate-300">/</span>
          <h1 className="text-xl font-bold text-slate-900">{user.profileId}</h1>
        </div>

        {(actionData?.success || actionData?.error) && (
          <div className={`mb-4 p-3 rounded-lg text-sm ${actionData?.success ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>{actionData?.success || actionData?.error}</div>
        )}

        <div className="flex gap-2 mb-6 flex-wrap">
          <Badge variant={statusBadge(user.status)} className="mr-2">{user.status}</Badge>
          {user.status === "pending" && <Form method="post"><input type="hidden" name="intent" value="approve" /><Button type="submit" size="sm" variant="primary">✓ Approve</Button></Form>}
          {user.status === "pending" && <Form method="post"><input type="hidden" name="intent" value="reject" /><Button type="submit" size="sm" variant="outline">✗ Reject</Button></Form>}
          {user.status === "active" && <Form method="post"><input type="hidden" name="intent" value="suspend" /><Button type="submit" size="sm" variant="outline">Suspend</Button></Form>}
          {(user.status === "suspended" || user.status === "rejected") && <Form method="post"><input type="hidden" name="intent" value="activate" /><Button type="submit" size="sm" variant="outline">Reactivate</Button></Form>}
          <Form method="post" onSubmit={(e) => { if (!confirm("Delete permanently?")) e.preventDefault(); }}><input type="hidden" name="intent" value="delete" /><Button type="submit" size="sm" variant="danger">Delete</Button></Form>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <Card>
            <CardHeader><CardTitle>Personal Information</CardTitle></CardHeader>
            <dl className="space-y-2 text-sm">
              {[
                { l: "Full Name", v: user.fullName },
                { l: "Profile ID", v: user.profileId },
                { l: "Phone", v: user.phone },
                { l: "Date of Birth", v: user.dateOfBirth ? formatDate(user.dateOfBirth) : "—" },
                { l: "Age", v: user.age ? `${user.age} yrs` : "—" },
                { l: "Height", v: user.height ? `${user.height} cm` : "—" },
                { l: "Weight", v: user.weight ? `${user.weight} kg` : "—" },
                { l: "Occupation", v: user.occupation || "—" },
                { l: "Marital Status", v: user.maritalStatus || "—" },
                { l: "Tattoo", v: user.tattooStatus || "—" },
                { l: "Ethnicity", v: user.ethnicity || "—" },
                { l: "Religion", v: user.religion || "—" },
                { l: "Address", v: user.currentAddress || "—" },
              ].map(({ l, v }) => (
                <div key={l} className="flex justify-between py-1 border-b border-slate-50">
                  <dt className="text-slate-500">{l}</dt>
                  <dd className="font-medium text-slate-800 text-right max-w-48 truncate">{v}</dd>
                </div>
              ))}
            </dl>
          </Card>

          <div className="space-y-5">
            {user.secondaryPhone && (
              <Card>
                <CardHeader><CardTitle>Secondary Contact</CardTitle></CardHeader>
                <dl className="space-y-2 text-sm">
                  <div className="flex justify-between"><dt className="text-slate-500">Secondary Phone</dt><dd className="font-medium">{user.secondaryPhone}</dd></div>
                  {user.facebookUrl && <div><dt className="text-slate-500 text-xs mb-1">Facebook</dt><a href={user.facebookUrl} target="_blank" rel="noopener noreferrer" className="text-rose-500 text-xs truncate block">{user.facebookUrl}</a></div>}
                </dl>
              </Card>
            )}

            <Card>
              <CardHeader><CardTitle>Documents</CardTitle></CardHeader>
              <div className="space-y-2">
                {[
                  { label: "National ID", url: user.nationalIdUrl },
                  { label: "Passport", url: user.passportUrl },
                  { label: "Family Doc", url: user.familyDocUrl },
                ].map((doc) => (
                  <div key={doc.label} className="flex items-center justify-between text-sm">
                    <span className="text-slate-600">{doc.label}</span>
                    {doc.url ? <a href={doc.url} target="_blank" rel="noopener noreferrer" className="text-rose-500 text-xs hover:text-rose-600">View →</a> : <span className="text-xs text-slate-400">Not uploaded</span>}
                  </div>
                ))}
              </div>
            </Card>

            <Card>
              <CardHeader><CardTitle>Photos ({user.photos?.length ?? 0})</CardTitle></CardHeader>
              <div className="grid grid-cols-3 gap-2">
                {user.photos?.slice(0, 6).map((url, i) => (
                  <a key={i} href={url} target="_blank" rel="noopener noreferrer">
                    <img src={url} alt="" className="w-full h-20 object-cover rounded-lg hover:opacity-80" />
                  </a>
                ))}
              </div>
            </Card>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
