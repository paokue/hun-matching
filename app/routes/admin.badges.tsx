// Tiny resource route used by AdminLayout to refresh pending-count badges.
// Returns just the three counts so the layout can show them next to nav items.
import type { Route } from "./+types/admin.badges";
import { requireAdmin } from "~/lib/auth.server";
import { prisma } from "~/lib/prisma.server";

export async function loader({ request }: Route.LoaderArgs) {
  await requireAdmin(request);
  const [applicants, agencies, payments] = await Promise.all([
    prisma.user.count({ where: { status: "pending" } }),
    prisma.agency.count({ where: { status: "pending" } }),
    prisma.payment.count({ where: { status: "pending" } }),
  ]);
  return { applicants, agencies, payments };
}
