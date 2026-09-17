export default function DashboardLoading() {
  return (
    <div className="mx-auto flex w-full max-w-5xl animate-pulse flex-col gap-6 px-6 py-8 lg:px-10">
      {/* Header skeleton mirrors the welcome banner */}
      <div className="rounded-[30px] border border-white/10 bg-white/[0.03] p-6">
        <div className="h-10 w-2/3 max-w-xl rounded-2xl bg-white/[0.08]" />
        <div className="mt-4 h-4 w-1/2 max-w-md rounded-full bg-white/[0.05]" />
      </div>

      {/* Upload card skeleton (primary action) */}
      <div className="h-56 rounded-[24px] border border-white/10 bg-white/[0.03]" />

      {/* Latest playlists skeleton (one row per playlist) */}
      <div className="rounded-[28px] border border-white/10 bg-white/[0.03] p-5">
        <div className="h-6 w-48 rounded-full bg-white/[0.08]" />
        <div className="mt-5 space-y-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <div
              key={index}
              className="h-14 rounded-2xl border border-white/8 bg-white/[0.04]"
            />
          ))}
        </div>
      </div>
    </div>
  )
}
