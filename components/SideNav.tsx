"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/courses", label: "Courses", icon: "history_edu" },
];

const bottomItems = [
  { href: "/settings", label: "Settings", icon: "settings" },
];

export function SideNav() {
  const pathname = usePathname();

  return (
    <aside className="fixed h-screen left-0 w-64 bg-surface-container flex flex-col p-6 gap-8 z-40">
      <div className="flex flex-col gap-1">
        <span className="uppercase tracking-[0.1em] text-[10px] font-semibold text-on-surface-variant">
          ActiveLearn
        </span>
        <h1 className="text-primary font-bold text-lg">Learning Hub</h1>
      </div>

      <nav className="flex flex-col gap-1">
        {navItems.map((item) => {
          const active = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={[
                "px-4 py-3 flex items-center gap-3 rounded-md transition-all duration-200",
                "uppercase tracking-[0.1em] text-[10px] font-semibold",
                active
                  ? "bg-surface-container-lowest text-primary shadow-sm"
                  : "text-on-surface/50 hover:bg-surface-container-low hover:text-on-surface",
              ].join(" ")}
            >
              <span className="material-symbols-outlined text-base">{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto flex flex-col gap-1">
        {bottomItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="text-on-surface/50 px-4 py-3 flex items-center gap-3 hover:bg-surface-container-low rounded-md transition-all duration-200 uppercase tracking-[0.1em] text-[10px] font-semibold"
          >
            <span className="material-symbols-outlined text-base">{item.icon}</span>
            {item.label}
          </Link>
        ))}
      </div>
    </aside>
  );
}
