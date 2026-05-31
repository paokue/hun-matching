import { useState, useRef, useEffect } from "react";
import { Form, Link, redirect, useNavigation } from "react-router";
import { toast } from "sonner";
import type { Route } from "./+types/agency.membership";
import { requireAgency } from "~/lib/auth.server";
import { Navbar } from "~/components/layout/Navbar";
import { Card, CardHeader, CardTitle, CardDescription } from "~/components/ui/Card";
import { Button } from "~/components/ui/Button";
import { Badge } from "~/components/ui/Badge";
import { parseMultipartForm, uploadToBunny, generateFilePath } from "~/lib/bunny.server";
import { formatDate } from "~/lib/utils";
import { useT } from "~/lib/i18n";
import { useAgencyRealtime } from "~/lib/pusher.realtime";
import { getLocaleFromRequest } from "~/lib/locale.server";
import { getTranslations } from "~/locales";
import { prisma } from "~/lib/prisma.server";
import { notifyPaymentCreated } from "~/lib/pusher.server";
import { sendAdminNewPaymentEmail } from "~/lib/mail.server";

type Pkg = { id: string; name: string; description: string | null; price: number; durationDays: number; features: string[] };

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
  const hasMembership = !!(agency.membershipExpiresAt && new Date(agency.membershipExpiresAt) > new Date());

  // Which package is currently active (from the latest verified payment)
  let currentPackageId: string | null = null;
  if (hasMembership) {
    const activePayment = await prisma.payment.findFirst({
      where: { agencyId: session.userId, status: "verified" },
      orderBy: { membershipEndDate: "desc" },
      select: { packageId: true },
    });
    currentPackageId = activePayment?.packageId ?? null;
  }

  return { agency, packages, hasMembership, pendingPayment, currentPackageId };
}

export async function action({ request }: Route.ActionArgs) {
  const session = await requireAgency(request);
  const tr = getTranslations(getLocaleFromRequest(request)).agencyMembership;

  const { fields, files } = await parseMultipartForm(request);
  const packageId = fields.packageId;
  if (!packageId) return { error: tr.errNoPackage };

  const pkg = await prisma.membershipPackage.findUnique({ where: { id: packageId } });
  if (!pkg) return { error: tr.errNoPackage };

  const receiptFile = files.receipt?.[0];
  if (!receiptFile) return { error: tr.errNoSlip };

  const agency = await prisma.agency.findUnique({ where: { id: session.userId }, select: { agencyId: true } });
  const path = generateFilePath("receipts", agency?.agencyId ?? session.userId, receiptFile.filename);
  const receiptUrl = await uploadToBunny(receiptFile.buffer, path, receiptFile.contentType);

  const payment = await prisma.payment.create({
    data: {
      agencyId: session.userId,
      packageId,
      packageName: pkg.name,
      amount: pkg.price,
      currency: "USD",
      paymentMethod: "QR / Bank Transfer",
      receiptUrl,
      status: "pending",
    },
  });

  const agencyInfo = await prisma.agency.findUnique({
    where: { id: session.userId },
    select: { companyName: true },
  });
  await Promise.all([
    notifyPaymentCreated({
      paymentId: payment.id,
      agencyId: session.userId,
      amount: pkg.price,
      packageName: pkg.name,
    }),
    sendAdminNewPaymentEmail({
      paymentId: payment.id,
      agencyId: session.userId,
      amount: pkg.price,
      packageName: pkg.name,
      companyName: agencyInfo?.companyName,
    }),
  ]);

  return { success: tr.submitSuccess };
}

// ── Two-step payment modal ─────────────────────────────────────────────────────
function PaymentModal({ pkg, onClose }: { pkg: Pkg; onClose: () => void }) {
  const t = useT().agencyMembership;
  const navigation = useNavigation();
  const submitting = navigation.state === "submitting";
  const [step, setStep] = useState<1 | 2>(1);
  const slipRef = useRef<HTMLInputElement>(null);
  const [slipPreview, setSlipPreview] = useState<string>("");
  const [showExample, setShowExample] = useState(false);

  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=260x260&data=${encodeURIComponent(`HanMatching Payment | ${pkg.name} | $${pkg.price}`)}`;

  async function downloadQr() {
    try {
      const res = await fetch(qrUrl);
      const blob = await res.blob();
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `hanmatching-qr-${pkg.name}.png`;
      a.click();
      URL.revokeObjectURL(a.href);
    } catch {
      window.open(qrUrl, "_blank");
    }
  }

  function onSlipChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    setSlipPreview(f && f.type.startsWith("image/") ? URL.createObjectURL(f) : "");
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div className="relative bg-white rounded-xl shadow-2xl max-w-md w-full overflow-hidden pt-6 pb-3" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div>
            <h2 className="font-bold text-slate-900">{t.payTitle}</h2>
            <p className="text-xs text-slate-400 mt-0.5">{pkg.name} · {t.amountLabel}: <span className="font-semibold text-rose-500">${pkg.price}</span></p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-colors">
            <svg className="w-4 h-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Step indicator */}
        <div className="flex items-center justify-center gap-2 py-4">
          {[1, 2].map((s) => (
            <div key={s} className="flex items-center gap-2">
              <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${step >= s ? "bg-rose-500 text-white" : "bg-slate-100 text-slate-400"}`}>{s}</span>
              {s === 1 && <span className={`w-10 h-0.5 ${step > 1 ? "bg-rose-400" : "bg-slate-200"}`} />}
            </div>
          ))}
        </div>

        {step === 1 ? (
          <div className="px-6 pb-6 text-center">
            <h3 className="font-semibold text-slate-800 mb-1">{t.payStep1Title}</h3>
            <p className="text-sm text-slate-500 mb-4 leading-relaxed">{t.payStep1Desc}</p>
            <div className="inline-block p-3 bg-white border border-slate-200 rounded-2xl shadow-sm mb-4">
              <img src={qrUrl} alt="Payment QR" className="w-52 h-52 object-contain" />
            </div>
            <div className="flex items-center justify-center gap-3">
              <Button type="button" variant="outline" className="w-auto" onClick={downloadQr}>
                <span className="inline-flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M7.5 10.5L12 15m0 0l4.5-4.5M12 15V3" />
                  </svg>
                  {t.downloadQrBtn}
                </span>
              </Button>
              <Button type="button" className="w-auto" onClick={() => setStep(2)}>{t.nextBtn}</Button>
            </div>
          </div>
        ) : (
          <Form method="post" encType="multipart/form-data" className="px-6 pb-6 text-center">
            <input type="hidden" name="packageId" value={pkg.id} />
            <h3 className="font-semibold text-slate-800 mb-1">{t.payStep2Title}</h3>
            <p className="text-sm text-slate-500 mb-4 leading-relaxed">{t.payStep2Desc}</p>

            <button
              type="button"
              onClick={() => slipRef.current?.click()}
              className="w-full border-2 border-dashed border-slate-300 rounded-xl p-5 text-center hover:border-rose-300 transition-colors flex flex-col items-center mb-3"
            >
              {slipPreview ? (
                <img src={slipPreview} alt="" className="max-h-44 w-auto rounded-lg object-contain" />
              ) : (
                <>
                  <svg className="w-4 h-4 text-slate-300 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 7.5L12 3m0 0L7.5 7.5M12 3v13.5" />
                  </svg>
                  <span className="text-sm text-slate-400">{t.uploadSlipHint}</span>
                </>
              )}
            </button>
            <input ref={slipRef} type="file" name="receipt" accept="image/*,.pdf" required className="hidden" onChange={onSlipChange} />

            {/* Example slip — below the upload area */}
            <div className="flex items-start gap-2 mb-4">
              <button type="button" onClick={() => setShowExample(true)} className="group inline-flex items-center gap-2">
                <img src="/images/payment-slip.jpg" alt="" className="w-10 h-10 rounded-lg object-cover border border-slate-200 group-hover:border-rose-300 transition-colors" />
                <span className="text-xs text-rose-500 font-medium underline">{t.slipExampleLabel}</span>
              </button>
            </div>

            <div className="flex gap-3">
              <Button type="button" variant="outline" className="flex-1" onClick={() => setStep(1)}>{t.backStepBtn}</Button>
              <Button type="submit" className="flex-1" loading={submitting}>{t.submitBtn}</Button>
            </div>
          </Form>
        )}
      </div>

      {/* Example slip full preview */}
      {showExample && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4" onClick={(e) => { e.stopPropagation(); setShowExample(false); }}>
          <div className="relative max-w-lg w-full" onClick={(e) => e.stopPropagation()}>
            <img src="/images/payment-slip.jpg" alt="" className="max-h-[88vh] w-auto mx-auto rounded-xl shadow-2xl" />
            <button
              onClick={() => setShowExample(false)}
              className="absolute -top-3 -right-3 w-9 h-9 rounded-full bg-white shadow-lg flex items-center justify-center text-slate-600 hover:text-slate-900"
              aria-label="Close"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AgencyMembership({ loaderData, actionData }: Route.ComponentProps) {
  const { agency, packages, hasMembership, pendingPayment, currentPackageId } = loaderData;
  const t = useT();
  const [chosen, setChosen] = useState<Pkg | null>(null);

  // Real-time updates from Pusher for this specific agency
  useAgencyRealtime(agency.id);

  // Close modal + toast after a successful submission
  useEffect(() => {
    if (actionData?.success) {
      setChosen(null);
      toast.success(actionData.success);
    } else if (actionData?.error) {
      toast.error(actionData.error);
    }
  }, [actionData]);

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

        {pendingPayment && (
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

        {packages.length === 0 ? (
          <Card className="text-center py-12"><p className="text-slate-400 text-4xl mb-3">📦</p><p className="text-slate-600">{t.agencyMembership.noPackages}</p></Card>
        ) : (
          <div className="grid md:grid-cols-3 gap-5 mb-8">
            {packages.map((pkg, i) => {
              const isCurrent = pkg.id === currentPackageId;
              const cardRing = isCurrent ? "border-rose-500 ring-2 ring-rose-500 ring-offset-2" : i === 1 ? "border-rose-200 ring-2 ring-rose-200 ring-offset-2" : "";
              return (
                <Card key={pkg.id} className={cardRing}>
                  {isCurrent ? (
                    <div className="text-center mb-3"><Badge variant="danger">{t.agencyMembership.currentPlan}</Badge></div>
                  ) : i === 1 ? (
                    <div className="text-center mb-3"><Badge variant="warning">{t.agencyMembership.mostPopular}</Badge></div>
                  ) : null}
                  <CardHeader>
                    <CardTitle>{pkg.name}</CardTitle>
                    <CardDescription>{pkg.description}</CardDescription>
                  </CardHeader>
                  <div className="text-3xl font-extrabold text-slate-900 mb-1">${pkg.price}</div>
                  <p className="text-sm text-slate-500 mb-4">{pkg.durationDays} {t.agencyMembership.daysAccess}</p>
                  <ul className="space-y-2 mb-5">
                    {pkg.features.map((f) => <li key={f} className="text-sm text-slate-600 flex items-center gap-2"><span className="text-green-500">✓</span> {f}</li>)}
                  </ul>
                  {pendingPayment ? (
                    <p className="text-xs text-center text-slate-400 mt-2">{t.agencyMembership.pendingReview}</p>
                  ) : isCurrent ? (
                    <p className="text-xs text-center text-rose-500 font-medium mt-2">{t.agencyMembership.currentPlan}</p>
                  ) : (
                    <Button size="sm" className="w-full" variant={i === 1 ? "primary" : "outline"} onClick={() => setChosen(pkg)}>
                      {t.agencyMembership.chooseBtn}
                    </Button>
                  )}
                </Card>
              );
            })}
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

      {chosen && <PaymentModal pkg={chosen} onClose={() => setChosen(null)} />}
    </div>
  );
}
