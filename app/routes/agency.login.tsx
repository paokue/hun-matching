import { Form, Link, redirect, useActionData, useNavigation } from "react-router";
import type { Route } from "./+types/agency.login";
import { verifyPassword, createUserSession, getUserFromSession } from "~/lib/auth.server";
import { Input } from "~/components/ui/Input";
import { Button } from "~/components/ui/Button";
import { Card } from "~/components/ui/Card";
import { DevFill } from "~/components/ui/DevFill";
import { Navbar } from "~/components/layout/Navbar";
import { useT } from "~/lib/i18n";
import { prisma } from "~/lib/prisma.server";

export function meta(_: Route.MetaArgs) {
  return [{ title: "Agency Login — HanMatching.com" }];
}

export async function loader({ request }: Route.LoaderArgs) {
  const session = await getUserFromSession(request);
  if (session?.role === "agency") return redirect("/agency/dashboard");
  return { isDev: process.env.NODE_ENV !== "production" };
}

export async function action({ request }: Route.ActionArgs) {
  const formData = await request.formData();
  const emailOrId = formData.get("emailOrId") as string;
  const password = formData.get("password") as string;

  if (!emailOrId?.trim() || !password) return { error: "All fields are required." };

  const agency = await prisma.agency.findFirst({
    where: { OR: [{ email: emailOrId.toLowerCase().trim() }, { agencyId: emailOrId.trim() }] },
  });

  if (!agency || !(await verifyPassword(password, agency.password))) return { error: "Invalid credentials." };
  if (agency.status === "suspended") return { error: "Your agency account has been suspended." };

  return createUserSession(agency.id, "agency", "/agency/dashboard");
}

export default function AgencyLogin({ loaderData, actionData }: Route.ComponentProps) {
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";
  const t = useT();
  const isDev = loaderData?.isDev ?? false;

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <Navbar />
      <main className="flex-1 flex items-center justify-center py-12 px-4">
        <div className="w-full max-w-md">
          <Card>
            <div className="text-center mb-8">
              <Link to="/" className="inline-flex items-center justify-center w-12 h-12 bg-slate-800 rounded-xl mb-4 hover:bg-slate-700 transition-colors">
                <svg className="w-7 h-7 text-white" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M3 21V7l9-4 9 4v14H3z" opacity=".2" />
                  <path d="M3 21V7l9-4 9 4v14H3zm2-2h14V8.35L12 5.15 5 8.35V19zm3-4h2v-4H8v4zm4 0h2v-4h-2v4zm-4-6h2V7H8v2zm4 0h2V7h-2v2zm4 6h2v-4h-2v4zm0-6h2V7h-2v2z" />
                </svg>
              </Link>
              <h1 className="text-2xl font-bold text-slate-900">{t.agencyLogin.title}</h1>
              <p className="text-slate-500 text-sm mt-1">{t.agencyLogin.subtitle}</p>
            </div>

            <Form method="post" className="space-y-4">
              {actionData?.error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">{actionData.error}</div>}
              <Input label={t.agencyLogin.emailOrIdLabel} name="emailOrId" placeholder={t.agencyLogin.emailOrIdPh} required />
              <Input label={t.agencyLogin.passwordLabel} name="password" showPasswordToggle placeholder={t.agencyLogin.passwordPh} required />
              <Button type="submit" variant="secondary" loading={isSubmitting} size="lg" className="w-full">
                {isSubmitting ? t.agencyLogin.loggingIn : t.agencyLogin.loginBtn}
              </Button>
              <div className="flex justify-between text-sm">
                <Link to="/agency/forgot-password" className="text-rose-500 hover:text-rose-600">{t.agencyLogin.forgotPassword}</Link>
                <Link to="/agency/register" className="text-slate-500 hover:text-slate-700">{t.agencyLogin.createAccount}</Link>
              </div>
            </Form>

            <p className="text-center text-sm text-slate-500 mt-4">
              {t.agencyLogin.isApplicant}{" "}
              <Link to="/login" className="text-rose-500 hover:text-rose-600 font-medium">{t.agencyLogin.loginHere}</Link>
            </p>

            {isDev && (
              <DevFill
                credentials={[
                  { label: "🏢 Test Agency", values: { emailOrId: "agency@test.com", password: "Test1234!" } },
                ]}
              />
            )}
          </Card>
        </div>
      </main>
    </div>
  );
}
