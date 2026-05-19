import { Form, Link, redirect, useActionData, useNavigation } from "react-router";
import type { Route } from "./+types/agency.register";
import { hashPassword, createUserSession, getUserFromSession } from "~/lib/auth.server";
import { generateProfileId } from "~/lib/utils";
import { Input } from "~/components/ui/Input";
import { Button } from "~/components/ui/Button";
import { Card, CardHeader, CardTitle, CardDescription } from "~/components/ui/Card";
import { Navbar } from "~/components/layout/Navbar";
import { useT } from "~/lib/i18n";
import { prisma } from "~/lib/prisma.server";

export function meta(_: Route.MetaArgs) {
  return [{ title: "Agency Registration — HanMatching.com" }];
}

export async function loader({ request }: Route.LoaderArgs) {
  const session = await getUserFromSession(request);
  if (session?.role === "agency") return redirect("/agency/dashboard");
  return null;
}

export async function action({ request }: Route.ActionArgs) {
  const formData = await request.formData();
  const agencyName = formData.get("agencyName") as string;
  const agencyNumbers = formData.get("agencyNumbers") as string;
  const companyName = formData.get("companyName") as string;
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const confirmPassword = formData.get("confirmPassword") as string;

  const errors: Record<string, string> = {};
  if (!agencyName?.trim()) errors.agencyName = "Agency name prefix is required";
  if (!agencyNumbers?.trim() || !/^\d+$/.test(agencyNumbers)) errors.agencyNumbers = "Numbers are required";
  if (!companyName?.trim()) errors.companyName = "Company name is required";
  if (!email?.trim() || !/\S+@\S+\.\S+/.test(email)) errors.email = "Valid email is required";
  if (!password || password.length < 8) errors.password = "Password must be at least 8 characters";
  if (password !== confirmPassword) errors.confirmPassword = "Passwords do not match";
  if (Object.keys(errors).length > 0) return { errors, values: Object.fromEntries(formData) };

  const agencyId = generateProfileId(agencyName.trim(), agencyNumbers.trim());
  const [idExists, emailExists] = await Promise.all([
    prisma.agency.findUnique({ where: { agencyId } }),
    prisma.agency.findUnique({ where: { email: email.toLowerCase() } }),
  ]);

  if (idExists) return { errors: { agencyNumbers: `Agency ID "${agencyId}" is taken. Try different numbers.` }, values: Object.fromEntries(formData) };
  if (emailExists) return { errors: { email: "This email is already registered." }, values: Object.fromEntries(formData) };

  const agency = await prisma.agency.create({
    data: {
      agencyId,
      companyName: companyName.trim(),
      email: email.toLowerCase().trim(),
      password: await hashPassword(password),
      role: "agency",
      status: "pending",
      isVerified: false,
    },
  });

  return createUserSession(agency.id, "agency", "/agency/dashboard");
}

export default function AgencyRegister({ actionData }: Route.ComponentProps) {
  const errors = actionData?.errors ?? {};
  const values = actionData?.values ?? {};
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";
  const t = useT();

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <Navbar />
      <main className="flex-1 py-10 px-4">
        <div className="max-w-xl mx-auto">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-14 h-14 bg-slate-800 rounded-2xl mb-4"><span className="text-2xl">🏢</span></div>
            <h1 className="text-2xl font-bold text-slate-900">{t.agencyRegister.title}</h1>
            <p className="text-slate-500 text-sm mt-1">{t.agencyRegister.subtitle}</p>
          </div>
          <Form method="post" className="space-y-5">
            <Card>
              <CardHeader>
                <CardTitle>{t.agencyRegister.agencyIdCard}</CardTitle>
                <CardDescription>{t.agencyRegister.agencyIdDesc}</CardDescription>
              </CardHeader>
              <div className="grid sm:grid-cols-2 gap-4">
                <Input label={t.agencyRegister.agencyNameLabel} name="agencyName" placeholder={t.agencyRegister.agencyNamePh} required defaultValue={values.agencyName as string} error={errors.agencyName} hint={t.agencyRegister.agencyNameHint} />
                <Input label={t.agencyRegister.numbersLabel} name="agencyNumbers" placeholder={t.agencyRegister.numbersPh} required defaultValue={values.agencyNumbers as string} error={errors.agencyNumbers} hint={t.agencyRegister.numbersHint} />
              </div>
              {values.agencyName && values.agencyNumbers && (
                <div className="mt-3 p-3 bg-slate-50 rounded-lg">
                  <p className="text-sm text-slate-700 font-medium">{t.agencyRegister.agencyIdPreview} <span className="font-bold">{generateProfileId(String(values.agencyName), String(values.agencyNumbers))}</span></p>
                </div>
              )}
            </Card>
            <Card>
              <CardHeader><CardTitle>{t.agencyRegister.accountDetails}</CardTitle></CardHeader>
              <div className="space-y-4">
                <Input label={t.agencyRegister.companyNameLabel} name="companyName" placeholder={t.agencyRegister.companyNamePh} required defaultValue={values.companyName as string} error={errors.companyName} />
                <Input label={t.agencyRegister.emailLabel} name="email" type="email" placeholder={t.agencyRegister.emailPh} required defaultValue={values.email as string} error={errors.email} />
                <Input label={t.agencyRegister.passwordLabel} name="password" type="password" placeholder={t.agencyRegister.passwordPh} required error={errors.password} />
                <Input label={t.agencyRegister.confirmPasswordLabel} name="confirmPassword" type="password" placeholder={t.agencyRegister.confirmPasswordPh} required error={errors.confirmPassword} />
              </div>
            </Card>
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-800">{t.agencyRegister.afterRegNotice}</div>
            <Button type="submit" variant="secondary" size="lg" loading={isSubmitting} className="w-full">
              {isSubmitting ? t.agencyRegister.creatingAccount : t.agencyRegister.createAccount}
            </Button>
            <p className="text-center text-sm text-slate-500">
              {t.agencyRegister.alreadyHaveAccount}{" "}
              <Link to="/agency/login" className="text-rose-500 hover:text-rose-600 font-medium">{t.agencyRegister.loginLink}</Link>
            </p>
          </Form>
        </div>
      </main>
    </div>
  );
}
