"use client";

import { useState } from "react";
import Link from "next/link";

type HeaderNavProps = {
  isLoggedIn: boolean;
};

export default function HeaderNav({ isLoggedIn }: HeaderNavProps) {
  const [isOpen, setIsOpen] = useState(false);

  const closeMenu = () => setIsOpen(false);

  return (
    <div className="relative flex items-center">
      <div className="md:hidden">
        <button
          type="button"
          onClick={() => setIsOpen((current) => !current)}
          aria-expanded={isOpen}
          aria-label={isOpen ? "Close navigation menu" : "Open navigation menu"}
          className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white p-2 text-slate-700 shadow-sm transition hover:bg-slate-50 hover:text-slate-900"
        >
          {isOpen ? (
            <svg
              viewBox="0 0 24 24"
              className="h-6 w-6"
              aria-hidden="true"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            >
              <path d="M6 6l12 12" />
              <path d="M18 6L6 18" />
            </svg>
          ) : (
            <svg
              viewBox="0 0 24 24"
              className="h-6 w-6"
              aria-hidden="true"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            >
              <path d="M4 6h16" />
              <path d="M4 12h16" />
              <path d="M4 18h16" />
            </svg>
          )}
        </button>
      </div>

      <nav className="hidden items-center gap-4 text-sm text-slate-700 md:flex">
        {isLoggedIn ? (
          <>
            <Link href="/" className="transition hover:text-slate-900">
              Home
            </Link>
            <Link
              href="/admin/proposals"
              className="transition hover:text-slate-900"
            >
              Send Proposal
            </Link>
            <Link
              href="/admin/ai-proposal"
              className="transition hover:text-slate-900"
            >
              AI Proposal
            </Link>
            <Link
              href="/admin/submitted-proposals"
              className="transition hover:text-slate-900"
            >
              Submitted Proposals
            </Link>
            <Link
              href="/admin/customers"
              className="transition hover:text-slate-900"
            >
              Customers
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

      {isOpen && (
        <nav className="absolute right-0 top-full z-50 mt-3 w-56 rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-700 shadow-lg md:hidden">
          {isLoggedIn ? (
            <div className="flex flex-col gap-3">
              <Link
                href="/"
                onClick={closeMenu}
                className="transition hover:text-slate-900"
              >
                Home
              </Link>
              <Link
                href="/admin/proposals"
                onClick={closeMenu}
                className="transition hover:text-slate-900"
              >
                Send Proposal
              </Link>
              <Link
                href="/admin/ai-proposal"
                onClick={closeMenu}
                className="transition hover:text-slate-900"
              >
                AI Proposal
              </Link>
              <Link
                href="/admin/customers"
                onClick={closeMenu}
                className="transition hover:text-slate-900"
              >
                Customers
              </Link>
              <Link
                href="/admin/submitted-proposals"
                onClick={closeMenu}
                className="transition hover:text-slate-900"
              >
                Submitted Proposals
              </Link>
              <form action="/api/auth/logout" method="post" className="inline">
                <button
                  type="submit"
                  className="text-left text-sm text-slate-700 transition hover:text-slate-900"
                >
                  Logout
                </button>
              </form>
            </div>
          ) : (
            <Link
              href="/login"
              onClick={closeMenu}
              className="transition hover:text-slate-900"
            >
              Login
            </Link>
          )}
        </nav>
      )}
    </div>
  );
}
