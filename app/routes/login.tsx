import { Form, Link, useActionData, useNavigation } from "react-router";
import type { Route } from "./+types/login";
import { verifyPassword, createUserSession, getUserFromSession } from "~/lib/auth.server";
import { redirect } from "react-router";
import { Input } from "~/components/ui/Input";
import { Button } from "~/components/ui/Button";
import { Card } from "~/components/ui/Card";
import { DevFill } from "~/components/ui/DevFill";
import { Navbar } from "~/components/layout/Navbar";
import { useT } from "~/lib/i18n";
import { prisma } from "~/lib/prisma.server";

export function meta(_: Route.MetaArgs) {
  return [{ title: "Login — HanMatching.com" }];
}

export async function loader({ request }: Route.LoaderArgs) {
  const session = await getUserFromSession(request);
  if (session?.role === "applicant") return redirect("/dashboard");
  return { isDev: process.env.NODE_ENV !== "production" };
}

export async function action({ request }: Route.ActionArgs) {
  const formData = await request.formData();
  const phone = (formData.get("phone") as string)?.trim();
  const password = formData.get("password") as string;

  if (!phone) return { error: "Phone number is required." };
  if (!password) return { error: "Password is required." };

  const user = await prisma.user.findFirst({ where: { phone } });

  if (!user || !(await verifyPassword(password, user.password))) {
    return { error: "Invalid phone number or password." };
  }

  if (user.status === "suspended") {
    return { error: "Your account has been suspended. Please contact support." };
  }

  return createUserSession(user.id, "applicant", "/dashboard");
}

export default function Login({ loaderData, actionData }: Route.ComponentProps) {
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";
  const t = useT();
  const isDev = loaderData?.isDev ?? false;

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <Navbar />
      <main className="flex-1 flex items-center justify-center py-12 px-4">
        <div className="w-full max-w-md">

          <Card className="py-8">
            <div className="text-center mb-8">
              <Link to="/" className="inline-flex items-center justify-center w-12 h-12 bg-rose-100 rounded-xl mb-4 hover:bg-rose-200 transition-colors">
                <svg className="w-8 h-8 text-rose-500" viewBox="0 0 24 24" fill="currentColor">
                  <circle cx="12" cy="5.5" r="3" />
                  <path d="M12 10c-2 0-3.5.8-4 2L6.5 21h11L16 12c-.5-1.2-2-2-4-2z" />
                  <path d="M9.5 14h5" stroke="white" strokeWidth="1.2" strokeLinecap="round" fill="none" />
                </svg>
              </Link>
              <h1 className="text-2xl font-bold text-slate-900">{t.login.title}</h1>
              <p className="text-slate-500 text-sm mt-1">{t.login.subtitle}</p>
            </div>

            <Form method="post" className="space-y-4">
              {actionData?.error && (
                <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
                  {actionData.error}
                </div>
              )}

              <Input
                label={t.login.phoneLabel}
                name="phone"
                type="tel"
                placeholder="+856 20..."
                required
              />

              <Input
                label={t.login.passwordLabel}
                name="password"
                type="password"
                showPasswordToggle
                placeholder={t.login.passwordPh}
                required
              />

              <Button type="submit" loading={isSubmitting} className="w-full" size="lg">
                {isSubmitting ? t.login.loggingIn : t.login.loginBtn}
              </Button>

              <div className="flex justify-end text-sm">
                <Link to="/register" className="font-bold text-rose-500 hover:text-rose-600 underline">
                  {t.login.createAccount}
                </Link>
              </div>

              <p className="text-center text-sm text-slate-500 mt-4">
                {t.login.isAgency}{" "}
                <Link to="/agency/login" className="text-rose-500 hover:text-rose-600 font-medium">
                  {t.login.agencyLoginLink}
                </Link>
              </p>
            </Form>

            {isDev && (
              <DevFill
                credentials={[
                  { label: "🙍 Applicant", values: { phone: "0201234567", password: "Test1234!" } },
                ]}
              />
            )}
          </Card>


        </div>
      </main>
    </div>
  );
}
