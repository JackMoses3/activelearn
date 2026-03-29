import { getCourses } from "@/lib/queries";
import { AppTopNav } from "@/components/AppTopNav";
import { SideNav } from "@/components/SideNav";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const courses = await getCourses();
  const sidebarCourses = courses.map((c) => ({ id: c.id, name: c.name, total: c.total }));

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-surface">
      <AppTopNav />
      <div className="flex flex-1 min-h-0 overflow-hidden">
        <SideNav courses={sidebarCourses} />
        <main className="flex-1 min-w-0 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
