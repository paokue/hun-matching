import { Form, Link, useSearchParams } from "react-router";
import type { Route } from "./+types/admin.agencies";
import { requireAdmin } from "~/lib/auth.server";
import { AdminLayout } from "~/components/layout/AdminLayout";
import { Card } from "~/components/ui/Card";
import { Badge, statusBadge } from "~/components/ui/Badge";
import { Button } from "~/components/ui/Button";
import { formatDate } from "~/lib/utils";
import { prisma } from "~/lib/prisma.server";

export function meta(_: Route.MetaArgs) {
  return [{ title: "Manage Agencies — Admin" }];
}

export async function loader({ request }: Route.LoaderArgs) {
  await requireAdmin(request);
  const url = new URL(request.url);
  const search = url.searchParams.get("search") || "";
  const status = url.searchParams.get("status") || "";

  const agencies = await prisma.agency.findMany({
    where: {
      ...(status ? { status } : {}),
      ...(search ? {
        OR: [
          { agencyId: { contains: search, mode: "insensitive" } },
          { companyName: { contains: search, mode: "insensitive" } },
          { email: { contains: search, mode: "insensitive" } },
        ],
      } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return { agencies };
}

export async function action({ request }: Route.ActionArgs) {
  await requireAdmin(request);
  const formData = await request.formData();
  const intent = formData.get("intent") as string;
  const agencyId = formData.get("agencyId") as string;

  if (intent === "verify") await prisma.agency.update({ where: { id: agencyId }, data: { isVerified: true, status: "active" } });
  else if (intent === "suspend") await prisma.agency.update({ where: { id: agencyId }, data: { status: "suspended" } });
  else if (intent === "activate") await prisma.agency.update({ where: { id: agencyId }, data: { status: "active" } });
  else if (intent === "delete") await prisma.agency.delete({ where: { id: agencyId } });

  return { success: `Agency ${intent}d.` };
}

export default function AdminAgencies({ loaderData, actionData }: Route.ComponentProps) {
  const { agencies } = loaderData;
  const [searchParams] = useSearchParams();

  return (
    <AdminLayout>
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-bold text-slate-900">Manage Agencies</h1>
        </div>

        {actionData?.success && <div className="mb-4 p-3 rounded-lg text-sm bg-green-50 text-green-700">{actionData.success}</div>}

        <Form method="get" className="flex gap-3 mb-6 flex-wrap">
          <input name="search" placeholder="Search agencies..." defaultValue={searchParams.get("search") ?? ""} className="flex-1 min-w-48 px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white" />
          <select name="status" defaultValue={searchParams.get("status") ?? ""} className="px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white">
            <option value="">All Status</option>
            <option value="pending">Pending</option>
            <option value="active">Active</option>
            <option value="suspended">Suspended</option>
          </select>
          <Button type="submit" size="sm" variant="outline">Filter</Button>
        </Form>

        <Card padding="none">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">Agency</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">Email</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">Status</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">Verified</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">Membership</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {agencies.map((agency) => (
                  <tr key={agency.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3"><p className="font-medium text-slate-900">{agency.companyName}</p><p className="text-xs text-slate-500">{agency.agencyId}</p></td>
                    <td className="px-4 py-3 text-slate-600">{agency.email}</td>
                    <td className="px-4 py-3"><Badge variant={statusBadge(agency.status)}>{agency.status}</Badge></td>
                    <td className="px-4 py-3">{agency.isVerified ? <Badge variant="success">Yes</Badge> : <span className="text-xs text-slate-400">No</span>}</td>
                    <td className="px-4 py-3 text-xs text-slate-500">
                      {agency.membershipExpiresAt && new Date(agency.membershipExpiresAt) > new Date() ? `Active until ${formatDate(agency.membershipExpiresAt)}` : "None"}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        {!agency.isVerified && <Form method="post"><input type="hidden" name="agencyId" value={agency.id} /><input type="hidden" name="intent" value="verify" /><button type="submit" className="text-xs text-green-600 hover:text-green-800 font-medium">Verify</button></Form>}
                        {agency.status === "active"
                          ? <Form method="post"><input type="hidden" name="agencyId" value={agency.id} /><input type="hidden" name="intent" value="suspend" /><button type="submit" className="text-xs text-amber-600 hover:text-amber-800 font-medium">Suspend</button></Form>
                          : <Form method="post"><input type="hidden" name="agencyId" value={agency.id} /><input type="hidden" name="intent" value="activate" /><button type="submit" className="text-xs text-blue-600 hover:text-blue-800 font-medium">Activate</button></Form>}
                        <Form method="post" onSubmit={(e) => { if (!confirm("Delete?")) e.preventDefault(); }}><input type="hidden" name="agencyId" value={agency.id} /><input type="hidden" name="intent" value="delete" /><button type="submit" className="text-xs text-red-500 hover:text-red-700 font-medium">Delete</button></Form>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {agencies.length === 0 && <div className="text-center py-12 text-slate-400 text-sm">No agencies found</div>}
          </div>
        </Card>
      </div>
    </AdminLayout>
  );
}
