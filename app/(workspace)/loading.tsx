function SkeletonBlock({
  className,
}: {
  className: string;
}) {
  return <div className={`animate-pulse rounded-[12px] bg-[#F3F4F6] ${className}`.trim()} />;
}

export default function WorkspaceLoading() {
  return (
    <div className="space-y-6 pb-8">
      <section className="rounded-[12px] border border-[#E5E7EB] bg-white p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-3">
            <SkeletonBlock className="h-7 w-40" />
            <SkeletonBlock className="h-4 w-72 max-w-full" />
          </div>
          <div className="flex gap-3">
            <SkeletonBlock className="h-10 w-28" />
            <SkeletonBlock className="h-10 w-36" />
          </div>
        </div>
      </section>

      <div className="grid gap-4 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <section
            key={index}
            className="rounded-[12px] border border-[#E5E7EB] bg-white p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04)]"
          >
            <div className="flex items-start justify-between gap-4">
              <SkeletonBlock className="h-12 w-12 rounded-[12px]" />
              <SkeletonBlock className="h-4 w-16" />
            </div>
            <SkeletonBlock className="mt-5 h-9 w-20" />
            <SkeletonBlock className="mt-2 h-4 w-32" />
          </section>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <section className="rounded-[12px] border border-[#E5E7EB] bg-white p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <SkeletonBlock className="h-6 w-44" />
          <div className="mt-6 grid grid-cols-2 gap-3">
            {Array.from({ length: 4 }).map((_, index) => (
              <SkeletonBlock key={index} className="h-24 w-full" />
            ))}
          </div>
        </section>

        <section className="rounded-[12px] border border-[#E5E7EB] bg-white p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <SkeletonBlock className="h-6 w-36" />
          <SkeletonBlock className="mt-2 h-4 w-48" />
          <div className="mt-6 space-y-4">
            {Array.from({ length: 5 }).map((_, index) => (
              <div key={index} className="flex items-center gap-4">
                <SkeletonBlock className="h-4 w-16" />
                <SkeletonBlock className="h-3 w-3 rounded-full" />
                <div className="flex-1 space-y-2">
                  <SkeletonBlock className="h-4 w-40" />
                  <SkeletonBlock className="h-3 w-28" />
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
