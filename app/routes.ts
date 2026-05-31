import { type RouteConfig, index, route, prefix } from "@react-router/dev/routes";

export default [
  index("routes/_index.tsx"),

  // Locale
  route("set-locale", "routes/set-locale.ts"),

  // Public profiles (agency-protected detail)
  ...prefix("profiles", [
    index("routes/profiles.tsx"),
    route(":id", "routes/profiles.$id.tsx"),
  ]),

  // Applicant auth
  ...prefix("register", [
    index("routes/register.tsx"),
    route("2", "routes/register.2.tsx"),
    route("3", "routes/register.3.tsx"),
    route("4", "routes/register.4.tsx"),
  ]),
  route("login", "routes/login.tsx"),
  route("logout", "routes/logout.tsx"),
  route("forgot-password", "routes/forgot-password.tsx"),

  // Applicant dashboard
  route("dashboard", "routes/dashboard.tsx"),
  route("dashboard/edit", "routes/dashboard.edit.tsx"),
  route("dashboard/photos", "routes/dashboard.photos.tsx"),
  route("dashboard/documents", "routes/dashboard.documents.tsx"),

  // Agency
  ...prefix("agency", [
    route("register", "routes/agency.register.tsx"),
    route("login", "routes/agency.login.tsx"),
    route("logout", "routes/agency.logout.tsx"),
    route("forgot-password", "routes/agency.forgot-password.tsx"),
    route("dashboard", "routes/agency.dashboard.tsx"),
    route("search", "routes/agency.search.tsx"),
    route("profile/:id", "routes/agency.profile.$id.tsx"),
    route("applicant/:id", "routes/agency.applicant.$id.tsx"),
    route("membership", "routes/agency.membership.tsx"),
    route("selections", "routes/agency.selections.tsx"),
  ]),

  // Admin
  ...prefix("admin", [
    index("routes/admin._index.tsx"),
    route("badges", "routes/admin.badges.tsx"),
    route("login", "routes/admin.login.tsx"),
    route("logout", "routes/admin.logout.tsx"),
    route("applicants", "routes/admin.applicants.tsx"),
    route("applicants/:id", "routes/admin.applicants.$id.tsx"),
    route("agencies", "routes/admin.agencies.tsx"),
    route("agencies/:id", "routes/admin.agencies.$id.tsx"),
    route("payments", "routes/admin.payments.tsx"),
    route("packages", "routes/admin.packages.tsx"),
  ]),
] satisfies RouteConfig;
