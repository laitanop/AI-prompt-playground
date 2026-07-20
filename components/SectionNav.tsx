"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { sections } from "@/lib/sections";

const STATUS_BADGE: Record<string, string> = {
  done: "✅",
  "in-progress": "🚧",
  planned: "🔒",
};

export default function SectionNav() {
  const pathname = usePathname();

  return (
    <nav className="course-nav">
      <Link href="/" className="course-nav-home">
        🎓 Course Map
      </Link>
      <div className="course-nav-links">
        {sections.map((section) => {
          const isClickable = section.status !== "planned";
          const badge = STATUS_BADGE[section.status];

          if (!isClickable) {
            return (
              <span
                key={section.id}
                className="course-nav-link disabled"
                title="Coming soon"
              >
                {badge} {section.title}
              </span>
            );
          }

          const isActive = pathname === section.href;
          return (
            <Link
              key={section.id}
              href={section.href}
              className={`course-nav-link${isActive ? " active" : ""}`}
            >
              {badge} {section.title}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
