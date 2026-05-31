import { useState, useEffect } from "react";
import { Form, Link, useSearchParams } from "react-router";
import { toast } from "sonner";
import type { Route } from "./+types/admin.applicants";
import { requireAdmin } from "~/lib/auth.server";
import { AdminLayout } from "~/components/layout/AdminLayout";
import { Card } from "~/components/ui/Card";
import { Badge, statusBadge } from "~/components/ui/Badge";
import { Button } from "~/components/ui/Button";
import { ConfirmModal } from "~/components/ui/ConfirmModal";
import { DropdownMenu } from "~/components/ui/DropdownMenu";
import { formatDate, ETHNICITIES } from "~/lib/utils";
import { prisma } from "~/lib/prisma.server";
import { notifyApplicantStatus } from "~/lib/pusher.server";

const PER_OPTIONS = [20, 30, 50, 100, 500];
const DEFAULT_PER = 20;

export function meta(_: Route.MetaArgs) {
  return [{ title: "Manage Applicants — Admin" }];
}

export async function loader({ request }: Route.LoaderArgs) {
  await requireAdmin(request);

  const url = new URL(request.url);
  const status = url.searchParams.get("status") || "";
  const ethnicity = url.searchParams.get("ethnicity") || "";
  const search = url.searchParams.get("search") || "";
  const perRaw = parseInt(url.searchParams.get("per") || String(DEFAULT_PER));
  const perPage = PER_OPTIONS.includes(perRaw) ? perRaw : DEFAULT_PER;
  const page = Math.max(1, parseInt(url.searchParams.get("page") || "1"));

  const where = {
    ...(status ? { status } : {}),
    ...(ethnicity ? { ethnicity } : {}),
    ...(search ? {
      OR: [
        { profileId: { contains: search, mode: "insensitive" as const } },
        { fullName: { contains: search, mode: "insensitive" as const } },
        { phone: { contains: search, mode: "insensitive" as const } },
      ],
    } : {}),
  };

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      select: { id: true, profileId: true, fullName: true, phone: true, status: true, profileImage: true, photos: true, ethnicity: true, createdAt: true, isProfileComplete: true },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * perPage,
      take: perPage,
    }),
    prisma.user.count({ where }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / perPage));
  return { users, total, totalPages, page, perPage };
}

export async function action({ request }: Route.ActionArgs) {
  await requireAdmin(request);
  const formData = await request.formData();
  const intent = formData.get("intent") as string;
  const userId = formData.get("userId") as string;

  if (intent === "approve") {
    const u = await prisma.user.update({ where: { id: userId }, data: { status: "active", isProfileComplete: true }, select: { id: true, fullName: true, status: true } });
    await notifyApplicantStatus({ userId: u.id, status: u.status, fullName: u.fullName });
    return { success: "Profile approved." };
  }
  if (intent === "reject") {
    const u = await prisma.user.update({ where: { id: userId }, data: { status: "rejected" }, select: { id: true, fullName: true, status: true } });
    await notifyApplicantStatus({ userId: u.id, status: u.status, fullName: u.fullName });
    return { success: "Profile rejected." };
  }
  if (intent === "suspend") {
    const u = await prisma.user.update({ where: { id: userId }, data: { status: "suspended" }, select: { id: true, fullName: true, status: true } });
    await notifyApplicantStatus({ userId: u.id, status: u.status, fullName: u.fullName });
    return { success: "User suspended." };
  }
  if (intent === "delete") { await prisma.user.delete({ where: { id: userId } }); return { success: "User deleted." }; }

  return { error: "Unknown action." };
}

type Row = Awaited<ReturnType<typeof loader>>["users"][number];

// ── Avatar (profile image → gallery photo → user icon) ──────────────────────
function Avatar({ user, size }: { user: Row; size: number }) {
  const src = user.profileImage || user.photos?.[0];
  const cls = `rounded-full object-cover flex-shrink-0`;
  if (src) return <img src={src} alt="" className={cls} style={{ width: size, height: size }} />;
  return (
    <div className={`rounded-full bg-slate-100 flex items-center justify-center text-slate-400 flex-shrink-0`} style={{ width: size, height: size }}>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} style={{ width: size * 0.55, height: size * 0.55 }}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M16 14a4 4 0 10-8 0M20 21a8 8 0 10-16 0M12 11a3 3 0 100-6 3 3 0 000 6z" />
      </svg>
    </div>
  );
}

// ── Icons ────────────────────────────────────────────────────────────────────
const Ico = {
  dots: <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M10 6a1.5 1.5 0 110-3 1.5 1.5 0 010 3zm0 5.5a1.5 1.5 0 110-3 1.5 1.5 0 010 3zm0 5.5a1.5 1.5 0 110-3 1.5 1.5 0 010 3z" /></svg>,
  view: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>,
  phone: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h2.28a1 1 0 01.95.68l1.5 4.5a1 1 0 01-.51 1.21l-1.93.97a11 11 0 005.52 5.52l.97-1.93a1 1 0 011.21-.51l4.5 1.5a1 1 0 01.68.95V19a2 2 0 01-2 2h-1C9.72 21 3 14.28 3 6V5z" /></svg>,
  check: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
  pause: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
  trash: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M1 7h22M9 7V4a1 1 0 011-1h4a1 1 0 011 1v3" /></svg>,
};

// ── Per-row 3-dots dropdown ─────────────────────────────────────────────────
function RowActions({ user }: { user: Row }) {
  const [confirm, setConfirm] = useState<null | "approve" | "suspend" | "delete">(null);
  const showApprove = user.status === "pending";
  const showSuspend = user.status !== "suspended" && user.status !== "rejected";

  const itemCls = "w-full flex items-center gap-2.5 px-3.5 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors text-left";

  return (
    <>
      <DropdownMenu trigger={Ico.dots}>
        {(close) => (
          <>
            <Link to={`/admin/applicants/${user.id}`} className={itemCls} onClick={close}>
              <span className="text-slate-400">{Ico.view}</span> View
            </Link>
            {user.phone && (
              <a href={`tel:${user.phone}`} className={itemCls} onClick={close}>
                <span className="text-slate-400">{Ico.phone}</span> Call
              </a>
            )}
            {showApprove && (
              <button type="button" className={itemCls} onClick={() => { close(); setConfirm("approve"); }}>
                <span className="text-emerald-500">{Ico.check}</span> Approve
              </button>
            )}
            {showSuspend && (
              <button type="button" className={itemCls} onClick={() => { close(); setConfirm("suspend"); }}>
                <span className="text-amber-500">{Ico.pause}</span> Suspend
              </button>
            )}
            <button type="button" className={`${itemCls} text-red-500`} onClick={() => { close(); setConfirm("delete"); }}>
              <span>{Ico.trash}</span> Delete
            </button>
          </>
        )}
      </DropdownMenu>

      {confirm === "approve" && (
        <ConfirmModal title="Approve profile?" description={`Approve ${user.fullName}? Their profile will become active and visible to agencies.`} confirmLabel="Approve" hiddenInputs={{ userId: user.id, intent: "approve" }} onCancel={() => setConfirm(null)} />
      )}
      {confirm === "suspend" && (
        <ConfirmModal title="Suspend user?" description={`${user.fullName}'s profile will be hidden until reactivated.`} confirmLabel="Suspend" hiddenInputs={{ userId: user.id, intent: "suspend" }} onCancel={() => setConfirm(null)} />
      )}
      {confirm === "delete" && (
        <ConfirmModal title="Delete user?" description={`This permanently deletes ${user.fullName}'s account, photos and documents. This cannot be undone.`} confirmLabel="Delete" danger hiddenInputs={{ userId: user.id, intent: "delete" }} onCancel={() => setConfirm(null)} />
      )}
    </>
  );
}

// ── Helper: build a query-string preserving other params ─────────────────────
function withParams(current: URLSearchParams, updates: Record<string, string | null>) {
  const next = new URLSearchParams(current);
  for (const [k, v] of Object.entries(updates)) {
    if (v == null || v === "") next.delete(k);
    else next.set(k, v);
  }
  const s = next.toString();
  return s ? `?${s}` : "";
}

export default function AdminApplicants({ loaderData, actionData }: Route.ComponentProps) {
  const { users, total, totalPages, page, perPage } = loaderData;
  const [searchParams] = useSearchParams();

  // Show success/error as toast (action runs via Form inside confirm modals)
  useEffect(() => {
    if (actionData?.success) toast.success(actionData.success);
    else if (actionData?.error) toast.error(actionData.error);
  }, [actionData]);

  const hasFilters = !!(searchParams.get("search") || searchParams.get("status") || searchParams.get("ethnicity"));

  const selectCls = "px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white text-slate-500";
  const inputCls = "px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white text-slate-700 placeholder:text-slate-400";

  return (
    <AdminLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-lg sm:text-xl font-bold text-slate-900">Manage Applicants</h1>
          <span className="text-sm text-slate-500">{total} total</span>
        </div>

        <Form method="get" className="flex gap-2 sm:gap-3 mb-4 flex-wrap">
          <input name="search" placeholder="Search by name, ID, phone..." defaultValue={searchParams.get("search") ?? ""} className={`flex-1 min-w-44 ${inputCls}`} />
          <select name="status" defaultValue={searchParams.get("status") ?? ""} className={selectCls}>
            <option value="">All Status</option>
            <option value="pending">Pending</option>
            <option value="active">Active</option>
            <option value="suspended">Suspended</option>
            <option value="rejected">Rejected</option>
          </select>
          <select name="ethnicity" defaultValue={searchParams.get("ethnicity") ?? ""} className={selectCls}>
            <option value="">All Ethnicities</option>
            {ETHNICITIES.map((e) => <option key={e} value={e}>{e}</option>)}
          </select>
          <select name="per" defaultValue={String(perPage)} className={selectCls}>
            {PER_OPTIONS.map((n) => <option key={n} value={n}>{n} / page</option>)}
          </select>
          <Button type="submit" size="sm" variant="outline">Filter</Button>
          {hasFilters && (
            <Link to="/admin/applicants"><Button variant="ghost" size="sm">Clear</Button></Link>
          )}
        </Form>

        {/* Desktop table */}
        <Card padding="none" className="hidden md:block">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-slate-600 w-12">#</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">Profile</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">Phone</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">Ethnicity</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">Status</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">Registered</th>
                  <th className="text-right px-4 py-3 font-medium text-slate-600">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users.map((user, i) => (
                  <tr key={user.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 text-slate-400 text-xs">{(page - 1) * perPage + i + 1}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <Avatar user={user} size={36} />
                        <div><p className="font-medium text-slate-900">{user.profileId}</p><p className="text-xs text-slate-500">{user.fullName}</p></div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{user.phone}</td>
                    <td className="px-4 py-3 text-slate-600">{user.ethnicity || "—"}</td>
                    <td className="px-4 py-3"><Badge variant={statusBadge(user.status)}>{user.status}</Badge></td>
                    <td className="px-4 py-3 text-slate-500 text-xs">{formatDate(user.createdAt)}</td>
                    <td className="px-4 py-3 text-right"><RowActions user={user} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
            {users.length === 0 && <div className="text-center py-12 text-slate-400"><p className="text-3xl mb-2">👥</p><p className="text-sm">No applicants found</p></div>}
          </div>
        </Card>

        {/* Mobile card list */}
        <div className="md:hidden space-y-3">
          {users.map((user) => (
            <Card key={user.id} padding="sm">
              <div className="flex items-start gap-3">
                <Avatar user={user} size={48} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-semibold text-slate-900 truncate">{user.profileId}</p>
                    <RowActions user={user} />
                  </div>
                  <p className="text-sm text-slate-500 truncate">{user.fullName}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{user.phone}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <Badge variant={statusBadge(user.status)}>{user.status}</Badge>
                    {user.ethnicity && <span className="text-xs text-slate-500">{user.ethnicity}</span>}
                  </div>
                </div>
              </div>
            </Card>
          ))}
          {users.length === 0 && (
            <Card className="text-center py-10">
              <p className="text-3xl mb-2">👥</p>
              <p className="text-sm text-slate-400">No applicants found</p>
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
