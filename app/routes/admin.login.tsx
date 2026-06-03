import { Form, Link, redirect, useActionData, useNavigation } from "react-router";
import type { Route } from "./+types/admin.login";
import { verifyPassword, createUserSession, getUserFromSession } from "~/lib/auth.server";
import { Input } from "~/components/ui/Input";
import { Button } from "~/components/ui/Button";
import { Card } from "~/components/ui/Card";
import { DevFill } from "~/components/ui/DevFill";
import { prisma } from "~/lib/prisma.server";

export function meta(_: Route.MetaArgs) {
  return [{ title: "Admin Login — HanMatching.com" }];
}

export async function loader({ request }: Route.LoaderArgs) {
  const session = await getUserFromSession(request);
  if (session?.role === "admin") return redirect("/admin");
  return { isDev: process.env.NODE_ENV !== "production" };
}

export async function action({ request }: Route.ActionArgs) {
  const formData = await request.formData();
  const username = (formData.get("username") as string)?.trim();
  const password = formData.get("password") as string;

  if (!username || !password) return { error: "Username and password are required." };

  const admin = await prisma.admin.findUnique({ where: { username } });

  if (!admin || !(await verifyPassword(password, admin.password))) {
    return { error: "Invalid credentials." };
  }

  return createUserSession(admin.id, "admin", "/admin");
}

export default function AdminLogin({ loaderData, actionData }: Route.ComponentProps) {
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";
  const isDev = loaderData?.isDev ?? false;

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-sm">

        <Card>
          <p className="text-start text-sm text-slate-500">
            <Link to="/" className="hover:text-slate-700 transition-colors">← Back Home</Link>
          </p><br />

          <h1 className="text-xl font-bold text-slate-900 mb-1">Admin Login</h1>
          <p className="text-slate-500 text-sm mb-6">Sign in to manage the platform.</p>

          <Form method="post" className="space-y-4">
            {actionData?.error && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
                {actionData.error}
              </div>
            )}
            <Input
              label="Username"
              name="username"
              placeholder="admin"
              defaultValue={isDev ? "admin" : undefined}
              required
            />
            <Input
              label="Password"
              name="password"
              showPasswordToggle
              placeholder="Your password"
              defaultValue={isDev ? "Admin@123456" : undefined}
              required
            />
            <Button type="submit" loading={isSubmitting} className="w-full" size="lg">
              {isSubmitting ? "Signing in..." : "Sign In"}
            </Button>
          </Form>

          {isDev && (
            <DevFill
              credentials={[
                { label: "👤 Admin", values: { username: "admin", password: "Admin@123456" } },
              ]}
            />
          )}
        </Card>
      </div>
    </div>
  );
}
