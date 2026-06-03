import { data, Form, Link, redirect, useActionData, useNavigation } from "react-router";
import type { Route } from "./+types/register.2";
import { Input, Select } from "~/components/ui/Input";
import { Button } from "~/components/ui/Button";
import { Card, CardHeader, CardTitle } from "~/components/ui/Card";
import { StepIndicator } from "~/components/ui/StepIndicator";
import { Navbar } from "~/components/layout/Navbar";
import { getRegUserId, refreshRegCookie } from "~/lib/registration.server";
import { LAO_PROVINCES } from "~/lib/utils";
import { useT } from "~/lib/i18n";
import { prisma } from "~/lib/prisma.server";

export function meta(_: Route.MetaArgs) {
  return [{ title: "Register — Step 2 of 4" }];
}

export async function loader({ request }: Route.LoaderArgs) {
  const uid = await getRegUserId(request);
  if (!uid) return redirect("/register");
  const user = await prisma.user.findUnique({ where: { id: uid }, select: { id: true, fullName: true, birthProvince: true, birthDistrict: true, birthVillage: true, currentProvince: true, currentDistrict: true, currentVillage: true } });
  if (!user) return redirect("/register");
  const refresh = await refreshRegCookie(request);
  return data({ user }, refresh ? { headers: { "Set-Cookie": refresh } } : undefined);
}

export async function action({ request }: Route.ActionArgs) {
  const uid = await getRegUserId(request);
  if (!uid) return redirect("/register");

  const formData = await request.formData();
  const g = (k: string) => (formData.get(k) as string | null) ?? "";

  await prisma.user.update({
    where: { id: uid },
    data: {
      birthProvince: g("birthProvince") || undefined,
      birthDistrict: g("birthDistrict").trim() || undefined,
      birthVillage: g("birthVillage").trim() || undefined,
      currentProvince: g("currentProvince") || undefined,
      currentDistrict: g("currentDistrict").trim() || undefined,
      currentVillage: g("currentVillage").trim() || undefined,
    },
  });

  return redirect("/register/3");
}

export default function RegisterStep2({ loaderData, actionData }: Route.ComponentProps) {
  const { user } = loaderData;
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";
  const t = useT();
  const r = t.register;

  function AddressBlock({ prefix, saved }: { prefix: "birth" | "current"; saved: { province?: string | null; district?: string | null; village?: string | null } }) {
    return (
      <div className="grid sm:grid-cols-3 gap-4">
        <Select label={r.provinceLabel} required name={`${prefix}Province`} placeholder={r.provincePh} options={LAO_PROVINCES.map((p) => ({ value: p, label: t.enums.provinces[p] }))} defaultValue={saved.province ?? ""} />
        <Input label={r.districtLabel} required name={`${prefix}District`} placeholder={r.districtPh} defaultValue={saved.district ?? ""} />
        <Input label={r.villageLabel} required name={`${prefix}Village`} placeholder={r.villagePh} defaultValue={saved.village ?? ""} />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <Navbar />
      <main className="flex-1 py-10 px-4">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-2">
            <h1 className="text-2xl font-bold text-slate-900">{r.addressesTitle}</h1>
            <p className="text-slate-500 mt-1 text-sm">{r.addressesSubtitle.replace("{name}", user.fullName)}</p>
          </div>

          <StepIndicator current={2} />

          <Form method="post" className="space-y-5">
            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <span className="w-7 h-7 rounded-full bg-rose-500 text-white text-xs font-bold flex items-center justify-center shrink-0">3</span>
                  <CardTitle>{r.birthPlaceTitle}</CardTitle>
                </div>
              </CardHeader>
              <div className="mt-2">
                <AddressBlock prefix="birth" saved={{ province: user.birthProvince, district: user.birthDistrict, village: user.birthVillage }} />
              </div>

              {/* Sub-divider */}
              <div className="flex items-center gap-3 mt-5">
                <span className="w-6 h-6 rounded-full bg-slate-200 text-slate-600 text-[10px] font-bold flex items-center justify-center shrink-0">4</span>
                <span className="text-sm font-semibold text-slate-700">{r.currentAddressTitle}</span>
                <div className="flex-1 h-px bg-slate-100" />
              </div>
              <div className="mt-4">
                <AddressBlock prefix="current" saved={{ province: user.currentProvince, district: user.currentDistrict, village: user.currentVillage }} />
              </div>
            </Card>

            <div className="flex gap-3">
              <Link to="/register" className="flex-1">
                <Button variant="outline" size="lg" className="w-full">{r.backBtn}</Button>
              </Link>
              <Button type="submit" size="lg" loading={isSubmitting} className="flex-1">
                {isSubmitting ? r.savingBtn : r.nextPhotosBtn}
              </Button>
            </div>
          </Form>
        </div>
      </main>
    </div>
  );
}
