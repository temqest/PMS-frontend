import { WorkspaceCard } from "./workspace-ui";

const patientTabs = ["Overview", "Predictive Care", "Health Records", "Appointments", "Prescriptions"] as const;

function SkeletonBlock({
  className = "",
}: {
  className?: string;
}) {
  return <div aria-hidden="true" className={`animate-pulse rounded-[10px] bg-slate-200/70 ${className}`.trim()} />;
}

function QuickLineSkeleton() {
  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <SkeletonBlock className="h-4 w-24" />
      <SkeletonBlock className="h-4 w-32" />
    </div>
  );
}

function PatientHeaderSkeleton() {
  return (
    <WorkspaceCard className="p-6">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-5">
          <SkeletonBlock className="h-20 w-20 rounded-full" />
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-3">
              <SkeletonBlock className="h-8 w-56" />
              <SkeletonBlock className="h-6 w-20 rounded-full" />
            </div>
            <SkeletonBlock className="h-4 w-72 max-w-full" />
          </div>
        </div>
        <div className="flex flex-wrap gap-3">
          <SkeletonBlock className="h-11 w-28" />
          <SkeletonBlock className="h-11 w-11" />
        </div>
      </div>
    </WorkspaceCard>
  );
}

function PatientTabsSkeleton({
  activeTab,
}: {
  activeTab: (typeof patientTabs)[number];
}) {
  return (
    <WorkspaceCard className="px-6 pt-3">
      <div className="flex gap-6 border-b border-[#E5E7EB]">
        {patientTabs.map((item) => (
          <div key={item} className="relative px-1 py-4">
            <SkeletonBlock className={`h-4 ${item === activeTab ? "w-24" : "w-20"}`} />
            {item === activeTab ? <span className="absolute inset-x-0 bottom-0 h-0.5 bg-slate-200/90" /> : null}
          </div>
        ))}
      </div>
    </WorkspaceCard>
  );
}

function OverviewTableSkeleton() {
  return (
    <div className="mt-5 overflow-hidden rounded-[12px] border border-[#F3F4F6]">
      <div className="grid grid-cols-4 gap-4 border-b border-[#F3F4F6] bg-[#FAFBFC] px-4 py-3">
        <SkeletonBlock className="h-3 w-12" />
        <SkeletonBlock className="h-3 w-12" />
        <SkeletonBlock className="h-3 w-16" />
        <SkeletonBlock className="h-3 w-14" />
      </div>
      {Array.from({ length: 4 }).map((_, index) => (
        <div key={index} className="grid grid-cols-4 gap-4 border-t border-[#F3F4F6] px-4 py-4">
          <SkeletonBlock className="h-4 w-20" />
          <SkeletonBlock className="h-6 w-24 rounded-full" />
          <SkeletonBlock className="h-4 w-24" />
          <SkeletonBlock className="h-4 w-full max-w-[220px]" />
        </div>
      ))}
    </div>
  );
}

function PatientDetailsSkeleton() {
  return (
    <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
      <div className="space-y-6">
        <WorkspaceCard className="p-6">
          <div className="flex items-start justify-between gap-6">
            <div className="space-y-2">
              <SkeletonBlock className="h-6 w-32" />
            </div>
            <SkeletonBlock className="h-4 w-10" />
          </div>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            {Array.from({ length: 10 }).map((_, index) => (
              <QuickLineSkeleton key={index} />
            ))}
          </div>
        </WorkspaceCard>

        <WorkspaceCard className="p-6">
          <div className="flex items-start justify-between gap-6">
            <SkeletonBlock className="h-6 w-32" />
            <SkeletonBlock className="h-4 w-14" />
          </div>
          <OverviewTableSkeleton />
        </WorkspaceCard>
      </div>

      <div className="space-y-6">
        <WorkspaceCard className="p-6">
          <SkeletonBlock className="h-6 w-28" />
          <div className="mt-4 space-y-4">
            <QuickLineSkeleton />
            <div>
              <SkeletonBlock className="h-4 w-16" />
              <div className="mt-2 flex flex-wrap gap-2">
                <SkeletonBlock className="h-6 w-20 rounded-full" />
                <SkeletonBlock className="h-6 w-24 rounded-full" />
                <SkeletonBlock className="h-6 w-16 rounded-full" />
              </div>
            </div>
            <QuickLineSkeleton />
          </div>
        </WorkspaceCard>

        <WorkspaceCard className="p-6">
          <SkeletonBlock className="h-6 w-40" />
          <div className="mt-4 rounded-[12px] bg-[#FAFBFC] p-4">
            <div className="flex items-center gap-3">
              <SkeletonBlock className="h-5 w-5 rounded-full" />
              <div className="space-y-2">
                <SkeletonBlock className="h-4 w-36" />
                <SkeletonBlock className="h-4 w-28" />
              </div>
            </div>
          </div>
        </WorkspaceCard>

        <WorkspaceCard className="p-6">
          <SkeletonBlock className="h-6 w-16" />
          <div className="mt-4 rounded-[12px] border border-[#E5E7EB] bg-white p-4">
            <div className="space-y-3">
              <SkeletonBlock className="h-4 w-full" />
              <SkeletonBlock className="h-4 w-full" />
              <SkeletonBlock className="h-4 w-5/6" />
            </div>
          </div>
        </WorkspaceCard>
      </div>
    </div>
  );
}

function RecordsSkeleton() {
  return (
    <WorkspaceCard className="p-6">
      <div className="flex items-start justify-between gap-6">
        <SkeletonBlock className="h-6 w-32" />
        <SkeletonBlock className="h-10 w-36" />
      </div>
      <div className="mt-5 space-y-3">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="rounded-[12px] border border-[#F3F4F6] p-4">
            <div className="flex items-center gap-2">
              <SkeletonBlock className="h-6 w-24 rounded-full" />
              <SkeletonBlock className="h-6 w-28 rounded-full" />
              <SkeletonBlock className="h-4 w-20" />
            </div>
            <SkeletonBlock className="mt-3 h-5 w-48" />
            <div className="mt-2 space-y-2">
              <SkeletonBlock className="h-4 w-full" />
              <SkeletonBlock className="h-4 w-4/5" />
            </div>
          </div>
        ))}
      </div>
    </WorkspaceCard>
  );
}

function AppointmentsSkeleton() {
  return (
    <WorkspaceCard className="p-6">
      <div className="flex items-start justify-between gap-6">
        <SkeletonBlock className="h-6 w-28" />
        <SkeletonBlock className="h-10 w-40" />
      </div>
      <div className="mt-5 overflow-hidden rounded-[12px] border border-[#F3F4F6]">
        <div className="grid grid-cols-5 gap-4 border-b border-[#F3F4F6] bg-[#FAFBFC] px-4 py-3">
          {Array.from({ length: 5 }).map((_, index) => (
            <SkeletonBlock key={index} className="h-3 w-12" />
          ))}
        </div>
        {Array.from({ length: 5 }).map((_, index) => (
          <div key={index} className="grid grid-cols-5 gap-4 border-t border-[#F3F4F6] px-4 py-4">
            <SkeletonBlock className="h-4 w-20" />
            <SkeletonBlock className="h-4 w-16" />
            <SkeletonBlock className="h-4 w-20" />
            <SkeletonBlock className="h-4 w-24" />
            <SkeletonBlock className="h-4 w-full max-w-[180px]" />
          </div>
        ))}
      </div>
    </WorkspaceCard>
  );
}

function PrescriptionsSkeleton() {
  return (
    <WorkspaceCard className="p-6">
      <div className="flex items-start justify-between gap-6">
        <SkeletonBlock className="h-6 w-28" />
        <SkeletonBlock className="h-10 w-40" />
      </div>
      <div className="mt-5 space-y-3">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="rounded-[12px] border border-[#F3F4F6] p-4">
            <div className="flex items-center justify-between gap-3">
              <SkeletonBlock className="h-5 w-40" />
              <SkeletonBlock className="h-6 w-24 rounded-full" />
            </div>
            <SkeletonBlock className="mt-3 h-4 w-full" />
            <SkeletonBlock className="mt-2 h-4 w-4/5" />
            <SkeletonBlock className="mt-2 h-4 w-2/3" />
          </div>
        ))}
      </div>
    </WorkspaceCard>
  );
}

export function PatientPageSkeleton({
  activeTab = "Overview",
}: {
  activeTab?: (typeof patientTabs)[number];
}) {
  return (
    <div className="space-y-6 pb-8">
      <SkeletonBlock className="h-4 w-64" />
      <PatientHeaderSkeleton />
      <PatientTabsSkeleton activeTab={activeTab} />
      {activeTab === "Overview" ? (
        <PatientDetailsSkeleton />
      ) : activeTab === "Appointments" ? (
        <AppointmentsSkeleton />
      ) : activeTab === "Health Records" ? (
        <RecordsSkeleton />
      ) : activeTab === "Prescriptions" ? (
        <PrescriptionsSkeleton />
      ) : (
        <RecordsSkeleton />
      )}
    </div>
  );
}

export { PatientHeaderSkeleton, PatientDetailsSkeleton, RecordsSkeleton };
