import { SideNav } from "@/components/SideNav";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-surface">
      <SideNav />
      <main className="flex-1 ml-64 min-h-screen flex flex-col">
        <header className="h-16 flex justify-between items-center w-full px-8 bg-surface border-b border-outline-variant sticky top-0 z-30">
          <div className="text-sm font-bold tracking-[0.1em] uppercase text-on-surface">
            ActiveLearn Hub
          </div>
          <div className="flex items-center gap-4">
            <button className="p-2 hover:bg-surface-container-low rounded-full transition-all">
              <span className="material-symbols-outlined text-on-surface">account_circle</span>
            </button>
          </div>
        </header>
        <div className="flex-1 p-10">{children}</div>
      </main>
    </div>
  );
}
