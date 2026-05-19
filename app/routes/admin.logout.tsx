import { logout } from "~/lib/auth.server";
import type { Route } from "./+types/admin.logout";

export async function action({ request }: Route.ActionArgs) {
  return logout(request, "/admin/login");
}
