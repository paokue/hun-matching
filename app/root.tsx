import {
  isRouteErrorResponse,
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  useLoaderData,
} from "react-router";

import type { Route } from "./+types/root";
import "./app.css";
import { getLocaleFromRequest } from "~/lib/locale.server";
import { getTranslations } from "~/locales";
import { I18nContext } from "~/lib/i18n";

export const links: Route.LinksFunction = () => [
  { rel: "preconnect", href: "https://fonts.googleapis.com" },
  {
    rel: "preconnect",
    href: "https://fonts.gstatic.com",
    crossOrigin: "anonymous",
  },
  {
    rel: "stylesheet",
    href: "https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap",
  },
];

export async function loader({ request }: Route.LoaderArgs) {
  const locale = getLocaleFromRequest(request);
  return { locale };
}

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="lo" className="h-full">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body className="h-full bg-slate-50 font-sans antialiased">
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function App() {
  const { locale } = useLoaderData<typeof loader>();
  const translations = getTranslations(locale);

  return (
    <I18nContext.Provider value={{ locale, t: translations }}>
      <Outlet />
    </I18nContext.Provider>
  );
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  let message = "Oops!";
  let details = "An unexpected error occurred.";
  let stack: string | undefined;

  if (isRouteErrorResponse(error)) {
    message = error.status === 404 ? "404" : "Error";
    details =
      error.status === 404
        ? "The requested page could not be found."
        : error.statusText || details;
  } else if (import.meta.env.DEV && error && error instanceof Error) {
    details = error.message;
    stack = error.stack;
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="text-center p-8">
        <h1 className="text-4xl font-bold text-slate-900 mb-2">{message}</h1>
        <p className="text-slate-600 mb-4">{details}</p>
        {stack && (
          <pre className="w-full p-4 overflow-x-auto bg-slate-100 rounded-lg text-left text-xs">
            <code>{stack}</code>
          </pre>
        )}
        <a href="/" className="mt-4 inline-block text-rose-500 hover:text-rose-600">
          ← Go Home
        </a>
      </div>
    </main>
  );
}
