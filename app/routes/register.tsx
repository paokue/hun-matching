import { Form, Link, redirect, useActionData, useNavigation } from "react-router";
import type { Route } from "./+types/register";
import { hashPassword, getUserFromSession } from "~/lib/auth.server";
import { autoProfileId, calculateAge } from "~/lib/utils";
import { Input, Select } from "~/components/ui/Input";
import { Button } from "~/components/ui/Button";
import { Card, CardHeader, CardTitle } from "~/components/ui/Card";
import { StepIndicator } from "~/components/ui/StepIndicator";
import { Navbar } from "~/components/layout/Navbar";
import { buildRegCookie } from "~/lib/registration.server";
import { OCCUPATIONS, EDUCATION_LEVELS, MARITAL_STATUS, TATTOO_STATUS, ETHNICITIES, RELIGIONS } from "~/lib/utils";
import { useT } from "~/lib/i18n";
import { prisma } from "~/lib/prisma.server";

export function meta(_: Route.MetaArgs) {
  return [{ title: "Register — Step 1 of 4" }];
}

export async function loader({ request }: Route.LoaderArgs) {
  const session = await getUserFromSession(request);
  if (session?.role === "applicant") return redirect("/dashboard");
  return null;
}

export async function action({ request }: Route.ActionArgs) {
  const formData = await request.formData();
  const g = (k: string) => (formData.get(k) as string | null) ?? "";

  const firstName     = g("firstName").trim();
  const lastName      = g("lastName").trim();
  const dateOfBirth   = g("dateOfBirth");
  const height        = g("height");
  const weight        = g("weight");
  const education     = g("education");
  const occupation    = g("occupation");
  const familyMembers = g("familyMembers");
  const maritalStatus = g("maritalStatus");
  const tattooStatus  = g("tattooStatus");
  const ethnicity     = g("ethnicity");
  const religion      = g("religion");

  const errors: Record<string, string> = {};
  if (!firstName)   errors.firstName   = "First name is required";
  if (!lastName)    errors.lastName    = "Last name is required";
  if (!dateOfBirth) errors.dateOfBirth = "Date of birth is required";
  if (Object.keys(errors).length > 0) return { errors, values: Object.fromEntries(formData) };

  let profileId = autoProfileId();
  while (await prisma.user.findUnique({ where: { profileId } })) profileId = autoProfileId();

  // Create partial user — phone/password finalized in later steps
  const tempPassword = await hashPassword(crypto.randomUUID());
  const user = await prisma.user.create({
    data: {
      profileId,
      firstName,
      lastName,
      fullName: `${firstName} ${lastName}`,
      password: tempPassword,
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

export default function RegisterStep1({ actionData }: Route.ComponentProps) {
  const errors = actionData?.errors ?? {};
  const values = actionData?.values ?? {};
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";
  const t = useT();
  const r = t.register;

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
                  <Input label="First Name" name="firstName" placeholder="e.g., Anna" required defaultValue={values.firstName as string} error={errors.firstName} />
                  <Input label="Last Name"  name="lastName"  placeholder="e.g., Phongsavanh" required defaultValue={values.lastName  as string} error={errors.lastName} />
                </div>
                <div className="grid sm:grid-cols-2 gap-4">
                  <Input label={r.dateOfBirthLabel} name="dateOfBirth" type="date" required defaultValue={values.dateOfBirth as string} error={errors.dateOfBirth} />
                  <div className="space-y-1">
                    <label className="block text-sm font-medium text-slate-700">{r.ageLabel}</label>
                    <div className="flex items-center h-10 px-3 border border-slate-200 rounded-lg bg-slate-50 text-sm text-slate-500">
                      {values.dateOfBirth ? `${calculateAge(values.dateOfBirth as string)} ${r.years}` : r.autoCalculated}
                    </div>
                  </div>
                </div>
                <div className="grid sm:grid-cols-2 gap-4">
                  <Input label={r.heightLabel} name="height" type="number" placeholder={r.heightPh} min="100" max="250" defaultValue={values.height as string} />
                  <Input label={r.weightLabel} name="weight" type="number" placeholder={r.weightPh} min="30"  max="200" defaultValue={values.weight as string} />
                </div>

                <SubDivider number={2} label="Background" />

                <Select label={r.educationLabel} name="education" placeholder={r.educationPh} options={EDUCATION_LEVELS.map((e) => ({ value: e, label: e }))} defaultValue={values.education as string} />
                <div className="grid sm:grid-cols-2 gap-4">
                  <Select label={r.occupationLabel} name="occupation" placeholder={r.occupationPh} options={OCCUPATIONS.map((o) => ({ value: o, label: o }))} defaultValue={values.occupation as string} />
                  <Input  label={r.familyMembersLabel} name="familyMembers" type="number" placeholder={r.familyMembersPh} min="1" max="20" defaultValue={values.familyMembers as string} />
                </div>
                <div className="grid sm:grid-cols-2 gap-4">
                  <Select label={r.maritalStatusLabel} name="maritalStatus" placeholder={r.maritalStatusPh} options={MARITAL_STATUS.map((s) => ({ value: s, label: s }))} defaultValue={values.maritalStatus as string} />
                  <Select label={r.tattooStatusLabel}  name="tattooStatus"  placeholder={r.tattooStatusPh}  options={TATTOO_STATUS.map((s) => ({ value: s, label: s }))} defaultValue={values.tattooStatus  as string} />
                </div>
                <div className="grid sm:grid-cols-2 gap-4">
                  <Select label={r.ethnicityLabel} name="ethnicity" placeholder={r.ethnicityPh} options={ETHNICITIES.map((e) => ({ value: e, label: e }))} defaultValue={values.ethnicity as string} />
                  <Select label={r.religionLabel}  name="religion"  placeholder={r.religionPh}  options={RELIGIONS.map((rl) => ({ value: rl, label: rl }))} defaultValue={values.religion as string} />
                </div>
              </div>
            </Card>

            <Button type="submit" size="lg" loading={isSubmitting} className="w-full">
              {isSubmitting ? "Saving..." : "Next: Addresses →"}
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
