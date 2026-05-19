import { Form } from "react-router";
import type { Route } from "./+types/admin.packages";
import { requireAdmin } from "~/lib/auth.server";
import { AdminLayout } from "~/components/layout/AdminLayout";
import { Card, CardHeader, CardTitle } from "~/components/ui/Card";
import { Button } from "~/components/ui/Button";
import { Badge } from "~/components/ui/Badge";
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

  if (intent === "create") {
    const name = formData.get("name") as string;
    const description = formData.get("description") as string;
    const price = Number(formData.get("price"));
    const durationDays = Number(formData.get("durationDays"));
    const featuresRaw = formData.get("features") as string;
    const features = featuresRaw.split("\n").map((f) => f.trim()).filter(Boolean);

    if (!name || !price || !durationDays) return { error: "Name, price, and duration are required." };

    await prisma.membershipPackage.create({ data: { name, description: description || undefined, price, durationDays, features, isActive: true } });
    return { success: "Package created." };
  }

  if (intent === "toggle") {
    const pkgId = formData.get("pkgId") as string;
    const pkg = await prisma.membershipPackage.findUnique({ where: { id: pkgId } });
    if (pkg) await prisma.membershipPackage.update({ where: { id: pkgId }, data: { isActive: !pkg.isActive } });
    return { success: "Package updated." };
  }

  if (intent === "delete") {
    const pkgId = formData.get("pkgId") as string;
    await prisma.membershipPackage.delete({ where: { id: pkgId } });
    return { success: "Package deleted." };
  }

  return { error: "Unknown action." };
}

export default function AdminPackages({ loaderData, actionData }: Route.ComponentProps) {
  const { packages } = loaderData;

  return (
    <AdminLayout>
      <div className="max-w-5xl mx-auto px-6 py-8">
        <h1 className="text-xl font-bold text-slate-900 mb-6">Membership Packages</h1>

        {(actionData?.success || actionData?.error) && (
          <div className={`mb-4 p-3 rounded-lg text-sm ${actionData?.success ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>{actionData?.success || actionData?.error}</div>
        )}

        <Card className="mb-8">
          <CardHeader><CardTitle>Create New Package</CardTitle></CardHeader>
          <Form method="post" className="grid sm:grid-cols-2 gap-4">
            <input type="hidden" name="intent" value="create" />
            <div className="space-y-1">
              <label className="block text-xs font-medium text-slate-600">Package Name *</label>
              <input name="name" required placeholder="e.g., Basic Plan" className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg" />
            </div>
            <div className="space-y-1">
              <label className="block text-xs font-medium text-slate-600">Price (USD) *</label>
              <input name="price" type="number" required min="1" placeholder="e.g., 99" className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg" />
            </div>
            <div className="space-y-1">
              <label className="block text-xs font-medium text-slate-600">Duration (days) *</label>
              <input name="durationDays" type="number" required min="1" placeholder="e.g., 30" className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg" />
            </div>
            <div className="space-y-1">
              <label className="block text-xs font-medium text-slate-600">Description</label>
              <input name="description" placeholder="Short description" className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg" />
            </div>
            <div className="sm:col-span-2 space-y-1">
              <label className="block text-xs font-medium text-slate-600">Features (one per line)</label>
              <textarea name="features" rows={3} placeholder="Full profile access&#10;Contact details&#10;Document downloads" className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg resize-none" />
            </div>
            <div className="sm:col-span-2"><Button type="submit" size="sm">Create Package</Button></div>
          </Form>
        </Card>

        <div className="space-y-4">
          {packages.map((pkg) => (
            <Card key={pkg.id}>
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-slate-900">{pkg.name}</h3>
                    <Badge variant={pkg.isActive ? "success" : "default"}>{pkg.isActive ? "Active" : "Inactive"}</Badge>
                  </div>
                  <p className="text-sm text-slate-600 mb-1">{pkg.description}</p>
                  <p className="text-2xl font-bold text-slate-900">${pkg.price} <span className="text-sm font-normal text-slate-500">/ {pkg.durationDays} days</span></p>
                  {pkg.features.length > 0 && (
                    <ul className="mt-2 space-y-0.5">
                      {pkg.features.map((f) => <li key={f} className="text-xs text-slate-500">✓ {f}</li>)}
                    </ul>
                  )}
                </div>
                <div className="flex gap-2">
                  <Form method="post">
                    <input type="hidden" name="intent" value="toggle" />
                    <input type="hidden" name="pkgId" value={pkg.id} />
                    <Button type="submit" size="sm" variant="outline">{pkg.isActive ? "Deactivate" : "Activate"}</Button>
                  </Form>
                  <Form method="post" onSubmit={(e) => { if (!confirm("Delete this package?")) e.preventDefault(); }}>
                    <input type="hidden" name="intent" value="delete" />
                    <input type="hidden" name="pkgId" value={pkg.id} />
                    <Button type="submit" size="sm" variant="danger">Delete</Button>
                  </Form>
                </div>
              </div>
            </Card>
          ))}
          {packages.length === 0 && <div className="text-center py-10 text-slate-400 text-sm">No packages yet. Create one above.</div>}
        </div>
      </div>
    </AdminLayout>
  );
}
