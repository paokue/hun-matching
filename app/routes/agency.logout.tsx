import type { Route } from "./+types/agency.logout";
import { logout } from "~/lib/auth.server";

export async function action({ request }: Route.ActionArgs) {
  return logout(request, "/agency/login");
}

export async function loader({ request }: Route.LoaderArgs) {
  return logout(request, "/agency/login");
}
