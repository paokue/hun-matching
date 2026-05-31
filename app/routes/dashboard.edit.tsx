import { useEffect } from "react";
import { Form, Link, redirect, useNavigation } from "react-router";
import { toast } from "sonner";
import type { Route } from "./+types/dashboard.edit";
import { requireUser } from "~/lib/auth.server";
import {
  calculateAge, EDUCATION_LEVELS, MARITAL_STATUS,
  TATTOO_STATUS, ETHNICITIES, RELIGIONS, LAO_PROVINCES,
} from "~/lib/utils";
import { Input, Select } from "~/components/ui/Input";
import { Button } from "~/components/ui/Button";
import { Card, CardHeader, CardTitle } from "~/components/ui/Card";
import { Navbar } from "~/components/layout/Navbar";
import { useT } from "~/lib/i18n";
import { useApplicantRealtime } from "~/lib/pusher.realtime";
import { getLocaleFromRequest } from "~/lib/locale.server";
import { getTranslations } from "~/locales";
import { prisma } from "~/lib/prisma.server";

export function meta(_: Route.MetaArgs) {
  return [{ title: "Edit Profile — HanMatching.com" }];
}

export async function loader({ request }: Route.LoaderArgs) {
  const session = await requireUser(request);
  const user = await prisma.user.findUnique({ where: { id: session.userId } });
  if (!user) throw redirect("/login");
  return { user };
}

export async function action({ request }: Route.ActionArgs) {
  const session = await requireUser(request);
  const formData = await request.formData();
  const g = (k: string) => (formData.get(k) as string | null) ?? "";

  const firstName      = g("firstName").trim();
  const lastName       = g("lastName").trim();
  const dateOfBirth    = g("dateOfBirth");
  const height         = g("height");
  const weight         = g("weight");
  const education      = g("education");
  const occupation     = g("occupation");
  const familyMembers  = g("familyMembers");
  const maritalStatus  = g("maritalStatus");
  const tattooStatus   = g("tattooStatus");
  const ethnicity      = g("ethnicity");
  const religion       = g("religion");
  const birthProvince  = g("birthProvince");
  const birthDistrict  = g("birthDistrict").trim();
  const birthVillage   = g("birthVillage").trim();
  const currentProvince = g("currentProvince");
  const currentDistrict = g("currentDistrict").trim();
  const currentVillage  = g("currentVillage").trim();
  const phone          = g("phone").trim();
  const secondaryPhone = g("secondaryPhone").trim();
  const facebookUrl    = g("facebookUrl").trim();
  const tiktokUrl      = g("tiktokUrl").trim();

  const tr = getTranslations(getLocaleFromRequest(request)).register;
  const errors: Record<string, string> = {};
  if (!firstName) errors.firstName = tr.errFirstName;
  if (!lastName)  errors.lastName  = tr.errLastName;
  if (!dateOfBirth) errors.dateOfBirth = tr.errDateOfBirth;
  if (!phone) errors.phone = tr.errPhoneRequired;
  if (Object.keys(errors).length > 0) return { errors };

  const phoneExists = await prisma.user.findFirst({ where: { phone, NOT: { id: session.userId } } });
  if (phoneExists) return { errors: { phone: tr.errPhoneExists } };

  await prisma.user.update({
    where: { id: session.userId },
    data: {
      firstName,
      lastName,
      fullName: `${firstName} ${lastName}`,
      dateOfBirth: new Date(dateOfBirth),
      age: calculateAge(dateOfBirth),
      height: height ? Number(height) : undefined,
      weight: weight ? Number(weight) : undefined,
      education: education || undefined,
      occupation: occupation || undefined,
      familyMembers: familyMembers ? Number(familyMembers) : undefined,
      maritalStatus: maritalStatus || undefined,
      tattooStatus: tattooStatus || undefined,
      ethnicity: ethnicity || undefined,
      religion: religion || undefined,
      birthProvince: birthProvince || undefined,
      birthDistrict: birthDistrict || undefined,
      birthVillage: birthVillage || undefined,
      currentProvince: currentProvince || undefined,
      currentDistrict: currentDistrict || undefined,
      currentVillage: currentVillage || undefined,
      phone,
      secondaryPhone: secondaryPhone || undefined,
      facebookUrl: facebookUrl || undefined,
      tiktokUrl: tiktokUrl || undefined,
    },
  });

  return { ok: true };
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card>
      <CardHeader><CardTitle>{title}</CardTitle></CardHeader>
      <div className="space-y-4 mt-2">{children}</div>
    </Card>
  );
}

export default function EditProfile({ loaderData, actionData }: Route.ComponentProps) {
  const { user } = loaderData;
  useApplicantRealtime(user.id);
  const errors: Record<string, string> = (actionData && "errors" in actionData ? actionData.errors : undefined) ?? {};
  const navigation = useNavigation();
  const saving = navigation.state === "submitting";
  const t = useT();
  const r = t.register;
  const dob = user.dateOfBirth ? new Date(user.dateOfBirth).toISOString().split("T")[0] : "";

  useEffect(() => {
    if (actionData && "ok" in actionData) toast.success(t.edit.savedMsg);
  }, [actionData]);

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <Navbar user={{ role: "applicant", profileId: user.profileId }} />
      <main className="flex-1 max-w-2xl mx-auto w-full px-4 py-8">
        <div className="flex items-center gap-3 mb-6">
          <Link to="/dashboard" className="text-slate-400 hover:text-slate-600 text-sm">{t.edit.backBtn}</Link>
          <span className="text-slate-300">/</span>
          <h1 className="text-xl font-bold text-slate-900">{t.edit.title}</h1>
        </div>

        <Form method="post" className="space-y-5">

          {/* Personal Information */}
          <Section title={r.personalInfo}>
            <div className="grid sm:grid-cols-2 gap-4">
              <Input label={r.firstNameLabel} name="firstName" defaultValue={user.firstName ?? ""} required error={errors.firstName} />
              <Input label={r.lastNameLabel}  name="lastName"  defaultValue={user.lastName  ?? ""} required error={errors.lastName} />
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <Input label={r.dateOfBirthLabel} name="dateOfBirth" type="date" defaultValue={dob} required error={errors.dateOfBirth} />
              <div className="space-y-1">
                <label className="block text-sm font-medium text-slate-700">{r.ageLabel}</label>
                <div className="flex items-center h-10 px-3 border border-slate-200 rounded-lg bg-slate-50 text-sm text-slate-500">{user.age} {r.years}</div>
              </div>
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <Input label={r.heightLabel} name="height" type="number" defaultValue={user.height?.toString() ?? ""} min="100" max="250" />
              <Input label={r.weightLabel} name="weight" type="number" defaultValue={user.weight?.toString() ?? ""} min="30"  max="200" />
            </div>
          </Section>

          {/* Background */}
          <Section title={r.backgroundTitle}>
            <Select label={r.educationLabel} name="education" placeholder={r.educationPh} options={EDUCATION_LEVELS.map((e) => ({ value: e, label: t.enums.education[e] }))} defaultValue={user.education ?? ""} />
            <div className="grid sm:grid-cols-2 gap-4">
              <Input label={r.occupationLabel} name="occupation" placeholder={r.occupationPh} defaultValue={user.occupation ?? ""} />
              <Input label={r.familyMembersLabel} name="familyMembers" type="number" placeholder={r.familyMembersPh} min="1" max="20" defaultValue={user.familyMembers?.toString() ?? ""} />
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <Select label={r.maritalStatusLabel} name="maritalStatus" placeholder={r.maritalStatusPh} options={MARITAL_STATUS.map((s) => ({ value: s, label: t.enums.maritalStatus[s] }))} defaultValue={user.maritalStatus ?? ""} />
              <Select label={r.tattooStatusLabel}  name="tattooStatus"  placeholder={r.tattooStatusPh}  options={TATTOO_STATUS.map((s) => ({ value: s, label: t.enums.tattooStatus[s] }))}  defaultValue={user.tattooStatus  ?? ""} />
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <Select label={r.ethnicityLabel} name="ethnicity" placeholder={r.ethnicityPh} options={ETHNICITIES.map((e) => ({ value: e, label: t.enums.ethnicity[e] }))} defaultValue={user.ethnicity ?? ""} />
              <Select label={r.religionLabel}  name="religion"  placeholder={r.religionPh}  options={RELIGIONS.map((rl) => ({ value: rl, label: t.enums.religion[rl] }))} defaultValue={user.religion  ?? ""} />
            </div>
          </Section>

          {/* Place of Birth */}
          <Section title={r.birthPlaceTitle}>
            <div className="grid sm:grid-cols-3 gap-4">
              <Select label={r.provinceLabel} name="birthProvince" placeholder={r.provincePh} options={LAO_PROVINCES.map((p) => ({ value: p, label: t.enums.provinces[p] }))} defaultValue={user.birthProvince ?? ""} />
              <Input label={r.districtLabel} name="birthDistrict" placeholder={r.districtPh} defaultValue={user.birthDistrict ?? ""} />
              <Input label={r.villageLabel}  name="birthVillage"  placeholder={r.villagePh}  defaultValue={user.birthVillage  ?? ""} />
            </div>
          </Section>

          {/* Current Address */}
          <Section title={r.currentAddressTitle}>
            <div className="grid sm:grid-cols-3 gap-4">
              <Select label={r.provinceLabel} name="currentProvince" placeholder={r.provincePh} options={LAO_PROVINCES.map((p) => ({ value: p, label: t.enums.provinces[p] }))} defaultValue={user.currentProvince ?? ""} />
              <Input label={r.districtLabel} name="currentDistrict" placeholder={r.districtPh} defaultValue={user.currentDistrict ?? ""} />
              <Input label={r.villageLabel}  name="currentVillage"  placeholder={r.villagePh}  defaultValue={user.currentVillage  ?? ""} />
            </div>
          </Section>

          {/* Contact & Social */}
          <Section title={r.contactSocialTitle}>
            <div className="grid sm:grid-cols-2 gap-4">
              <Input label={r.primaryPhoneLabel} name="phone" type="tel" defaultValue={user.phone} required error={errors.phone} />
              <Input label={r.secondaryPhoneLabel} name="secondaryPhone" type="tel" defaultValue={user.secondaryPhone ?? ""} />
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <Input label={r.facebookUrlLabel} name="facebookUrl" type="url" defaultValue={user.facebookUrl ?? ""} />
              <Input label={r.tiktokUrlLabel}   name="tiktokUrl"   type="url" defaultValue={user.tiktokUrl   ?? ""} />
            </div>
          </Section>

          <div className="flex gap-3 pb-8">
            <Button type="submit" size="lg" loading={saving} className="flex-1">{t.edit.saveBtn}</Button>
            <Link to="/dashboard"><Button variant="outline" size="lg">{t.edit.cancelBtn}</Button></Link>
          </div>
        </Form>
      </main>
    </div>
  );
}
