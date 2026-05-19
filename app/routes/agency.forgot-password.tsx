import { Form, Link, useActionData, useNavigation } from "react-router";
import type { Route } from "./+types/agency.forgot-password";
import { hashPassword } from "~/lib/auth.server";
import { Input } from "~/components/ui/Input";
import { Button } from "~/components/ui/Button";
import { Card } from "~/components/ui/Card";
import { Navbar } from "~/components/layout/Navbar";
import { useT } from "~/lib/i18n";
import { prisma } from "~/lib/prisma.server";

export function meta(_: Route.MetaArgs) {
  return [{ title: "Reset Agency Password — HanMatching.com" }];
}

export async function action({ request }: Route.ActionArgs) {
  const formData = await request.formData();
  const agencyId = formData.get("agencyId") as string;
  const email = formData.get("email") as string;
  const newPassword = formData.get("newPassword") as string;
  const confirmPassword = formData.get("confirmPassword") as string;

  if (!newPassword || newPassword.length < 8) return { error: "New password must be at least 8 characters." };
  if (newPassword !== confirmPassword) return { error: "Passwords do not match." };

  const agency = await prisma.agency.findFirst({
    where: { agencyId: agencyId?.trim(), email: email?.toLowerCase().trim() },
  });
  if (!agency) return { error: "No agency found with that ID and email combination." };

  await prisma.agency.update({ where: { id: agency.id }, data: { password: await hashPassword(newPassword) } });
  return { success: true };
}

export default function AgencyForgotPassword({ actionData }: Route.ComponentProps) {
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";
  const t = useT();

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <Navbar />
      <main className="flex-1 flex items-center justify-center py-12 px-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-slate-900">{t.agencyForgotPassword.title}</h1>
            <p className="text-slate-500 text-sm mt-1">{t.agencyForgotPassword.subtitle}</p>
          </div>
          {actionData?.success ? (
            <Card>
              <div className="text-center py-6">
                <div className="text-4xl mb-3">✅</div>
                <h2 className="text-lg font-semibold text-slate-900 mb-2">{t.agencyForgotPassword.successTitle}</h2>
                <p className="text-slate-500 text-sm mb-4">{t.agencyForgotPassword.successDesc}</p>
                <Link to="/agency/login" className="inline-block bg-slate-800 text-white font-medium px-6 py-2.5 rounded-lg text-sm hover:bg-slate-900">{t.agencyForgotPassword.loginNow}</Link>
              </div>
            </Card>
          ) : (
            <Card>
              <Form method="post" className="space-y-4">
                {actionData?.error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">{actionData.error}</div>}
                <Input label={t.agencyForgotPassword.agencyIdLabel} name="agencyId" placeholder={t.agencyForgotPassword.agencyIdPh} required />
                <Input label={t.agencyForgotPassword.emailLabel} name="email" type="email" placeholder={t.agencyForgotPassword.emailPh} required />
                <Input label={t.agencyForgotPassword.newPasswordLabel} name="newPassword" type="password" placeholder={t.agencyForgotPassword.newPasswordPh} required />
                <Input label={t.agencyForgotPassword.confirmPasswordLabel} name="confirmPassword" type="password" placeholder={t.agencyForgotPassword.confirmPasswordPh} required />
                <Button type="submit" variant="secondary" loading={isSubmitting} size="lg" className="w-full">{t.agencyForgotPassword.resetBtn}</Button>
                <p className="text-center text-sm"><Link to="/agency/login" className="text-rose-500 hover:text-rose-600">{t.agencyForgotPassword.backToLogin}</Link></p>
              </Form>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
}
