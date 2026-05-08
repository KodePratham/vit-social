"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo } from "react";

type SiteHeaderProps = {
  userEmail?: string | null;
  onSignOut?: () => void;
  isBusy?: boolean;
};

type NavItem = {
  href: string;
  label: string;
};

const NAV_ITEMS: readonly NavItem[] = [
  { href: "/feed", label: "Feed" },
  { href: "/profile", label: "Profile" },
  { href: "/friends", label: "Friends" },
  { href: "/find-roommate", label: "Roommate" },
  { href: "/exams", label: "Exams" },
];

export function SiteHeader({ userEmail, onSignOut, isBusy = false }: SiteHeaderProps) {
  const pathname = usePathname();

  const activePath = useMemo(() => {
    if (!pathname) {
      return "";
    }
    const match = NAV_ITEMS.find((item) => pathname === item.href || pathname.startsWith(`${item.href}/`));
    return match?.href ?? "";
  }, [pathname]);

  return (
    <header
      className="border-b border-[color:var(--fb-blue-darker)] text-white shadow-[0_1px_0_rgba(0,0,0,0.15)]"
      style={{
        background: "linear-gradient(to bottom, #4c6bb8 0%, #3b5998 55%, #365899 100%)",
        fontFamily: "Tahoma, Lucida Grande, Verdana, Arial, sans-serif",
      }}
    >
      <div className="mx-auto flex max-w-[980px] flex-wrap items-center justify-between gap-y-2 gap-x-3 px-2 py-2 sm:py-3">
        <Link
          href="/"
          className="select-none whitespace-nowrap text-[1.4rem] font-bold leading-none tracking-[-0.5px] text-white no-underline hover:underline sm:text-[1.7rem]"
        >
          vitsocial<span className="font-normal">.xyz</span>
        </Link>

        <nav className="flex flex-wrap items-center justify-end gap-1.5">
          {NAV_ITEMS.map((item) => {
            const isActive = activePath === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className="fb-nav-link"
                aria-current={isActive ? "page" : undefined}
                data-state={isActive ? "active" : undefined}
              >
                {item.label}
              </Link>
            );
          })}

          {userEmail ? (
            <span
              className="hidden max-w-[11rem] truncate rounded border border-white/35 bg-white/10 px-2 text-xs font-semibold leading-[26px] text-white sm:inline"
              title={userEmail}
            >
              {userEmail}
            </span>
          ) : null}

          {onSignOut ? (
            <button
              type="button"
              onClick={onSignOut}
              disabled={isBusy}
              className="fb-nav-link"
            >
              {isBusy ? "..." : "Log out"}
            </button>
          ) : null}
        </nav>
      </div>
    </header>
  );
}
