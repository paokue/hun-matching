import { Link } from "react-router";
import { useT } from "~/lib/i18n";

export function Footer() {
  const t = useT();

  return (
    <footer className="bg-slate-900 text-slate-400 py-12 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <img src="/favicon.svg" alt="" className="w-7 h-7" />
              <span className="font-bold text-white">HanMatching</span>
            </div>
            <p className="text-sm">{t.footer.tagline}</p>
          </div>
          <div>
            <h4 className="text-white font-semibold mb-3 text-sm">{t.footer.forApplicants}</h4>
            <ul className="space-y-2 text-sm">
              <li><Link to="/register" className="hover:text-rose-400 transition-colors">{t.footer.registerNow}</Link></li>
              <li><Link to="/login" className="hover:text-rose-400 transition-colors">{t.footer.login}</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="text-white font-semibold mb-3 text-sm">{t.footer.forAgencies}</h4>
            <ul className="space-y-2 text-sm">
              <li><Link to="/agency/register" className="hover:text-rose-400 transition-colors">{t.footer.agencyRegister}</Link></li>
              <li><Link to="/agency/login" className="hover:text-rose-400 transition-colors">{t.footer.agencyLogin}</Link></li>
            </ul>
          </div>
        </div>
        <div className="border-t border-slate-800 mt-8 pt-6 text-sm text-center">
          © {new Date().getFullYear()} HanMatching.com — {t.footer.rights}
        </div>
      </div>
    </footer>
  );
}
