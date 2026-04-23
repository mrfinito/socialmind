'use client'
import Sidebar from './Sidebar'

export default function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 ml-[220px] min-h-screen bg-[#0f1117]">
        {children}
      </main>
    </div>
  )
}
