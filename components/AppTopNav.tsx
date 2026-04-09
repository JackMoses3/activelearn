"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const MONO: React.CSSProperties = { fontFamily: "'Geist Mono', monospace" };
const SERIF: React.CSSProperties = { fontFamily: "'Fraunces', serif" };

export function AppTopNav() {
  const pathname = usePathname();

  return (
    <header
      className="h-14 shrink-0 flex items-center gap-6 px-6 z-30"
      style={{
        background: "#ffffff",
        borderBottom: "1px solid rgba(209,195,193,0.2)",
      }}
    >
      <Link
        href="/courses"
        className="text-[15px] font-bold tracking-tight text-primary"
        style={SERIF}
      >
        ActiveLearn
      </Link>

      <nav className="flex items-center">
        {[
          { href: "/courses", label: "Courses" },
          { href: "/setup", label: "Setup" },
          { href: "/settings", label: "Settings" },
        ].map(({ href, label }) => {
          const active = href === "/courses"
            ? pathname.startsWith("/courses")
            : pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={`px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.1em] transition-colors ${
                active
                  ? "text-primary"
                  : "text-on-surface-variant/50 hover:text-on-surface-variant"
              }`}
              style={MONO}
            >
              {label}
            </Link>
          );
        })}
      </nav>

      <div
        className="ml-auto w-7 h-7 rounded-full"
        style={{ background: "#eae8e0" }}
      />
    </header>
  );
}
