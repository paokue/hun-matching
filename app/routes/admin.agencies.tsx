import { useState, useEffect } from "react";
import { Form, Link, useSearchParams, useRevalidator } from "react-router";
import { toast } from "sonner";
import { usePusherChannel, playNotifySound, PUSHER_CHANNELS, PUSHER_EVENTS } from "~/lib/pusher.realtime";
import { useT } from "~/lib/i18n";
import type { Route } from "./+types/admin.agencies";
import { requireAdmin } from "~/lib/auth.server";
import { AdminLayout } from "~/components/layout/AdminLayout";
import { Card } from "~/components/ui/Card";
import { Badge, statusBadge } from "~/components/ui/Badge";
import { Button } from "~/components/ui/Button";
import { ConfirmModal } from "~/components/ui/ConfirmModal";
import { DropdownMenu } from "~/components/ui/DropdownMenu";
import { formatDate } from "~/lib/utils";
import { prisma } from "~/lib/prisma.server";
import { notifyAgencyStatus } from "~/lib/pusher.server";

const PER_OPTIONS = [20, 30, 50, 100, 500];
const DEFAULT_PER = 20;

export function meta(_: Route.MetaArgs) {
  return [{ title: "Manage Agencies — Admin" }];
}

export async function loader({ request }: Route.LoaderArgs) {
  await requireAdmin(request);
  const url = new URL(request.url);
  const search = url.searchParams.get("search") || "";
  const status = url.searchParams.get("status") || "";
  const perRaw = parseInt(url.searchParams.get("per") || String(DEFAULT_PER));
  const perPage = PER_OPTIONS.includes(perRaw) ? perRaw : DEFAULT_PER;
  const page = Math.max(1, parseInt(url.searchParams.get("page") || "1"));

  const where = {
    ...(status ? { status } : {}),
    ...(search ? {
      OR: [
        { agencyId: { contains: search, mode: "insensitive" as const } },
        { companyName: { contains: search, mode: "insensitive" as const } },
        { email: { contains: search, mode: "insensitive" as const } },
      ],
    } : {}),
  };

  const [agencies, total] = await Promise.all([
    prisma.agency.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * perPage,
      take: perPage,
      include: {
        payments: {
          where: { status: "verified" },
          orderBy: { membershipEndDate: "desc" },
          take: 1,
          select: { packageName: true, membershipEndDate: true },
        },
        _count: { select: { selections: { where: { isActive: true } } } },
      },
    }),
    prisma.agency.count({ where }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / perPage));
  return { agencies, total, totalPages, page, perPage };
}

export async function action({ request }: Route.ActionArgs) {
  await requireAdmin(request);
  const formData = await request.formData();
  const intent = formData.get("intent") as string;
  const agencyId = formData.get("agencyId") as string;

  if (intent === "verify") {
    const a = await prisma.agency.update({ where: { id: agencyId }, data: { isVerified: true, status: "active" }, select: { id: true, companyName: true, status: true, isVerified: true } });
    await notifyAgencyStatus({ agencyId: a.id, status: a.status, companyName: a.companyName, isVerified: a.isVerified });
    return { success: "Agency verified." };
  }
  if (intent === "suspend") {
    const a = await prisma.agency.update({ where: { id: agencyId }, data: { status: "suspended" }, select: { id: true, companyName: true, status: true, isVerified: true } });
    await notifyAgencyStatus({ agencyId: a.id, status: a.status, companyName: a.companyName, isVerified: a.isVerified });
    return { success: "Agency suspended." };
  }
  if (intent === "activate") {
    const a = await prisma.agency.update({ where: { id: agencyId }, data: { status: "active" }, select: { id: true, companyName: true, status: true, isVerified: true } });
    await notifyAgencyStatus({ agencyId: a.id, status: a.status, companyName: a.companyName, isVerified: a.isVerified });
    return { success: "Agency activated." };
  }
  if (intent === "delete") { await prisma.agency.delete({ where: { id: agencyId } }); return { success: "Agency deleted." }; }

  return { error: "Unknown action." };
}

type Row = Awaited<ReturnType<typeof loader>>["agencies"][number];

const Ico = {
  dots: <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M10 6a1.5 1.5 0 110-3 1.5 1.5 0 010 3zm0 5.5a1.5 1.5 0 110-3 1.5 1.5 0 010 3zm0 5.5a1.5 1.5 0 110-3 1.5 1.5 0 010 3z" /></svg>,
  mail: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 8l9 6 9-6M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>,
  check: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
  pause: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
  play: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" /><path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
  trash: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M1 7h22M9 7V4a1 1 0 011-1h4a1 1 0 011 1v3" /></svg>,
};

function RowActions({ agency }: { agency: Row }) {
  const [confirm, setConfirm] = useState<null | "verify" | "suspend" | "activate" | "delete">(null);
  const itemCls = "w-full flex items-center gap-2.5 px-3.5 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors text-left";

  return (
    <>
      <DropdownMenu trigger={Ico.dots}>
        {(close) => (
          <>
            {agency.email && (
              <a href={`mailto:${agency.email}`} className={itemCls} onClick={close}>
                <span className="text-slate-400">{Ico.mail}</span> Email
              </a>
            )}
            {!agency.isVerified && (
              <button type="button" className={itemCls} onClick={() => { close(); setConfirm("verify"); }}>
                <span className="text-emerald-500">{Ico.check}</span> Verify
              </button>
            )}
            {agency.status === "active" ? (
              <button type="button" className={itemCls} onClick={() => { close(); setConfirm("suspend"); }}>
                <span className="text-amber-500">{Ico.pause}</span> Suspend
              </button>
            ) : (
              <button type="button" className={itemCls} onClick={() => { close(); setConfirm("activate"); }}>
                <span className="text-blue-500">{Ico.play}</span> Activate
              </button>
            )}
            <button type="button" className={`${itemCls} text-red-500`} onClick={() => { close(); setConfirm("delete"); }}>
              <span>{Ico.trash}</span> Delete
            </button>
          </>
        )}
      </DropdownMenu>

      {confirm === "verify" && (
        <ConfirmModal title="Verify agency?" description={`Mark ${agency.companyName} as verified and set status to active.`} confirmLabel="Verify" hiddenInputs={{ agencyId: agency.id, intent: "verify" }} onCancel={() => setConfirm(null)} />
      )}
      {confirm === "suspend" && (
        <ConfirmModal title="Suspend agency?" description={`${agency.companyName} will lose access until reactivated.`} confirmLabel="Suspend" hiddenInputs={{ agencyId: agency.id, intent: "suspend" }} onCancel={() => setConfirm(null)} />
      )}
      {confirm === "activate" && (
        <ConfirmModal title="Activate agency?" description={`${agency.companyName} will regain access to the platform.`} confirmLabel="Activate" hiddenInputs={{ agencyId: agency.id, intent: "activate" }} onCancel={() => setConfirm(null)} />
      )}
      {confirm === "delete" && (
        <ConfirmModal title="Delete agency?" description={`This permanently deletes ${agency.companyName} and all associated data. This cannot be undone.`} confirmLabel="Delete" danger hiddenInputs={{ agencyId: agency.id, intent: "delete" }} onCancel={() => setConfirm(null)} />
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

function membershipText(a: Row) {
  return a.membershipExpiresAt && new Date(a.membershipExpiresAt) > new Date()
    ? `Active until ${formatDate(a.membershipExpiresAt)}`
    : "None";
}

function currentPackage(a: Row) {
  const isActive = a.membershipExpiresAt && new Date(a.membershipExpiresAt) > new Date();
  if (!isActive) return null;
  return a.payments?.[0]?.packageName ?? null;
}

export default function AdminAgencies({ loaderData, actionData }: Route.ComponentProps) {
  const { agencies, total, totalPages, page, perPage } = loaderData;
  const [searchParams] = useSearchParams();
  const revalidator = useRevalidator();
  const t = useT();

  useEffect(() => {
    if (actionData?.success) toast.success(actionData.success);
    else if (actionData?.error) toast.error(actionData.error);
  }, [actionData]);

  // Real-time updates from Pusher
  usePusherChannel(PUSHER_CHANNELS.admin, {
    [PUSHER_EVENTS.agencyCreated]: (data: unknown) => {
      const p = data as { companyName?: string | null };
      const msg = p.companyName
        ? t.realtime.newAgencyWithName.replace("{name}", p.companyName)
        : t.realtime.newAgency;
      toast.info(msg);
      playNotifySound();
      revalidator.revalidate();
    },
    [PUSHER_EVENTS.agencyStatus]: () => {
      revalidator.revalidate();
    },
  });

  const hasFilters = !!(searchParams.get("search") || searchParams.get("status"));
  const selectCls = "px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white text-slate-500";
  const inputCls = "px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white text-slate-700 placeholder:text-slate-400";

  return (
    <AdminLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-lg sm:text-xl font-bold text-slate-900">Manage Agencies</h1>
          <span className="text-sm text-slate-500">{total} total</span>
        </div>

        <Form method="get" className="flex gap-2 sm:gap-3 mb-4 flex-wrap">
          <input name="search" placeholder="Search agencies..." defaultValue={searchParams.get("search") ?? ""} className={`flex-1 min-w-44 ${inputCls}`} />
          <select name="status" defaultValue={searchParams.get("status") ?? ""} className={selectCls}>
            <option value="">All Status</option>
            <option value="pending">Pending</option>
            <option value="active">Active</option>
            <option value="suspended">Suspended</option>
          </select>
          <select name="per" defaultValue={String(perPage)} className={selectCls}>
            {PER_OPTIONS.map((n) => <option key={n} value={n}>{n} / page</option>)}
          </select>
          <Button type="submit" size="sm" variant="outline">Filter</Button>
          {hasFilters && (
            <Link to="/admin/agencies"><Button variant="ghost" size="sm">Clear</Button></Link>
          )}
        </Form>

        {/* Desktop table */}
        <Card padding="none" className="hidden md:block">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-slate-600 w-12">#</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">Agency</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">Email</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">Status</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">Plan</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">Selected</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">Membership</th>
                  <th className="text-right px-4 py-3 font-medium text-slate-600">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {agencies.map((agency, i) => {
                  const pkg = currentPackage(agency);
                  const selectedCount = agency._count?.selections ?? 0;
                  return (
                    <tr key={agency.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 text-slate-400 text-xs">{(page - 1) * perPage + i + 1}</td>
                      <td className="px-4 py-3"><p className="font-medium text-slate-900">{agency.companyName}</p><p className="text-xs text-slate-500">{agency.agencyId}</p></td>
                      <td className="px-4 py-3 text-slate-600">{agency.email}</td>
                      <td className="px-4 py-3"><Badge variant={statusBadge(agency.status)}>{agency.status}</Badge></td>
                      <td className="px-4 py-3">
                        {pkg ? <span className="text-xs font-medium text-slate-700 px-2 py-0.5 bg-rose-50 text-rose-600 rounded-full">{pkg}</span> : <span className="text-xs text-slate-400">—</span>}
                      </td>
                      <td className="px-4 py-3">
                        <Link to={`/admin/agencies/${agency.id}`} className="text-sm font-semibold text-rose-500 hover:text-rose-600 hover:underline">
                          {selectedCount}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-500">{membershipText(agency)}</td>
                      <td className="px-4 py-3 text-right"><RowActions agency={agency} /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {agencies.length === 0 && <div className="text-center py-12 text-slate-400 text-sm">No agencies found</div>}
          </div>
        </Card>

        {/* Mobile card list */}
        <div className="md:hidden space-y-3">
          {agencies.map((agency, i) => (
            <Card key={agency.id} padding="sm">
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="min-w-0 flex items-start gap-2">
                  <span className="text-xs text-slate-400 mt-0.5 shrink-0">#{(page - 1) * perPage + i + 1}</span>
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-900 truncate">{agency.companyName}</p>
                    <p className="text-xs text-slate-500 truncate">{agency.agencyId}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <Badge variant={statusBadge(agency.status)}>{agency.status}</Badge>
                  <RowActions agency={agency} />
                </div>
              </div>
              <dl className="text-xs space-y-1.5 text-slate-600">
                <div className="flex justify-between gap-2">
                  <dt className="text-slate-400 shrink-0">Email</dt>
                  <dd className="truncate text-right">{agency.email}</dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-slate-400 shrink-0">Plan</dt>
                  <dd className="text-right truncate">
                    {currentPackage(agency)
                      ? <span className="text-xs font-medium px-2 py-0.5 bg-rose-50 text-rose-600 rounded-full">{currentPackage(agency)}</span>
                      : <span className="text-slate-400">—</span>}
                  </dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-slate-400 shrink-0">Selected</dt>
                  <dd>
                    <Link to={`/admin/agencies/${agency.id}`} className="text-sm font-semibold text-rose-500 hover:text-rose-600 hover:underline">
                      {agency._count?.selections ?? 0}
                    </Link>
                  </dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-slate-400 shrink-0">Verified</dt>
                  <dd>{agency.isVerified ? <Badge variant="success">Yes</Badge> : <span className="text-slate-400">No</span>}</dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-slate-400 shrink-0">Membership</dt>
                  <dd className="text-right truncate">{membershipText(agency)}</dd>
                </div>
              </dl>
            </Card>
          ))}
          {agencies.length === 0 && (
            <Card className="text-center py-10">
              <p className="text-sm text-slate-400">No agencies found</p>
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
