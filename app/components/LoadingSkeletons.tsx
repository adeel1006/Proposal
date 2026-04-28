type SkeletonLineProps = {
  className?: string;
};

function SkeletonLine({ className = '' }: SkeletonLineProps) {
  return <div className={`animate-pulse rounded bg-slate-200 ${className}`} />;
}

export function PageHeaderSkeleton() {
  return (
    <div className="mb-6">
      <SkeletonLine className="h-9 w-72 max-w-full" />
      <SkeletonLine className="mt-3 h-5 w-96 max-w-full" />
    </div>
  );
}

export function CompanyGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="overflow-hidden rounded-lg bg-white shadow-lg">
          <SkeletonLine className="h-32 rounded-none" />
          <div className="space-y-4 p-4">
            <SkeletonLine className="h-6 w-3/4" />
            <div className="space-y-2">
              <SkeletonLine className="h-4 w-full" />
              <SkeletonLine className="h-4 w-5/6" />
              <SkeletonLine className="h-4 w-2/3" />
            </div>
            <div className="flex gap-2 border-t pt-4">
              <SkeletonLine className="h-9 flex-1" />
              <SkeletonLine className="h-9 flex-1" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function SelectSkeleton() {
  return (
    <div className="space-y-2">
      <SkeletonLine className="h-4 w-36" />
      <SkeletonLine className="h-11 w-full" />
    </div>
  );
}

export function ServiceListSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="rounded-lg border border-gray-200 p-4">
          <div className="mb-3 flex items-start justify-between gap-4">
            <div className="flex-1 space-y-2">
              <SkeletonLine className="h-5 w-48 max-w-full" />
              <SkeletonLine className="h-4 w-24" />
            </div>
            <SkeletonLine className="h-6 w-24" />
          </div>
          <SkeletonLine className="h-4 w-full" />
          <SkeletonLine className="mt-2 h-4 w-2/3" />
          <div className="mt-4 flex gap-2">
            <SkeletonLine className="h-8 w-16" />
            <SkeletonLine className="h-8 w-16" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function ProposalTableSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white shadow">
      <table className="min-w-full text-left text-sm">
        <thead className="bg-gray-50">
          <tr className="border-b border-gray-200">
            {['Proposal ID', 'Client', 'Company', 'Project', 'Total', 'Status', 'Submitted At', 'Actions'].map((heading) => (
              <th key={heading} className="px-4 py-3 font-semibold text-gray-700">
                {heading}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rows }).map((_, index) => (
            <tr key={index} className="border-b border-gray-100">
              <td className="px-4 py-4"><SkeletonLine className="h-4 w-28" /></td>
              <td className="px-4 py-4">
                <SkeletonLine className="h-4 w-32" />
                <SkeletonLine className="mt-2 h-3 w-40" />
              </td>
              <td className="px-4 py-4"><SkeletonLine className="h-4 w-28" /></td>
              <td className="px-4 py-4"><SkeletonLine className="h-4 w-36" /></td>
              <td className="px-4 py-4"><SkeletonLine className="h-4 w-16" /></td>
              <td className="px-4 py-4"><SkeletonLine className="h-7 w-28 rounded-full" /></td>
              <td className="px-4 py-4"><SkeletonLine className="h-4 w-32" /></td>
              <td className="px-4 py-4">
                <div className="flex gap-2">
                  <SkeletonLine className="h-8 w-16" />
                  <SkeletonLine className="h-8 w-16" />
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function ProposalEditorSkeleton() {
  return (
    <div className="min-h-screen bg-gray-100">
      <div className="mx-auto max-w-7xl p-6">
        <div className="mb-6 rounded-lg bg-white p-4 shadow">
          <SkeletonLine className="h-4 w-24" />
          <SkeletonLine className="mt-2 h-7 w-64 max-w-full" />
        </div>
        <div className="mb-6 flex gap-2">
          <SkeletonLine className="h-12 w-36" />
          <SkeletonLine className="h-12 w-36" />
          <SkeletonLine className="h-12 w-28" />
        </div>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="space-y-4">
            <div className="rounded-lg bg-white p-6 shadow">
              <SkeletonLine className="h-6 w-28" />
              <div className="mt-4">
                <SelectSkeleton />
              </div>
            </div>
            <div className="rounded-lg bg-white p-6 shadow">
              <SkeletonLine className="h-6 w-44" />
              <div className="mt-4 space-y-4">
                {Array.from({ length: 5 }).map((_, index) => (
                  <SkeletonLine key={index} className="h-10 w-full" />
                ))}
              </div>
            </div>
          </div>
          <div className="lg:col-span-2">
            <div className="rounded-lg bg-white p-6 shadow">
              <SkeletonLine className="h-6 w-32" />
              <div className="mt-6 space-y-4">
                <SkeletonLine className="h-8 w-1/2" />
                <SkeletonLine className="h-4 w-full" />
                <SkeletonLine className="h-4 w-5/6" />
                <SkeletonLine className="h-48 w-full" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
