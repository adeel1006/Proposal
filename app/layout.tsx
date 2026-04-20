import type { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";
import { AUTH_COOKIE_NAME, isAuthenticated } from "@/lib/auth";
import "./globals.css";

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: "Proposal Maker",
  description: "Create and manage professional proposals with admin and client dashboards.",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookiesStore = await cookies();
  const authCookie = cookiesStore.get(AUTH_COOKIE_NAME)?.value;
  const isLoggedIn = isAuthenticated(authCookie);
  const currentYear = new Date().getFullYear();

  return (
    <html lang="en" className="h-full antialiased">
      <head>
        <script src="https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js" async></script>
      </head>
      <body className="min-h-full flex flex-col bg-slate-50 text-slate-900">
        <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/95 backdrop-blur-sm shadow-sm">
          <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-indigo-600">AtoZ Advert</p>
              <p className="text-xl font-semibold text-slate-900">Proposals</p>
            </div>
            <nav className="flex flex-wrap items-center gap-4 text-sm text-slate-700">
              {isLoggedIn ? (
                <>
                  <Link href="/" className="transition hover:text-slate-900">
                    Home
                  </Link>
                  <Link href="/proposal-maker" className="transition hover:text-slate-900">
                    Proposal Maker
                  </Link>
                  <Link href="/admin/proposals" className="transition hover:text-slate-900">
                    Admin
                  </Link>
                  <Link href="/client/proposals" className="transition hover:text-slate-900">
                    Client
                  </Link>
                  <form action="/api/auth/logout" method="post" className="inline">
                    <button
                      type="submit"
                      className="text-sm text-slate-700 transition hover:text-slate-900"
                    >
                      Logout
                    </button>
                  </form>
                </>
              ) : (
                <Link href="/login" className="transition hover:text-slate-900">
                  Login
                </Link>
              )}
            </nav>
          </div>
        </header>

        <main className="flex-1">{children}</main>

        <footer className="border-t border-slate-200 bg-white">
          <div className="mx-auto flex max-w-7xl items-center justify-center px-6 py-4">
            <p className="text-sm text-slate-500">Atoz Advert Proposals • © Copyright {currentYear}</p>
          </div>
        </footer>
      </body>
    </html>
  );
}
