export default function Loading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0f1117]">
      <div className="flex items-center gap-3 text-gray-500">
        <div className="w-6 h-6 rounded-full border-2 border-indigo-500/30 border-t-indigo-500 animate-spin" />
        <p className="text-sm">Ładowanie...</p>
      </div>
    </div>
  )
}
