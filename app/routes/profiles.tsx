import { Link, redirect } from "react-router";
import type { Route } from "./+types/profiles";
import { getUserFromSession } from "~/lib/auth.server";
import { Navbar } from "~/components/layout/Navbar";
import { Footer } from "~/components/layout/Footer";
import { prisma } from "~/lib/prisma.server";

export function meta(_: Route.MetaArgs) {
  return [{ title: "Browse Applicants — HanMatching.com" }];
}

export async function loader({ request }: Route.LoaderArgs) {
  const session = await getUserFromSession(request);

  // Must be an active agency with valid membership
  if (!session || session.role !== "agency") throw redirect("/agency/login");
  const agency = await prisma.agency.findUnique({ where: { id: session.userId } });
  if (!agency || agency.status !== "active") throw redirect("/agency/dashboard");
  const hasMembership = !!(agency.membershipExpiresAt && new Date(agency.membershipExpiresAt) > new Date());
  if (!hasMembership) throw redirect("/agency/membership");

  const url = new URL(request.url);
  const search = url.searchParams.get("q") ?? "";

  const profiles = await prisma.user.findMany({
    where: {
      status: "active",
      ...(search ? {
        OR: [
          { fullName: { contains: search, mode: "insensitive" } },
          { occupation: { contains: search, mode: "insensitive" } },
          { currentAddress: { contains: search, mode: "insensitive" } },
          { ethnicity: { contains: search, mode: "insensitive" } },
        ],
      } : {}),
    },
    select: {
      id: true, profileId: true, fullName: true, photos: true,
      age: true, height: true, occupation: true, ethnicity: true,
      maritalStatus: true, currentAddress: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return { profiles, search, agency };
}

export default function Profiles({ loaderData }: Route.ComponentProps) {
  const { profiles, search, agency } = loaderData;

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <Navbar user={{ role: "agency", companyName: agency.companyName }} />

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-10">
        {/* Page header */}
        <div className="mb-8">
          <div className="flex items-center gap-2 text-sm text-slate-500 mb-3">
            <Link to="/agency/dashboard" className="hover:text-rose-500 transition-colors">Dashboard</Link>
            <span>/</span>
            <span className="text-slate-900 font-medium">All Applicants</span>
          </div>
          <div className="flex items-end justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Browse Applicants</h1>
              <p className="text-slate-500 text-sm mt-1">{profiles.length} active profiles found</p>
            </div>
            {/* Search */}
            <form method="get" className="relative hidden sm:block">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
              </svg>
              <input
                type="text"
                name="q"
                defaultValue={search}
                placeholder="Search by name, occupation..."
                className="pl-9 pr-4 py-2 w-64 text-sm border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-rose-300 focus:border-rose-300 text-slate-700 placeholder:text-slate-400"
              />
            </form>
          </div>
        </div>

        {profiles.length === 0 ? (
          <div className="text-center py-24 text-slate-400">
            <p className="text-5xl mb-4">🔍</p>
            <p className="text-lg font-medium text-slate-600">No profiles match your search</p>
            <p className="text-sm mt-1">Try different keywords</p>
            <Link to="/profiles" className="mt-4 inline-block text-rose-500 text-sm hover:text-rose-600">Clear search</Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {profiles.map((profile) => (
              <Link key={profile.id} to={`/profiles/${profile.id}`} className="group">
                <div className="bg-white rounded-2xl overflow-hidden border border-slate-100 hover:border-rose-200 hover:shadow-xl shadow-sm transition-all duration-300">
                  {/* Photo */}
                  <div className="aspect-[3/4] bg-slate-100 relative overflow-hidden">
                    {profile.photos?.[0] ? (
                      <img
                        src={profile.photos[0]}
                        alt={profile.profileId}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-rose-50 to-pink-50">
                        <svg className="w-12 h-12 text-rose-200" viewBox="0 0 24 24" fill="currentColor">
                          <circle cx="12" cy="7" r="4" />
                          <path d="M12 13c-4 0-7 2-7 4.5V19h14v-1.5c0-2.5-3-4.5-7-4.5z" />
                        </svg>
                      </div>
                    )}
                    {/* Status dot */}
                    <div className="absolute top-2.5 left-2.5 flex items-center gap-1 bg-green-500 text-white text-xs px-2 py-0.5 rounded-full font-medium shadow">
                      <span className="w-1.5 h-1.5 bg-white rounded-full" />
                      Active
                    </div>
                  </div>

                  {/* Info */}
                  <div className="p-3">
                    <p className="font-semibold text-slate-900 text-sm truncate">{profile.fullName}</p>
                    <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                      {profile.age && (
                        <span className="text-xs text-slate-500">{profile.age} yrs</span>
                      )}
                      {profile.age && profile.occupation && <span className="text-slate-300 text-xs">·</span>}
                      {profile.occupation && (
                        <span className="text-xs text-slate-500 truncate">{profile.occupation}</span>
                      )}
                    </div>
                    {profile.currentAddress && (
                      <p className="text-xs text-slate-400 mt-0.5 truncate flex items-center gap-1">
                        <svg className="w-3 h-3 shrink-0" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5A2.5 2.5 0 1 1 12 6a2.5 2.5 0 0 1 0 5z" />
                        </svg>
                        {profile.currentAddress}
                      </p>
                    )}
                    <div className="mt-2 pt-2 border-t border-slate-50 flex items-center justify-between">
                      {profile.ethnicity ? (
                        <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">{profile.ethnicity}</span>
                      ) : <span />}
                      <span className="text-xs text-rose-500 font-medium group-hover:text-rose-600 transition-colors">
                        View →
                      </span>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
