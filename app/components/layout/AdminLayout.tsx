import { Form, NavLink } from "react-router";

const NAV_LINKS = [
  { to: "/admin", end: true, icon: "📊", label: "Dashboard" },
  { to: "/admin/applicants", icon: "👥", label: "Applicants" },
  { to: "/admin/agencies", icon: "🏢", label: "Agencies" },
  { to: "/admin/payments", icon: "💳", label: "Payments" },
  { to: "/admin/packages", icon: "📦", label: "Packages" },
];

function Sidebar() {
  return (
    <aside className="w-56 bg-slate-900 flex flex-col shrink-0 h-screen sticky top-0">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-slate-700/50">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-rose-500 rounded-lg flex items-center justify-center shrink-0">
            <span className="text-white font-bold text-sm">H</span>
          </div>
          <div>
            <p className="text-white font-bold text-sm leading-tight">HanMatching</p>
            <p className="text-slate-400 text-xs leading-tight mt-0.5">Admin Panel</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-3 space-y-0.5 overflow-y-auto">
        {NAV_LINKS.map(({ to, end, icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                isActive
                  ? "bg-rose-500 text-white"
                  : "text-slate-400 hover:text-white hover:bg-slate-800"
              }`
            }
          >
            <span className="text-base leading-none">{icon}</span>
            {label}
          </NavLink>
        ))}
      </nav>

      {/* Logout */}
      <div className="px-3 py-3 border-t border-slate-700/50">
        <Form method="post" action="/admin/logout">
          <button
            type="submit"
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <span className="text-base leading-none">🚪</span>
            Logout
          </button>
        </Form>
      </div>
    </aside>
  );
}

interface AdminLayoutProps {
  children: React.ReactNode;
}

export function AdminLayout({ children }: AdminLayoutProps) {
  return (
    <div className="flex h-screen bg-slate-50">
      <Sidebar />
      <div className="flex-1 overflow-y-auto">
        {children}
      </div>
    </div>
  );
}
