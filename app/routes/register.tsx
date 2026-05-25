import { useState } from "react";
import { useT } from "~/lib/i18n";
import type { Route } from "./+types/register";
import { Form, Link, redirect, useNavigation } from "react-router";

import { prisma } from "~/lib/prisma.server";
import { Input, Select } from "~/components/ui/Input";
import { autoProfileId, calculateAge } from "~/lib/utils";
import { buildRegCookie, getRegUserId } from "~/lib/registration.server";
import { hashPassword, getUserFromSession } from "~/lib/auth.server";
import { getLocaleFromRequest } from "~/lib/locale.server";
import { getTranslations } from "~/locales";
import { EDUCATION_LEVELS, MARITAL_STATUS, TATTOO_STATUS, ETHNICITIES, RELIGIONS } from "~/lib/utils";

import { Button } from "~/components/ui/Button";
import { Navbar } from "~/components/layout/Navbar";
import { StepIndicator } from "~/components/ui/StepIndicator";
import { Card, CardHeader, CardTitle } from "~/components/ui/Card";

export function meta(_: Route.MetaArgs) {
  return [{ title: "Register — Step 1 of 4" }];
}

export async function loader({ request }: Route.LoaderArgs) {
  const session = await getUserFromSession(request);
  if (session?.role === "applicant") return redirect("/dashboard");

  // Prefill from an in-progress registration (e.g. user navigated back)
  const uid = await getRegUserId(request);
  const saved = uid
    ? await prisma.user.findUnique({
        where: { id: uid },
        select: {
          firstName: true, lastName: true, dateOfBirth: true, height: true, weight: true,
          education: true, occupation: true, familyMembers: true,
          maritalStatus: true, tattooStatus: true, ethnicity: true, religion: true,
        },
      })
    : null;

  return { saved };
}

export async function action({ request }: Route.ActionArgs) {
  const formData = await request.formData();
  const g = (k: string) => (formData.get(k) as string | null) ?? "";

  const firstName = g("firstName").trim();
  const lastName = g("lastName").trim();
  const dateOfBirth = g("dateOfBirth");
  const height = g("height");
  const weight = g("weight");
  const education = g("education");
  const occupation = g("occupation");
  const familyMembers = g("familyMembers");
  const maritalStatus = g("maritalStatus");
  const tattooStatus = g("tattooStatus");
  const ethnicity = g("ethnicity");
  const religion = g("religion");

  const tr = getTranslations(getLocaleFromRequest(request)).register;
  const errors: Record<string, string> = {};
  if (!firstName) errors.firstName = tr.errFirstName;
  if (!lastName) errors.lastName = tr.errLastName;
  if (!dateOfBirth) errors.dateOfBirth = tr.errDateOfBirth;
  if (Object.keys(errors).length > 0) return { errors, values: Object.fromEntries(formData) };

  const data = {
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
  };

  // If a registration is already in progress, update it instead of creating a duplicate
  const existingUid = await getRegUserId(request);
  if (existingUid) {
    await prisma.user.update({ where: { id: existingUid }, data });
    return redirect("/register/2");
  }

  let profileId = autoProfileId();
  while (await prisma.user.findUnique({ where: { profileId } })) profileId = autoProfileId();

  // Create partial user — phone/password finalized in later steps
  const tempPassword = await hashPassword(crypto.randomUUID());
  const user = await prisma.user.create({
    data: {
      ...data,
      profileId,
      password: tempPassword,
      phone: `__pending__${profileId}`, // replaced in Step 3
      status: "pending",
    },
  });

  return redirect("/register/2", {
    headers: { "Set-Cookie": await buildRegCookie(user.id) },
  });
}

function SubDivider({ number, label }: { number: number; label: string }) {
  return (
    <div className="flex items-center gap-3 pt-2">
      <span className="w-6 h-6 rounded-full bg-slate-200 text-slate-600 text-[10px] font-bold flex items-center justify-center shrink-0">{number}</span>
      <span className="text-sm font-semibold text-slate-700">{label}</span>
      <div className="flex-1 h-px bg-slate-100" />
    </div>
  );
}

export default function RegisterStep1({ loaderData, actionData }: Route.ComponentProps) {
  const errors = actionData?.errors ?? {};
  const values = actionData?.values ?? {};
  const saved = loaderData?.saved ?? null;
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";
  const t = useT();
  const r = t.register;

  // Prefill priority: just-failed submit values → saved registration → empty
  const def = (key: string) => {
    if (values[key] != null) return values[key] as string;
    const s = (saved as Record<string, unknown> | null)?.[key];
    return s != null ? String(s) : "";
  };
  const savedDob = saved?.dateOfBirth ? new Date(saved.dateOfBirth).toISOString().slice(0, 10) : "";

  const [dob, setDob] = useState<string>((values.dateOfBirth as string) ?? savedDob);
  const age = dob ? calculateAge(dob) : null;

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <Navbar />
      <main className="flex-1 py-10 px-4">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-2">
            <h1 className="text-2xl font-bold text-slate-900">{r.title}</h1>
            <p className="text-slate-500 mt-1 text-sm">{r.subtitle}</p>
          </div>

          <StepIndicator current={1} />

          <Form method="post" className="space-y-5">
            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <span className="w-7 h-7 rounded-full bg-rose-500 text-white text-xs font-bold flex items-center justify-center shrink-0">1</span>
                  <CardTitle>{r.personalInfo}</CardTitle>
                </div>
              </CardHeader>
              <div className="space-y-4 mt-2">
                <div className="grid sm:grid-cols-2 gap-4">
                  <Input label={r.firstNameLabel} name="firstName" placeholder={r.firstNamePh} required defaultValue={def("firstName")} error={errors.firstName} />
                  <Input label={r.lastNameLabel} name="lastName" placeholder={r.lastNamePh} required defaultValue={def("lastName")} error={errors.lastName} />
                </div>
                <div className="grid sm:grid-cols-2 gap-4">
                  <Input label={r.dateOfBirthLabel} name="dateOfBirth" type="date" required value={dob} onChange={(e) => setDob(e.target.value)} error={errors.dateOfBirth} />
                  <div className="space-y-1">
                    <label className="block text-sm font-medium text-slate-700">{r.ageLabel}</label>
                    <div className={`flex items-center h-10 px-3 border border-slate-200 rounded-lg bg-slate-50 text-sm ${age !== null ? "text-slate-800 font-medium" : "text-slate-400"}`}>
                      {age !== null ? `${age} ${r.years}` : r.autoCalculated}
                    </div>
                  </div>
                </div>
                <div className="grid sm:grid-cols-2 gap-4">
                  <Input label={r.heightLabel} name="height" type="number" required placeholder={r.heightPh} min="100" max="250" defaultValue={def("height")} />
                  <Input label={r.weightLabel} name="weight" type="number" required placeholder={r.weightPh} min="30" max="200" defaultValue={def("weight")} />
                </div>

                <SubDivider number={2} label={r.backgroundTitle} />

                <Select label={r.educationLabel} name="education" required placeholder={r.educationPh} options={EDUCATION_LEVELS.map((e) => ({ value: e, label: t.enums.education[e] }))} defaultValue={def("education")} />
                <div className="grid sm:grid-cols-2 gap-4">
                  <Input label={r.occupationLabel} name="occupation" required placeholder={r.occupationPh} defaultValue={def("occupation")} />
                  <Input label={r.familyMembersLabel} name="familyMembers" required type="number" placeholder={r.familyMembersPh} min="1" max="20" defaultValue={def("familyMembers")} />
                </div>
                <div className="grid sm:grid-cols-2 gap-4">
                  <Select label={r.maritalStatusLabel} name="maritalStatus" required placeholder={r.maritalStatusPh} options={MARITAL_STATUS.map((s) => ({ value: s, label: t.enums.maritalStatus[s] }))} defaultValue={def("maritalStatus")} />
                  <Select label={r.tattooStatusLabel} name="tattooStatus" required placeholder={r.tattooStatusPh} options={TATTOO_STATUS.map((s) => ({ value: s, label: t.enums.tattooStatus[s] }))} defaultValue={def("tattooStatus")} />
                </div>
                <div className="grid sm:grid-cols-2 gap-4">
                  <Select label={r.ethnicityLabel} name="ethnicity" required placeholder={r.ethnicityPh} options={ETHNICITIES.map((e) => ({ value: e, label: t.enums.ethnicity[e] }))} defaultValue={def("ethnicity")} />
                  <Select label={r.religionLabel} name="religion" required placeholder={r.religionPh} options={RELIGIONS.map((rl) => ({ value: rl, label: t.enums.religion[rl] }))} defaultValue={def("religion")} />
                </div>
              </div>
            </Card>

            <Button type="submit" size="lg" loading={isSubmitting} className="w-full">
              {isSubmitting ? r.savingBtn : r.nextAddressesBtn}
            </Button>

            <p className="text-center text-sm text-slate-500 pb-8">
              {r.alreadyHaveAccount}{" "}
              <Link to="/login" className="text-rose-500 hover:text-rose-600 font-medium">{r.loginHere}</Link>
            </p>
          </Form>
        </div>
      </main>
    </div>
  );
}
