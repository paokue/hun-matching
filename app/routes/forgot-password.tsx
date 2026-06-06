import { Form, Link, useActionData, useNavigation } from "react-router";
import type { Route } from "./+types/forgot-password";
import { hashPassword } from "~/lib/auth.server";
import { Input } from "~/components/ui/Input";
import { Button } from "~/components/ui/Button";
import { Card } from "~/components/ui/Card";
import { Navbar } from "~/components/layout/Navbar";
import { useT } from "~/lib/i18n";
import { prisma } from "~/lib/prisma.server";

export function meta(_: Route.MetaArgs) {
  return [{ title: "Reset Password — HanMatching.com" }];
}

export async function action({ request }: Route.ActionArgs) {
  const formData = await request.formData();
  const profileId = formData.get("profileId") as string;
  const phone = formData.get("phone") as string;
  const newPassword = formData.get("newPassword") as string;
  const confirmPassword = formData.get("confirmPassword") as string;

  if (!newPassword) return { error: "New password is required." };
  if (newPassword !== confirmPassword) return { error: "Passwords do not match." };

  const user = profileId?.trim() && phone?.trim()
    ? await prisma.user.findFirst({ where: { profileId: profileId.trim(), phone: phone.trim() } })
    : null;

  if (!user) return { error: "No account found with that Profile ID and phone combination." };

  await prisma.user.update({ where: { id: user.id }, data: { password: await hashPassword(newPassword) } });
  return { success: true };
}

export default function ForgotPassword({ actionData }: Route.ComponentProps) {
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";
  const t = useT();

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <Navbar />
      <main className="flex-1 flex items-center justify-center py-12 px-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-slate-900">{t.forgotPassword.title}</h1>
            <p className="text-slate-500 text-sm mt-1">{t.forgotPassword.subtitle}</p>
          </div>

          {actionData?.success ? (
            <Card>
              <div className="text-center py-6">
                <div className="text-4xl mb-3">✅</div>
                <h2 className="text-lg font-semibold text-slate-900 mb-2">{t.forgotPassword.successTitle}</h2>
                <p className="text-slate-500 text-sm mb-4">{t.forgotPassword.successDesc}</p>
                <Link to="/login" className="inline-block bg-rose-500 text-white font-medium px-6 py-2.5 rounded-lg text-sm hover:bg-rose-600">{t.forgotPassword.loginNow}</Link>
              </div>
            </Card>
          ) : (
            <Card>
              <Form method="post" className="space-y-4">
                {actionData?.error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">{actionData.error}</div>}
                <Input label={t.forgotPassword.profileIdLabel} name="profileId" placeholder={t.forgotPassword.profileIdPh} required />
                <Input label={t.forgotPassword.phoneLabel} name="phone" type="tel" placeholder={t.forgotPassword.phonePh} required />
                <Input label={t.forgotPassword.newPasswordLabel} name="newPassword" type="password" placeholder={t.forgotPassword.newPasswordPh} required />
                <Input label={t.forgotPassword.confirmPasswordLabel} name="confirmPassword" type="password" placeholder={t.forgotPassword.confirmPasswordPh} required />
                <Button type="submit" loading={isSubmitting} className="w-full" size="lg">{t.forgotPassword.resetBtn}</Button>
                <p className="text-center text-sm"><Link to="/login" className="text-rose-500 hover:text-rose-600">{t.forgotPassword.backToLogin}</Link></p>
              </Form>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
}
