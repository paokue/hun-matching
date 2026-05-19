import { Form, Link } from "react-router";
import type { Route } from "./+types/admin.payments";
import { requireAdmin } from "~/lib/auth.server";
import { addDays } from "date-fns";
import { AdminLayout } from "~/components/layout/AdminLayout";
import { Card } from "~/components/ui/Card";
import { Badge } from "~/components/ui/Badge";
import { formatDate } from "~/lib/utils";
import { prisma } from "~/lib/prisma.server";

export function meta(_: Route.MetaArgs) {
  return [{ title: "Payments — Admin" }];
}

export async function loader({ request }: Route.LoaderArgs) {
  await requireAdmin(request);
  const url = new URL(request.url);
  const status = url.searchParams.get("status") || "pending";

  const payments = await prisma.payment.findMany({
    where: status ? { status } : {},
    include: { agency: { select: { companyName: true, agencyId: true, email: true } } },
    orderBy: { createdAt: "desc" },
  });

  return { payments, filterStatus: status };
}

export async function action({ request }: Route.ActionArgs) {
  const session = await requireAdmin(request);
  const formData = await request.formData();
  const intent = formData.get("intent") as string;
  const paymentId = formData.get("paymentId") as string;

  if (intent === "verify") {
    const payment = await prisma.payment.findUnique({ where: { id: paymentId }, include: { package: true } });
    if (!payment) return { error: "Payment not found." };

    const durationDays = payment.package?.durationDays ?? 30;
    const now = new Date();
    const end = addDays(now, durationDays);

    await Promise.all([
      prisma.payment.update({ where: { id: paymentId }, data: { status: "verified", verifiedBy: session.userId, verifiedAt: now, membershipStartDate: now, membershipEndDate: end } }),
      prisma.agency.update({ where: { id: payment.agencyId }, data: { status: "active", membershipExpiresAt: end } }),
    ]);
    return { success: "Payment verified and membership activated." };
  }

  if (intent === "reject") {
    await prisma.payment.update({ where: { id: paymentId }, data: { status: "rejected" } });
    return { success: "Payment rejected." };
  }

  return { error: "Unknown action." };
}

export default function AdminPayments({ loaderData, actionData }: Route.ComponentProps) {
  const { payments, filterStatus } = loaderData;
  const statusVariant = (s: string) => s === "verified" ? "success" : s === "rejected" ? "danger" : "warning";

  return (
    <AdminLayout>
      <div className="max-w-7xl mx-auto px-6 py-8">
        <h1 className="text-xl font-bold text-slate-900 mb-6">Payment Management</h1>

        {(actionData?.success || actionData?.error) && (
          <div className={`mb-4 p-3 rounded-lg text-sm ${actionData?.success ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>{actionData?.success || actionData?.error}</div>
        )}

        <div className="flex gap-2 mb-6">
          {["pending", "verified", "rejected", ""].map((s) => (
            <Link key={s || "all"} to={s ? `/admin/payments?status=${s}` : "/admin/payments"} className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${filterStatus === s ? "bg-slate-900 text-white" : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"}`}>
              {s || "All"}
            </Link>
          ))}
        </div>

        <Card padding="none">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">Agency</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">Package</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">Amount</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">Method</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">Status</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">Date</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {payments.map((payment) => (
                  <tr key={payment.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3"><p className="font-medium text-slate-900">{payment.agency?.companyName}</p><p className="text-xs text-slate-500">{payment.agency?.email}</p></td>
                    <td className="px-4 py-3 text-slate-600">{payment.packageName}</td>
                    <td className="px-4 py-3 font-bold text-slate-900">${payment.amount}</td>
                    <td className="px-4 py-3 text-slate-600">{payment.paymentMethod}</td>
                    <td className="px-4 py-3"><Badge variant={statusVariant(payment.status)}>{payment.status}</Badge></td>
                    <td className="px-4 py-3 text-xs text-slate-500">{formatDate(payment.createdAt)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {payment.receiptUrl && <a href={payment.receiptUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-500 hover:text-blue-700">Receipt</a>}
                        {payment.status === "pending" && (
                          <>
                            <Form method="post"><input type="hidden" name="paymentId" value={payment.id} /><input type="hidden" name="intent" value="verify" /><button type="submit" className="text-xs text-green-600 hover:text-green-800 font-medium">✓ Verify</button></Form>
                            <Form method="post"><input type="hidden" name="paymentId" value={payment.id} /><input type="hidden" name="intent" value="reject" /><button type="submit" className="text-xs text-red-500 hover:text-red-700 font-medium">✗ Reject</button></Form>
                          </>
                        )}
                        {payment.status === "verified" && payment.membershipEndDate && <span className="text-xs text-slate-400">Expires {formatDate(payment.membershipEndDate)}</span>}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {payments.length === 0 && <div className="text-center py-12 text-slate-400 text-sm">No payments found</div>}
          </div>
        </Card>
      </div>
    </AdminLayout>
  );
}
