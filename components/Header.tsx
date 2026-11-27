"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navigation = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/courses", label: "Courses" },
  { href: "/courses-client", label: "Courses Client" },
  { href: "/courses-server", label: "Courses Server" },
  { href: "/students", label: "Students" },
  { href: "/reports", label: "Reports" },
];

export default function Header() {
  const pathname = usePathname();
  const routesWithExistingNavigation = ["/", "/login", "/dashboard", "/courses", "/students", "/planner", "/reports", "/attendance", "/course-selection", "/schedule", "/grades", "/teachers"];

  if (routesWithExistingNavigation.includes(pathname)) return null;

  return (
    <header className="site-header">
      <nav className="site-navigation" aria-label="Үндсэн цэс">
        {navigation.map(({ href, label }, index) => (
          <span className="site-navigation-item" key={href}>
            {index > 0 && <span className="site-navigation-divider" aria-hidden="true">|</span>}
            <Link href={href}>{label}</Link>
          </span>
        ))}
      </nav>
    </header>
  );
}
