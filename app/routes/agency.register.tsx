import { Form, Link, redirect, useNavigation } from "react-router";
import type { Route } from "./+types/agency.register";
import { hashPassword, createUserSession, getUserFromSession } from "~/lib/auth.server";
import { generateProfileId } from "~/lib/utils";
import { Input } from "~/components/ui/Input";
import { Button } from "~/components/ui/Button";
import { Card, CardHeader, CardTitle } from "~/components/ui/Card";
import { Navbar } from "~/components/layout/Navbar";
import { useT } from "~/lib/i18n";
import { getLocaleFromRequest } from "~/lib/locale.server";
import { getTranslations } from "~/locales";
import { prisma } from "~/lib/prisma.server";

export function meta(_: Route.MetaArgs) {
  return [{ title: "Agency Registration — HanMatching.com" }];
}

export async function loader({ request }: Route.LoaderArgs) {
  const session = await getUserFromSession(request);
  if (session?.role === "agency") return redirect("/agency/dashboard");
  return null;
}

async function uniqueAgencyId(companyName: string): Promise<string> {
  const base = companyName.replace(/[^a-zA-Z]/g, "").slice(0, 10) || "Agency";
  let id = generateProfileId(base, String(Math.floor(1000 + Math.random() * 9000)));
  while (await prisma.agency.findUnique({ where: { agencyId: id } })) {
    id = generateProfileId(base, String(Math.floor(1000 + Math.random() * 9000)));
  }
  return id;
}

export async function action({ request }: Route.ActionArgs) {
  const formData = await request.formData();
  const companyName = formData.get("companyName") as string;
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const confirmPassword = formData.get("confirmPassword") as string;

  const tr = getTranslations(getLocaleFromRequest(request)).agencyRegister;
  const errors: Record<string, string> = {};
  if (!companyName?.trim()) errors.companyName = tr.errCompanyName;
  if (!email?.trim() || !/\S+@\S+\.\S+/.test(email)) errors.email = tr.errEmail;
  if (!password || password.length < 8) errors.password = tr.errPassword;
  if (password !== confirmPassword) errors.confirmPassword = tr.errPasswordMatch;
  if (Object.keys(errors).length > 0) return { errors, values: Object.fromEntries(formData) };

  const emailExists = await prisma.agency.findUnique({ where: { email: email.toLowerCase().trim() } });
  if (emailExists) return { errors: { email: tr.errEmailExists }, values: Object.fromEntries(formData) };

  const agencyId = await uniqueAgencyId(companyName.trim());
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

  return createUserSession(agency.id, "agency", "/agency/dashboard?registered=1");
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
          <Form method="post" className="space-y-5">
            <Card className="space-y-4">
              <div className="text-center mb-8">
                <div className="inline-flex items-center justify-center w-12 h-12 bg-slate-800 rounded-xl mb-4"><span className="text-2xl">🏢</span></div>
                <h1 className="text-xl font-bold text-slate-900">{t.agencyRegister.title}</h1>
              </div>
              <CardHeader><CardTitle>{t.agencyRegister.accountDetails}</CardTitle></CardHeader>
              <div className="space-y-4">
                <Input label={t.agencyRegister.companyNameLabel} name="companyName" placeholder={t.agencyRegister.companyNamePh} required defaultValue={values.companyName as string} error={errors.companyName} />
                <Input label={t.agencyRegister.emailLabel} name="email" type="email" placeholder={t.agencyRegister.emailPh} required defaultValue={values.email as string} error={errors.email} />
                <Input label={t.agencyRegister.passwordLabel} name="password" type="password" placeholder={t.agencyRegister.passwordPh} required error={errors.password} />
                <Input label={t.agencyRegister.confirmPasswordLabel} name="confirmPassword" type="password" placeholder={t.agencyRegister.confirmPasswordPh} required error={errors.confirmPassword} />
              </div>
              <Button type="submit" variant="secondary" size="lg" loading={isSubmitting} className="w-full">
                {isSubmitting ? t.agencyRegister.creatingAccount : t.agencyRegister.createAccount}
              </Button>
              <p className="text-center text-sm text-slate-500">
                {t.agencyRegister.alreadyHaveAccount}{" "}
                <Link to="/agency/login" className="text-rose-500 hover:text-rose-600 font-medium">{t.agencyRegister.loginLink}</Link>
              </p>
            </Card>
          </Form>
        </div>
      </main>
    </div>
  );
}
