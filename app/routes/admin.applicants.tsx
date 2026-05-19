import { Form, Link, useSearchParams } from "react-router";
import type { Route } from "./+types/admin.applicants";
import { requireAdmin } from "~/lib/auth.server";
import { AdminLayout } from "~/components/layout/AdminLayout";
import { Card } from "~/components/ui/Card";
import { Badge, statusBadge } from "~/components/ui/Badge";
import { Button } from "~/components/ui/Button";
import { formatDate } from "~/lib/utils";
import { prisma } from "~/lib/prisma.server";

export function meta(_: Route.MetaArgs) {
  return [{ title: "Manage Applicants — Admin" }];
}

export async function loader({ request }: Route.LoaderArgs) {
  await requireAdmin(request);

  const url = new URL(request.url);
  const status = url.searchParams.get("status") || "";
  const search = url.searchParams.get("search") || "";

  const users = await prisma.user.findMany({
    where: {
      ...(status ? { status } : {}),
      ...(search ? {
        OR: [
          { profileId: { contains: search, mode: "insensitive" } },
          { fullName: { contains: search, mode: "insensitive" } },
          { phone: { contains: search, mode: "insensitive" } },
        ],
      } : {}),
    },
    select: { id: true, profileId: true, fullName: true, phone: true, status: true, photos: true, createdAt: true, isProfileComplete: true },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return { users };
}

export async function action({ request }: Route.ActionArgs) {
  await requireAdmin(request);
  const formData = await request.formData();
  const intent = formData.get("intent") as string;
  const userId = formData.get("userId") as string;

  if (intent === "approve") { await prisma.user.update({ where: { id: userId }, data: { status: "active", isProfileComplete: true } }); return { success: "Profile approved." }; }
  if (intent === "reject") { await prisma.user.update({ where: { id: userId }, data: { status: "rejected" } }); return { success: "Profile rejected." }; }
  if (intent === "suspend") { await prisma.user.update({ where: { id: userId }, data: { status: "suspended" } }); return { success: "User suspended." }; }
  if (intent === "delete") { await prisma.user.delete({ where: { id: userId } }); return { success: "User deleted." }; }

  return { error: "Unknown action." };
}

export default function AdminApplicants({ loaderData, actionData }: Route.ComponentProps) {
  const { users } = loaderData;
  const [searchParams] = useSearchParams();

  return (
    <AdminLayout>
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-bold text-slate-900">Manage Applicants</h1>
          <span className="text-sm text-slate-500">{users.length} results</span>
        </div>

        {(actionData?.success || actionData?.error) && (
          <div className={`mb-4 p-3 rounded-lg text-sm ${actionData?.success ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>{actionData?.success || actionData?.error}</div>
        )}

        <Form method="get" className="flex gap-3 mb-6 flex-wrap">
          <input name="search" placeholder="Search by name, ID, phone..." defaultValue={searchParams.get("search") ?? ""} className="flex-1 min-w-48 px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white" />
          <select name="status" defaultValue={searchParams.get("status") ?? ""} className="px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white">
            <option value="">All Status</option>
            <option value="pending">Pending</option>
            <option value="active">Active</option>
            <option value="suspended">Suspended</option>
            <option value="rejected">Rejected</option>
          </select>
          <Button type="submit" size="sm" variant="outline">Filter</Button>
          <Link to="/admin/applicants"><Button variant="ghost" size="sm">Clear</Button></Link>
        </Form>

        <Card padding="none">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">Profile</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">Phone</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">Status</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">Registered</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users.map((user) => (
                  <tr key={user.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {user.photos?.[0] ? <img src={user.photos[0]} alt="" className="w-9 h-9 rounded-full object-cover" /> : <div className="w-9 h-9 rounded-full bg-slate-200 flex items-center justify-center text-slate-400 text-sm">👤</div>}
                        <div><p className="font-medium text-slate-900">{user.profileId}</p><p className="text-xs text-slate-500">{user.fullName}</p></div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{user.phone}</td>
                    <td className="px-4 py-3"><Badge variant={statusBadge(user.status)}>{user.status}</Badge></td>
                    <td className="px-4 py-3 text-slate-500 text-xs">{formatDate(user.createdAt)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Link to={`/admin/applicants/${user.id}`} className="text-xs text-blue-500 hover:text-blue-700 font-medium">View</Link>
                        {user.status === "pending" && <Form method="post"><input type="hidden" name="userId" value={user.id} /><input type="hidden" name="intent" value="approve" /><button type="submit" className="text-xs text-green-600 hover:text-green-800 font-medium">Approve</button></Form>}
                        {user.status !== "suspended" && user.status !== "rejected" && <Form method="post"><input type="hidden" name="userId" value={user.id} /><input type="hidden" name="intent" value="suspend" /><button type="submit" className="text-xs text-amber-600 hover:text-amber-800 font-medium">Suspend</button></Form>}
                        <Form method="post" onSubmit={(e) => { if (!confirm("Delete this user permanently?")) e.preventDefault(); }}><input type="hidden" name="userId" value={user.id} /><input type="hidden" name="intent" value="delete" /><button type="submit" className="text-xs text-red-500 hover:text-red-700 font-medium">Delete</button></Form>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {users.length === 0 && <div className="text-center py-12 text-slate-400"><p className="text-3xl mb-2">👥</p><p className="text-sm">No applicants found</p></div>}
          </div>
        </Card>
      </div>
    </AdminLayout>
  );
}
