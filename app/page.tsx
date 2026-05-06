export default function Home() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <main className="mx-auto flex min-h-screen max-w-6xl flex-col justify-center px-6 py-16">
        <section className="text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-indigo-600">Proposal Management</p>
          <h1 className="mt-6 text-4xl font-bold tracking-tight sm:text-5xl">
            Build professional proposals fast and keep your business workflows organized.
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-base leading-7 text-slate-700">
            Manage companies, services, proposals, and client views from one simple dashboard. Export proposals, print PDF-ready documents, and share polished quotes with customers.
          </p>
          <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <a
              href="/admin/proposals"
              className="inline-flex items-center justify-center rounded-full bg-slate-900 px-7 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-700"
            >
              Open Proposal Dashboard
            </a>
          </div>
        </section>

        <section className="mt-16 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <a
            href="/admin/companies"
            className="rounded-3xl border border-slate-200 bg-white p-6 text-left shadow-sm transition hover:border-indigo-300 hover:shadow-lg"
          >
            <div className="text-3xl">🏢</div>
            <h2 className="mt-4 text-lg font-semibold text-slate-900">Add Company</h2>
            <p className="mt-2 text-sm leading-6 text-slate-700">
              Store company profiles, contact info, branding, and currency preferences.
            </p>
          </a>
          <a
            href="/admin/services"
            className="rounded-3xl border border-slate-200 bg-white p-6 text-left shadow-sm transition hover:border-amber-300 hover:shadow-lg"
          >
            <div className="text-3xl">🛍️</div>
            <h2 className="mt-4 text-lg font-semibold text-slate-900">Services</h2>
            <p className="mt-2 text-sm leading-6 text-slate-700">
              Manage service items, pricing, and categories for each company.
            </p>
          </a>
          <a
            href="/admin/proposals"
            className="rounded-3xl border border-slate-200 bg-white p-6 text-left shadow-sm transition hover:border-sky-300 hover:shadow-lg"
          >
            <div className="text-3xl">📝</div>
            <h2 className="mt-4 text-lg font-semibold text-slate-900">Send Proposals</h2>
            <p className="mt-2 text-sm leading-6 text-slate-700">
              Create, edit, and export proposal drafts with live preview.
            </p>
          </a>

        </section>
      </main>
    </div>
  );
}
