import { useState, useEffect } from "react";
import { Link, useSearchParams } from "react-router";
import { toast } from "sonner";
import type { Route } from "./+types/admin.payments";
import { requireAdmin } from "~/lib/auth.server";
import { addDays } from "date-fns";
import { AdminLayout } from "~/components/layout/AdminLayout";
import { Card } from "~/components/ui/Card";
import { Badge } from "~/components/ui/Badge";
import { ConfirmModal } from "~/components/ui/ConfirmModal";
import { DropdownMenu } from "~/components/ui/DropdownMenu";
import { formatDate } from "~/lib/utils";
import { prisma } from "~/lib/prisma.server";
import { notifyPaymentStatus } from "~/lib/pusher.server";

const PER_OPTIONS = [20, 30, 50, 100, 500];
const DEFAULT_PER = 20;

export function meta(_: Route.MetaArgs) {
  return [{ title: "Payments — Admin" }];
}

export async function loader({ request }: Route.LoaderArgs) {
  await requireAdmin(request);
  const url = new URL(request.url);
  const status = url.searchParams.get("status") || "";
  const perRaw = parseInt(url.searchParams.get("per") || String(DEFAULT_PER));
  const perPage = PER_OPTIONS.includes(perRaw) ? perRaw : DEFAULT_PER;
  const page = Math.max(1, parseInt(url.searchParams.get("page") || "1"));

  const where = status ? { status } : {};

  const [payments, total] = await Promise.all([
    prisma.payment.findMany({
      where,
      include: { agency: { select: { companyName: true, agencyId: true, email: true } } },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * perPage,
      take: perPage,
    }),
    prisma.payment.count({ where }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / perPage));
  return { payments, total, totalPages, page, perPage, filterStatus: status };
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
    await notifyPaymentStatus({
      paymentId: payment.id,
      agencyId: payment.agencyId,
      status: "verified",
      packageName: payment.packageName,
      membershipExpiresAt: end,
    });
    return { success: "Payment verified and membership activated." };
  }

  if (intent === "reject") {
    const updated = await prisma.payment.update({ where: { id: paymentId }, data: { status: "rejected" }, select: { id: true, agencyId: true, packageName: true } });
    await notifyPaymentStatus({
      paymentId: updated.id,
      agencyId: updated.agencyId,
      status: "rejected",
      packageName: updated.packageName,
    });
    return { success: "Payment rejected." };
  }

  return { error: "Unknown action." };
}

type Row = Awaited<ReturnType<typeof loader>>["payments"][number];

const statusVariant = (s: string) => s === "verified" ? "success" : s === "rejected" ? "danger" : "warning";

const Ico = {
  dots: <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M10 6a1.5 1.5 0 110-3 1.5 1.5 0 010 3zm0 5.5a1.5 1.5 0 110-3 1.5 1.5 0 010 3zm0 5.5a1.5 1.5 0 110-3 1.5 1.5 0 010 3z" /></svg>,
  receipt: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>,
  check: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
  x: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
  phone: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h2.28a1 1 0 01.95.68l1.5 4.5a1 1 0 01-.51 1.21l-1.93.97a11 11 0 005.52 5.52l.97-1.93a1 1 0 011.21-.51l4.5 1.5a1 1 0 01.68.95V19a2 2 0 01-2 2h-1C9.72 21 3 14.28 3 6V5z" /></svg>,
};

function RowActions({ payment }: { payment: Row }) {
  const [confirm, setConfirm] = useState<null | "verify" | "reject">(null);
  const itemCls = "w-full flex items-center gap-2.5 px-3.5 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors text-left";
  const isPending = payment.status === "pending";
  const isManual = payment.paymentType === "manual";

  if (!payment.receiptUrl && !payment.paymentPhone && !isPending) {
    return payment.membershipEndDate
      ? <span className="text-xs text-slate-400">Expires {formatDate(payment.membershipEndDate)}</span>
      : <span className="text-xs text-slate-400">—</span>;
  }

  return (
    <>
      <DropdownMenu trigger={Ico.dots} width={208}>
        {(close) => (
          <>
            {isManual && payment.paymentPhone && (
              <a href={`tel:${payment.paymentPhone}`} className={itemCls} onClick={close}>
                <span className="text-blue-500">{Ico.phone}</span> Call {payment.paymentPhone}
              </a>
            )}
            {!isManual && payment.receiptUrl && (
              <a href={payment.receiptUrl} target="_blank" rel="noopener noreferrer" className={itemCls} onClick={close}>
                <span className="text-blue-500">{Ico.receipt}</span> View Receipt
              </a>
            )}
            {isPending && (
              <>
                <button type="button" className={itemCls} onClick={() => { close(); setConfirm("verify"); }}>
                  <span className="text-emerald-500">{Ico.check}</span> Verify
                </button>
                <button type="button" className={`${itemCls} text-red-500`} onClick={() => { close(); setConfirm("reject"); }}>
                  <span>{Ico.x}</span> Reject
                </button>
              </>
            )}
          </>
        )}
      </DropdownMenu>

      {confirm === "verify" && (
        <ConfirmModal title="Verify payment?" description={`Verifying $${payment.amount} for ${payment.agency?.companyName} will activate their membership immediately.`} confirmLabel="Verify" hiddenInputs={{ paymentId: payment.id, intent: "verify" }} onCancel={() => setConfirm(null)} />
      )}
      {confirm === "reject" && (
        <ConfirmModal title="Reject payment?" description={`This will mark ${payment.agency?.companyName}'s payment as rejected. They can submit a new payment afterward.`} confirmLabel="Reject" danger hiddenInputs={{ paymentId: payment.id, intent: "reject" }} onCancel={() => setConfirm(null)} />
      )}
    </>
  );
}

function withParams(current: URLSearchParams, updates: Record<string, string | null>) {
  const next = new URLSearchParams(current);
  for (const [k, v] of Object.entries(updates)) {
    if (v == null || v === "") next.delete(k);
    else next.set(k, v);
  }
  const s = next.toString();
  return s ? `?${s}` : "";
}

export default function AdminPayments({ loaderData, actionData }: Route.ComponentProps) {
  const { payments, total, totalPages, page, perPage, filterStatus } = loaderData;
  const [searchParams] = useSearchParams();

  useEffect(() => {
    if (actionData?.success) toast.success(actionData.success);
    else if (actionData?.error) toast.error(actionData.error);
  }, [actionData]);

  const selectCls = "px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white text-slate-500";

  return (
    <AdminLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-lg sm:text-xl font-bold text-slate-900">Payment Management</h1>
          <span className="text-sm text-slate-500">{total} total</span>
        </div>

        <div className="flex gap-2 mb-4 flex-wrap items-center">
          {[
            { v: "pending", label: "Pending" },
            { v: "verified", label: "Verified" },
            { v: "rejected", label: "Rejected" },
            { v: "", label: "All" },
          ].map((s) => (
            <Link
              key={s.label}
              to={s.v ? withParams(searchParams, { status: s.v, page: null }) : withParams(searchParams, { status: null, page: null })}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${filterStatus === s.v ? "bg-rose-500 text-white" : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"}`}
            >
              {s.label}
            </Link>
          ))}

          <form method="get" className="ml-auto flex items-center gap-2">
            {/* Preserve current status when changing page size */}
            {filterStatus && <input type="hidden" name="status" value={filterStatus} />}
            <select name="per" defaultValue={String(perPage)} onChange={(e) => (e.currentTarget.form as HTMLFormElement)?.submit()} className={selectCls}>
              {PER_OPTIONS.map((n) => <option key={n} value={n}>{n} / page</option>)}
            </select>
          </form>
        </div>

        {/* Desktop table */}
        <Card padding="none" className="hidden md:block">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-slate-600 w-12">#</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">Agency</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">Package</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">Amount</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">Method</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">Status</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">Date</th>
                  <th className="text-right px-4 py-3 font-medium text-slate-600">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {payments.map((payment, i) => (
                  <tr key={payment.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 text-slate-400 text-xs">{(page - 1) * perPage + i + 1}</td>
                    <td className="px-4 py-3"><p className="font-medium text-slate-900">{payment.agency?.companyName}</p><p className="text-xs text-slate-500">{payment.agency?.email}</p></td>
                    <td className="px-4 py-3 text-slate-600">{payment.packageName}</td>
                    <td className="px-4 py-3 font-bold text-slate-900">${payment.amount}</td>
                    <td className="px-4 py-3 text-slate-600">
                      <Badge variant={payment.paymentType === "manual" ? "info" : "default"}>
                        {payment.paymentType === "manual" ? "Manual" : "QR"}
                      </Badge>
                      {payment.paymentType === "manual" && payment.paymentPhone && (
                        <a href={`tel:${payment.paymentPhone}`} className="block text-xs text-blue-500 hover:text-blue-600 mt-1">
                          {payment.paymentPhone}
                        </a>
                      )}
                    </td>
                    <td className="px-4 py-3"><Badge variant={statusVariant(payment.status)}>{payment.status}</Badge></td>
                    <td className="px-4 py-3 text-xs text-slate-500">{formatDate(payment.createdAt)}</td>
                    <td className="px-4 py-3 text-right"><RowActions payment={payment} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
            {payments.length === 0 && <div className="text-center py-12 text-slate-400 text-sm">No payments found</div>}
          </div>
        </Card>

        {/* Mobile card list */}
        <div className="md:hidden space-y-3">
          {payments.map((payment, i) => (
            <Card key={payment.id} padding="sm">
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="min-w-0 flex items-start gap-2">
                  <span className="text-xs text-slate-400 mt-0.5 shrink-0">#{(page - 1) * perPage + i + 1}</span>
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-900 truncate">{payment.agency?.companyName}</p>
                    <p className="text-xs text-slate-500 truncate">{payment.agency?.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <div className="text-right">
                    <p className="font-bold text-slate-900">${payment.amount}</p>
                    <Badge variant={statusVariant(payment.status)}>{payment.status}</Badge>
                  </div>
                  <RowActions payment={payment} />
                </div>
              </div>
              <dl className="text-xs space-y-1.5 text-slate-600">
                <div className="flex justify-between gap-2">
                  <dt className="text-slate-400">Package</dt>
                  <dd className="font-medium text-slate-700 truncate">{payment.packageName}</dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-slate-400">Type</dt>
                  <dd className="flex items-center gap-1.5">
                    <Badge variant={payment.paymentType === "manual" ? "info" : "default"}>
                      {payment.paymentType === "manual" ? "Manual" : "QR"}
                    </Badge>
                  </dd>
                </div>
                {payment.paymentType === "manual" && payment.paymentPhone && (
                  <div className="flex justify-between gap-2">
                    <dt className="text-slate-400">Phone</dt>
                    <dd><a href={`tel:${payment.paymentPhone}`} className="text-blue-500">{payment.paymentPhone}</a></dd>
                  </div>
                )}
                <div className="flex justify-between gap-2">
                  <dt className="text-slate-400">Date</dt>
                  <dd>{formatDate(payment.createdAt)}</dd>
                </div>
              </dl>
            </Card>
          ))}
          {payments.length === 0 && (
            <Card className="text-center py-10">
              <p className="text-sm text-slate-400">No payments found</p>
            </Card>
          )}
        </div>

        {/* Pagination */}
        {total > 0 && (
          <div className="flex items-center justify-between flex-wrap gap-3 mt-5">
            <p className="text-xs text-slate-500">
              Showing {(page - 1) * perPage + 1}–{Math.min(page * perPage, total)} of {total}
            </p>
            <div className="flex items-center gap-1">
              {page > 1 ? (
                <Link to={withParams(searchParams, { page: String(page - 1) })} className="px-3 py-1.5 text-sm rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50">← Prev</Link>
              ) : (
                <span className="px-3 py-1.5 text-sm rounded-lg border border-slate-200 bg-slate-50 text-slate-300 cursor-not-allowed">← Prev</span>
              )}
              <span className="px-3 py-1.5 text-sm text-slate-600">Page {page} of {totalPages}</span>
              {page < totalPages ? (
                <Link to={withParams(searchParams, { page: String(page + 1) })} className="px-3 py-1.5 text-sm rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50">Next →</Link>
              ) : (
                <span className="px-3 py-1.5 text-sm rounded-lg border border-slate-200 bg-slate-50 text-slate-300 cursor-not-allowed">Next →</span>
              )}
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
