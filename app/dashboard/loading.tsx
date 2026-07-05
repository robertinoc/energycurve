export default function DashboardLoading() {
  return (
    <main className="min-h-screen bg-[#08050F] text-white">
      <div className="mx-auto flex min-h-screen w-full max-w-7xl animate-pulse flex-col gap-6 px-6 py-8 lg:px-10">
        {/* Header skeleton mirrors the welcome banner */}
        <div className="rounded-[30px] border border-white/10 bg-white/[0.03] p-6">
          <div className="h-8 w-44 rounded-full bg-white/[0.06]" />
          <div className="mt-6 h-10 w-2/3 max-w-xl rounded-2xl bg-white/[0.08]" />
          <div className="mt-4 h-4 w-1/2 max-w-md rounded-full bg-white/[0.05]" />
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <div
                key={index}
                className="h-24 rounded-[22px] border border-white/8 bg-white/[0.04]"
              />
            ))}
          </div>
        </div>

        {/* Content sections skeleton */}
        <div className="rounded-[28px] border border-white/10 bg-white/[0.03] p-5">
          <div className="h-4 w-36 rounded-full bg-white/[0.06]" />
          <div className="mt-3 h-6 w-64 rounded-full bg-white/[0.08]" />
          <div className="mt-5 space-y-3">
            {Array.from({ length: 2 }).map((_, index) => (
              <div
                key={index}
                className="h-20 rounded-[22px] border border-white/8 bg-white/[0.04]"
              />
            ))}
          </div>
        </div>

        <div className="grid gap-5 xl:grid-cols-[280px_minmax(0,1fr)_260px]">
          <div className="h-72 rounded-[28px] border border-white/10 bg-white/[0.03]" />
          <div className="h-72 rounded-[30px] border border-white/10 bg-white/[0.03]" />
          <div className="h-72 rounded-[28px] border border-white/10 bg-white/[0.03]" />
        </div>
      </div>
    </main>
  )
}
