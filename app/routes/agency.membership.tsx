import { Form, Link, redirect } from "react-router";
import type { Route } from "./+types/agency.membership";
import { requireAgency } from "~/lib/auth.server";
import { Navbar } from "~/components/layout/Navbar";
import { Card, CardHeader, CardTitle, CardDescription } from "~/components/ui/Card";
import { Button } from "~/components/ui/Button";
import { Badge } from "~/components/ui/Badge";
import { parseMultipartForm, uploadToBunny, generateFilePath } from "~/lib/bunny.server";
import { formatDate } from "~/lib/utils";
import { useT } from "~/lib/i18n";
import { prisma } from "~/lib/prisma.server";

export function meta(_: Route.MetaArgs) {
  return [{ title: "Membership Packages — HanMatching.com" }];
}

export async function loader({ request }: Route.LoaderArgs) {
  const session = await requireAgency(request);

  const [agency, packages, pendingPayment] = await Promise.all([
    prisma.agency.findUnique({ where: { id: session.userId } }),
    prisma.membershipPackage.findMany({ where: { isActive: true }, orderBy: { price: "asc" } }),
    prisma.payment.findFirst({ where: { agencyId: session.userId, status: "pending" } }),
  ]);

  if (!agency) throw redirect("/agency/login");
  if (agency.status !== "active") throw redirect("/agency/dashboard");
  const hasMembership = agency.membershipExpiresAt && new Date(agency.membershipExpiresAt) > new Date();

  return { agency, packages, hasMembership, pendingPayment };
}

export async function action({ request }: Route.ActionArgs) {
  const session = await requireAgency(request);

  const { fields, files } = await parseMultipartForm(request);
  const packageId = fields.packageId;
  const paymentMethod = fields.paymentMethod;
  const notes = fields.notes;

  if (!packageId || !paymentMethod) return { error: "Package and payment method are required." };

  const pkg = await prisma.membershipPackage.findUnique({ where: { id: packageId } });
  if (!pkg) return { error: "Package not found." };

  let receiptUrl: string | undefined;
  const receiptFile = files.receipt?.[0];
  if (receiptFile) {
    const path = generateFilePath("receipts", session.userId, receiptFile.filename);
    receiptUrl = await uploadToBunny(receiptFile.buffer, path, receiptFile.contentType);
  }

  await prisma.payment.create({
    data: {
      agencyId: session.userId,
      packageId,
      packageName: pkg.name,
      amount: pkg.price,
      currency: "USD",
      paymentMethod,
      receiptUrl,
      notes: notes || undefined,
      status: "pending",
    },
  });

  return { success: "Payment submitted! Our team will verify and activate your membership shortly." };
}

export default function AgencyMembership({ loaderData, actionData }: Route.ComponentProps) {
  const { agency, packages, hasMembership, pendingPayment } = loaderData;
  const t = useT();

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <Navbar user={{ role: "agency", companyName: agency.companyName }} />
      <main className="flex-1 max-w-4xl mx-auto w-full px-4 py-8">
        <div className="flex items-center gap-3 mb-6">
          <Link to="/agency/dashboard" className="text-slate-400 hover:text-slate-600 text-sm">{t.agencyMembership.backBtn}</Link>
          <span className="text-slate-300">/</span>
          <h1 className="text-xl font-bold text-slate-900">{t.agencyMembership.title}</h1>
        </div>

        {hasMembership && (
          <div className="mb-6 p-5 bg-green-50 border border-green-200 rounded-2xl">
            <div className="flex items-center gap-3">
              <span className="text-2xl">✅</span>
              <div>
                <p className="font-semibold text-green-900">{t.agencyMembership.activeMembership}</p>
                <p className="text-sm text-green-700">{t.agencyMembership.membershipExpires} {formatDate(agency.membershipExpiresAt!)}</p>
              </div>
            </div>
          </div>
        )}

        {pendingPayment && !hasMembership && (
          <div className="mb-6 p-5 bg-amber-50 border border-amber-200 rounded-2xl">
            <div className="flex items-center gap-3">
              <span className="text-2xl">⏳</span>
              <div>
                <p className="font-semibold text-amber-900">{t.agencyMembership.paymentUnderReview}</p>
                <p className="text-sm text-amber-700">{t.agencyMembership.paymentOfAmount.replace("${amount}", String(pendingPayment.amount)).replace("{package}", pendingPayment.packageName ?? "")}</p>
              </div>
            </div>
          </div>
        )}

        {(actionData?.success || actionData?.error) && (
          <div className={`mb-4 p-4 rounded-xl text-sm ${actionData?.success ? "bg-green-50 border border-green-200 text-green-700" : "bg-red-50 border border-red-200 text-red-700"}`}>
            {actionData?.success || actionData?.error}
          </div>
        )}

        {packages.length === 0 ? (
          <Card className="text-center py-12"><p className="text-slate-400 text-4xl mb-3">📦</p><p className="text-slate-600">{t.agencyMembership.noPackages}</p></Card>
        ) : (
          <div className="grid md:grid-cols-3 gap-5 mb-8">
            {packages.map((pkg, i) => (
              <Card key={pkg.id} className={i === 1 ? "border-rose-200 ring-2 ring-rose-200 ring-offset-2" : ""}>
                {i === 1 && <div className="text-center mb-3"><Badge variant="danger">{t.agencyMembership.mostPopular}</Badge></div>}
                <CardHeader>
                  <CardTitle>{pkg.name}</CardTitle>
                  <CardDescription>{pkg.description}</CardDescription>
                </CardHeader>
                <div className="text-3xl font-extrabold text-slate-900 mb-1">${pkg.price}</div>
                <p className="text-sm text-slate-500 mb-4">{pkg.durationDays} {t.agencyMembership.daysAccess}</p>
                <ul className="space-y-2 mb-5">
                  {pkg.features.map((f) => <li key={f} className="text-sm text-slate-600 flex items-center gap-2"><span className="text-green-500">✓</span> {f}</li>)}
                </ul>
                {!pendingPayment && !hasMembership && (
                  <Form method="post" encType="multipart/form-data" className="space-y-3">
                    <input type="hidden" name="packageId" value={pkg.id} />
                    <select name="paymentMethod" required className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white">
                      <option value="">{t.agencyMembership.selectPaymentMethod}</option>
                      <option value="Bank Transfer">{t.agencyMembership.bankTransfer}</option>
                      <option value="Cash">{t.agencyMembership.cash}</option>
                      <option value="Mobile Payment">{t.agencyMembership.mobilePayment}</option>
                      <option value="Other">{t.agencyMembership.other}</option>
                    </select>
                    <div>
                      <label className="block text-xs text-slate-600 mb-1">{t.agencyMembership.uploadReceiptLabel}</label>
                      <input type="file" name="receipt" accept="image/*,.pdf" className="w-full text-xs text-slate-500 file:py-1.5 file:px-2 file:rounded file:border-0 file:bg-slate-100 file:text-slate-600" />
                    </div>
                    <textarea name="notes" placeholder={t.agencyMembership.paymentNotesPh} rows={2} className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg resize-none" />
                    <Button type="submit" size="sm" className="w-full" variant={i === 1 ? "primary" : "outline"}>{t.agencyMembership.submitPayment}</Button>
                  </Form>
                )}
                {(pendingPayment || hasMembership) && (
                  <p className="text-xs text-center text-slate-400 mt-2">{hasMembership ? t.agencyMembership.hasMembership : t.agencyMembership.pendingReview}</p>
                )}
              </Card>
            ))}
          </div>
        )}

        <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 text-sm text-slate-600">
          <h3 className="font-semibold text-slate-800 mb-2">{t.agencyMembership.instructionsTitle}</h3>
          <ol className="space-y-1.5 list-decimal list-inside">
            <li>{t.agencyMembership.step1}</li><li>{t.agencyMembership.step2}</li><li>{t.agencyMembership.step3}</li><li>{t.agencyMembership.step4}</li>
          </ol>
          <p className="mt-3 text-slate-500">{t.agencyMembership.contactSupport}</p>
        </div>
      </main>
    </div>
  );
}
