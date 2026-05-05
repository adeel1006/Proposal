import type { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";
import { AUTH_COOKIE_NAME, isAuthenticated } from "@/lib/auth";
import HeaderNav from "@/app/components/HeaderNav";
import "./globals.css";

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: "Proposal Maker",
  description: "Create and manage professional proposals with admin and client dashboards.",
  icons: {
    icon: "/Favicon-proposals.png",
  },
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
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Nunito:wght@400;600;700;800&display=swap" rel="stylesheet" />
        <script src="https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js" async></script>
      </head>
      <body className="min-h-full flex flex-col bg-slate-50 text-slate-900">
        <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/95 backdrop-blur-sm shadow-sm">
          <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
            <div className="flex items-center gap-4">
              <img src="/a2zadvert__logo.png" alt="AtoZ Advert Proposals" className="h-20 w-auto" />
              {/* <div>
                <p className="text-xs font-semibold uppercase tracking-[0.28em] text-indigo-600">AtoZ Advert</p>
                <p className="text-xl font-semibold text-slate-900">Proposals</p>
              </div> */}
            </div>
            <HeaderNav isLoggedIn={isLoggedIn} />
          </div>
        </header>

        <main className="flex-1">{children}</main>

        <footer className="border-t border-slate-200 bg-white">
          <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between px-6 py-6 text-sm text-slate-500">
            <p className="flex items-center">Atoz Advert Proposals • © Copyright {currentYear}</p>
            <nav className="flex flex-wrap gap-6">
              <Link href="/" className="transition hover:text-slate-900 font-medium">
                Home
              </Link>
              <Link href="/admin/proposals" className="transition hover:text-slate-900 font-medium">
                Send Proposal
              </Link>
              <Link href="/admin/submitted-proposals" className="transition hover:text-slate-900 font-medium">
                Submitted Proposals
              </Link>
            </nav>
          </div>
        </footer>
      </body>
    </html>
  );
}
