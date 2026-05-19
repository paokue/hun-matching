import { Form, Link, redirect, useActionData, useNavigation } from "react-router";
import type { Route } from "./+types/register.3";
import { hashPassword, createUserSession } from "~/lib/auth.server";
import { Input } from "~/components/ui/Input";
import { Button } from "~/components/ui/Button";
import { Card, CardHeader, CardTitle } from "~/components/ui/Card";
import { StepIndicator } from "~/components/ui/StepIndicator";
import { Navbar } from "~/components/layout/Navbar";
import { getRegUserId, destroyRegCookie } from "~/lib/registration.server";
import { useT } from "~/lib/i18n";
import { prisma } from "~/lib/prisma.server";

export function meta(_: Route.MetaArgs) {
  return [{ title: "Register — Step 3 of 4" }];
}

export async function loader({ request }: Route.LoaderArgs) {
  const uid = await getRegUserId(request);
  if (!uid) return redirect("/register");
  const user = await prisma.user.findUnique({ where: { id: uid }, select: { id: true, fullName: true, phone: true, secondaryPhone: true, facebookUrl: true, tiktokUrl: true } });
  if (!user) return redirect("/register");
  const savedPhone = user.phone.startsWith("__pending__") ? "" : user.phone;
  return { user: { ...user, phone: savedPhone } };
}

export async function action({ request }: Route.ActionArgs) {
  const uid = await getRegUserId(request);
  if (!uid) return redirect("/register");

  const formData = await request.formData();
  const g = (k: string) => (formData.get(k) as string | null) ?? "";

  const phone         = g("phone").trim();
  const secondaryPhone = g("secondaryPhone").trim();
  const facebookUrl   = g("facebookUrl").trim();
  const tiktokUrl     = g("tiktokUrl").trim();
  const password      = g("password");
  const confirmPassword = g("confirmPassword");

  const errors: Record<string, string> = {};
  if (!phone)   errors.phone    = "Primary phone is required";
  if (!password || password.length < 8) errors.password = "Password must be at least 8 characters";
  if (password !== confirmPassword) errors.confirmPassword = "Passwords do not match";

  const phoneExists = await prisma.user.findFirst({ where: { phone, NOT: { id: uid } } });
  if (phoneExists) errors.phone = "This phone number is already registered.";

  if (Object.keys(errors).length > 0) return { errors };

  await prisma.user.update({
    where: { id: uid },
    data: {
      phone,
      secondaryPhone: secondaryPhone || undefined,
      facebookUrl:    facebookUrl    || undefined,
      tiktokUrl:      tiktokUrl      || undefined,
      password:       await hashPassword(password),
    },
  });

  // Account created — log them in and clear the registration cookie
  const destroyCookie = await destroyRegCookie(request);
  const authResponse = await createUserSession(uid, "applicant", "/register/4");

  // Merge both Set-Cookie headers
  const headers = new Headers(authResponse.headers);
  headers.append("Set-Cookie", destroyCookie);
  return new Response(null, { status: 302, headers });
}

export default function RegisterStep3({ loaderData, actionData }: Route.ComponentProps) {
  const { user } = loaderData;
  const errors = actionData?.errors ?? {};
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
            <h1 className="text-2xl font-bold text-slate-900">Contact & Account</h1>
            <p className="text-slate-500 mt-1 text-sm">Almost there, {user.fullName}!</p>
          </div>

          <StepIndicator current={3} />

          <Form method="post" className="space-y-5">
            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <span className="w-7 h-7 rounded-full bg-rose-500 text-white text-xs font-bold flex items-center justify-center shrink-0">5</span>
                  <CardTitle>Contact & Social</CardTitle>
                </div>
              </CardHeader>
              <div className="space-y-4 mt-2">
                <div className="grid sm:grid-cols-2 gap-4">
                  <Input label={r.primaryPhoneLabel} name="phone" type="tel" placeholder="+856 20..." required defaultValue={user.phone} error={errors.phone} />
                  <Input label={r.secondaryPhoneLabel} name="secondaryPhone" type="tel" placeholder={r.secondaryPhonePh} defaultValue={user.secondaryPhone ?? ""} />
                </div>
                <div className="grid sm:grid-cols-2 gap-4">
                  <Input label={r.facebookUrlLabel} name="facebookUrl" type="url" placeholder={r.facebookUrlPh} defaultValue={user.facebookUrl ?? ""} />
                  <Input label={r.tiktokUrlLabel}   name="tiktokUrl"   type="url" placeholder={r.tiktokUrlPh}   defaultValue={user.tiktokUrl   ?? ""} />
                </div>

                {/* Sub-divider */}
                <div className="flex items-center gap-3 pt-2">
                  <span className="w-6 h-6 rounded-full bg-slate-200 text-slate-600 text-[10px] font-bold flex items-center justify-center shrink-0">6</span>
                  <span className="text-sm font-semibold text-slate-700">{r.securityCard}</span>
                  <div className="flex-1 h-px bg-slate-100" />
                </div>

                <Input label={r.passwordLabel} name="password" type="password" placeholder={r.passwordPh} required error={errors.password} hint={r.passwordHint} />
                <Input label={r.confirmPasswordLabel} name="confirmPassword" type="password" placeholder={r.confirmPasswordPh} required error={errors.confirmPassword} />
              </div>
            </Card>

            <div className="flex gap-3 pb-8">
              <Link to="/register/2" className="flex-1">
                <Button variant="outline" size="lg" className="w-full">← Back</Button>
              </Link>
              <Button type="submit" size="lg" loading={isSubmitting} className="flex-1">
                {isSubmitting ? "Creating account..." : "Next: Document →"}
              </Button>
            </div>
          </Form>
        </div>
      </main>
    </div>
  );
}
