import { useState, useEffect } from "react";
import { Form } from "react-router";
import { toast } from "sonner";
import type { Route } from "./+types/admin.packages";
import { requireAdmin } from "~/lib/auth.server";
import { AdminLayout } from "~/components/layout/AdminLayout";
import { Card } from "~/components/ui/Card";
import { Button } from "~/components/ui/Button";
import { Badge } from "~/components/ui/Badge";
import { ConfirmModal } from "~/components/ui/ConfirmModal";
import { prisma } from "~/lib/prisma.server";

export function meta(_: Route.MetaArgs) {
  return [{ title: "Membership Packages — Admin" }];
}

export async function loader({ request }: Route.LoaderArgs) {
  await requireAdmin(request);
  const packages = await prisma.membershipPackage.findMany({ orderBy: { price: "asc" } });
  return { packages };
}

export async function action({ request }: Route.ActionArgs) {
  await requireAdmin(request);
  const formData = await request.formData();
  const intent = formData.get("intent") as string;
  const featuresFromForm = () => ((formData.get("features") as string) || "").split("\n").map((f) => f.trim()).filter(Boolean);

  if (intent === "create") {
    const name = formData.get("name") as string;
    const description = formData.get("description") as string;
    const price = Number(formData.get("price"));
    const durationDays = Number(formData.get("durationDays"));
    if (!name || !price || !durationDays) return { error: "Name, price, and duration are required." };
    await prisma.membershipPackage.create({
      data: { name, description: description || undefined, price, durationDays, features: featuresFromForm(), isActive: true },
    });
    return { success: "Package created." };
  }

  if (intent === "update") {
    const pkgId = formData.get("pkgId") as string;
    const name = formData.get("name") as string;
    const description = formData.get("description") as string;
    const price = Number(formData.get("price"));
    const durationDays = Number(formData.get("durationDays"));
    const isActive = formData.get("isActive") === "on";
    if (!pkgId || !name || !price || !durationDays) return { error: "Name, price, and duration are required." };
    await prisma.membershipPackage.update({
      where: { id: pkgId },
      data: { name, description: description || undefined, price, durationDays, features: featuresFromForm(), isActive },
    });
    return { success: "Package updated." };
  }

  if (intent === "delete") {
    const pkgId = formData.get("pkgId") as string;
    await prisma.membershipPackage.delete({ where: { id: pkgId } });
    return { success: "Package deleted." };
  }

  return { error: "Unknown action." };
}

type Pkg = Awaited<ReturnType<typeof loader>>["packages"][number];

// ── Color palette cycled per card ────────────────────────────────────────────
const COLORS = [
  { ring: "border-rose-200 ring-1 ring-rose-100",      bar: "bg-rose-500",    price: "text-rose-500",    chip: "bg-rose-50 text-rose-600" },
  { ring: "border-blue-200 ring-1 ring-blue-100",      bar: "bg-blue-500",    price: "text-blue-500",    chip: "bg-blue-50 text-blue-600" },
  { ring: "border-emerald-200 ring-1 ring-emerald-100",bar: "bg-emerald-500", price: "text-emerald-500", chip: "bg-emerald-50 text-emerald-600" },
  { ring: "border-violet-200 ring-1 ring-violet-100",  bar: "bg-violet-500",  price: "text-violet-500",  chip: "bg-violet-50 text-violet-600" },
  { ring: "border-amber-200 ring-1 ring-amber-100",    bar: "bg-amber-500",   price: "text-amber-500",   chip: "bg-amber-50 text-amber-600" },
  { ring: "border-orange-200 ring-1 ring-orange-100",  bar: "bg-orange-500",  price: "text-orange-500",  chip: "bg-orange-50 text-orange-600" },
];

// ── Create / Update modal ────────────────────────────────────────────────────
function PackageFormModal({ mode, pkg, onClose }: { mode: "create" | "update"; pkg?: Pkg; onClose: () => void }) {
  const isUpdate = mode === "update";
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="relative bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h3 className="text-lg font-bold text-slate-900">{isUpdate ? "Update Package" : "Create New Package"}</h3>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-colors">
            <svg className="w-4 h-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <Form method="post" className="grid sm:grid-cols-2 gap-4 p-6" onSubmit={onClose}>
          <input type="hidden" name="intent" value={isUpdate ? "update" : "create"} />
          {isUpdate && pkg && <input type="hidden" name="pkgId" value={pkg.id} />}

          <div className="space-y-1">
            <label className="block text-xs font-medium text-slate-600">Package Name *</label>
            <input name="name" required defaultValue={pkg?.name ?? ""} placeholder="e.g., Basic Plan" className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg text-slate-700 placeholder:text-slate-400" />
          </div>
          <div className="space-y-1">
            <label className="block text-xs font-medium text-slate-600">Price (USD) *</label>
            <input name="price" type="number" required min="1" defaultValue={pkg?.price ?? ""} placeholder="e.g., 99" className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg text-slate-700 placeholder:text-slate-400" />
          </div>
          <div className="space-y-1">
            <label className="block text-xs font-medium text-slate-600">Duration (days) *</label>
            <input name="durationDays" type="number" required min="1" defaultValue={pkg?.durationDays ?? ""} placeholder="e.g., 30" className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg text-slate-700 placeholder:text-slate-400" />
          </div>
          <div className="space-y-1">
            <label className="block text-xs font-medium text-slate-600">Description</label>
            <input name="description" defaultValue={pkg?.description ?? ""} placeholder="Short description" className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg text-slate-700 placeholder:text-slate-400" />
          </div>
          <div className="sm:col-span-2 space-y-1">
            <label className="block text-xs font-medium text-slate-600">Features (one per line)</label>
            <textarea name="features" rows={4} defaultValue={(pkg?.features ?? []).join("\n")} placeholder="Full profile access&#10;Contact details&#10;Document downloads" className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg resize-none text-slate-700 placeholder:text-slate-400" />
          </div>
          {isUpdate && (
            <label className="sm:col-span-2 inline-flex items-center gap-2 text-sm text-slate-700">
              <input type="checkbox" name="isActive" defaultChecked={pkg?.isActive ?? true} className="rounded border-slate-300 text-rose-500 focus:ring-rose-400" />
              Active (visible to agencies)
            </label>
          )}

          <div className="sm:col-span-2 flex gap-3 pt-2">
            <Button type="button" variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
            <Button type="submit" className="flex-1">{isUpdate ? "Save Changes" : "Create Package"}</Button>
          </div>
        </Form>
      </div>
    </div>
  );
}

export default function AdminPackages({ loaderData, actionData }: Route.ComponentProps) {
  const { packages } = loaderData;
  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing] = useState<Pkg | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Pkg | null>(null);

  // Close modals + toast on action result
  useEffect(() => {
    if (actionData?.success) {
      toast.success(actionData.success);
      setShowCreate(false);
      setEditing(null);
      setConfirmDelete(null);
    } else if (actionData?.error) {
      toast.error(actionData.error);
    }
  }, [actionData]);

  return (
    <AdminLayout>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6 gap-3">
          <h1 className="text-lg sm:text-xl font-bold text-slate-900">Membership Packages</h1>
          <Button onClick={() => setShowCreate(true)} size="sm">
            <span className="inline-flex items-center gap-1.5">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              Create Package
            </span>
          </Button>
        </div>

        {/* Packages */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {packages.map((pkg, i) => {
            const c = COLORS[i % COLORS.length];
            return (
              <Card key={pkg.id} className={`relative overflow-hidden ${c.ring}`} padding="md">
                <div className={`absolute inset-x-0 top-0 h-1.5 ${c.bar}`} />
                <div className="pt-2">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <h3 className="font-semibold text-slate-900">{pkg.name}</h3>
                    <Badge variant={pkg.isActive ? "success" : "default"}>{pkg.isActive ? "Active" : "Inactive"}</Badge>
                  </div>
                  {pkg.description && <p className="text-sm text-slate-500 mb-2">{pkg.description}</p>}
                  <p className={`text-3xl font-extrabold ${c.price}`}>${pkg.price}</p>
                  <p className="text-xs text-slate-400 mb-3">for {pkg.durationDays} days</p>

                  {pkg.features.length > 0 && (
                    <ul className="space-y-1 mb-4">
                      {pkg.features.map((f) => (
                        <li key={f} className={`inline-flex items-start gap-1.5 text-xs ${c.chip} px-2 py-0.5 rounded-full mr-1 mb-1`}>
                          <svg className="w-3 h-3 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                          {f}
                        </li>
                      ))}
                    </ul>
                  )}

                  <div className="flex gap-2 mt-3 pt-3 border-t border-slate-100">
                    <Button size="sm" variant="outline" className="flex-1" onClick={() => setEditing(pkg)}>
                      Update
                    </Button>
                    <Button size="sm" variant="danger" onClick={() => setConfirmDelete(pkg)}>
                      Delete
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
        {packages.length === 0 && (
          <Card className="text-center py-12">
            <p className="text-3xl mb-2">📦</p>
            <p className="text-sm text-slate-400">No packages yet. Click "Create Package" to add your first one.</p>
          </Card>
        )}
      </div>

      {showCreate && <PackageFormModal mode="create" onClose={() => setShowCreate(false)} />}
      {editing && <PackageFormModal mode="update" pkg={editing} onClose={() => setEditing(null)} />}
      {confirmDelete && (
        <ConfirmModal
          title="Delete package?"
          description={`This permanently deletes "${confirmDelete.name}". Existing payments tied to it remain, but new agencies will no longer see it.`}
          confirmLabel="Delete"
          danger
          hiddenInputs={{ intent: "delete", pkgId: confirmDelete.id }}
          onCancel={() => setConfirmDelete(null)}
        />
      )}
    </AdminLayout>
  );
}
