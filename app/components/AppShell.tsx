"use client";

import Link from "next/link";

import BrandMark from "@/app/components/BrandMark";
import UiIcon from "@/app/components/UiIcon";

type AppTab = "EXPLORE" | "SAVED" | "PROFILE";

const navigation: Array<{
  tab: AppTab;
  href: string;
  label: string;
  icon: "map" | "bookmark" | "profile";
}> = [
  { tab: "EXPLORE", href: "/", label: "탐색", icon: "map" },
  { tab: "SAVED", href: "/saved", label: "저장", icon: "bookmark" },
  { tab: "PROFILE", href: "/profile", label: "내 정보", icon: "profile" },
];

type AppShellProps = {
  activeTab: AppTab;
  userName: string;
  onSignOut: () => void;
  children: React.ReactNode;
};

/** 앱 전 화면의 상단 브랜드·주요 목적지·모바일 하단 탐색을 제공한다. */
export default function AppShell({ activeTab, userName, onSignOut, children }: AppShellProps) {
  const initial = userName.trim().slice(0, 1).toUpperCase() || "Z";

  return (
    <div className="min-h-dvh bg-[var(--canvas)] text-slate-950">
      <header className="sticky top-0 z-[900] border-b border-slate-200/90 bg-[color:var(--canvas-translucent)] backdrop-blur-xl">
        <div className="mx-auto flex h-15 w-full max-w-[1440px] items-center justify-between px-4 sm:h-16 sm:px-6">
          <BrandMark href="/" />
          <nav className="hidden items-center gap-1 md:flex" aria-label="주요 메뉴">
            {navigation.map((item) => (
              <NavLink key={item.tab} {...item} active={activeTab === item.tab} />
            ))}
          </nav>
          <div className="flex items-center gap-2">
            <Link
              href="/profile"
              aria-label={`${userName}님 내 정보`}
              className="focus-ring grid size-10 place-items-center rounded-full bg-slate-950 text-sm font-black text-white transition hover:bg-[var(--accent)]"
            >
              {initial}
            </Link>
            <button
              type="button"
              onClick={onSignOut}
              className="focus-ring hidden min-h-11 items-center gap-2 rounded-xl px-3 text-sm font-bold text-slate-600 transition hover:bg-white hover:text-slate-950 sm:inline-flex"
            >
              <UiIcon name="logout" className="size-4.5" />
              로그아웃
            </button>
          </div>
        </div>
      </header>

      {children}

      <nav className="safe-bottom fixed inset-x-0 bottom-0 z-[1000] border-t border-slate-200 bg-white/96 px-2 backdrop-blur-xl md:hidden" aria-label="주요 메뉴">
        <div className="mx-auto grid max-w-md grid-cols-3">
          {navigation.map((item) => (
            <NavLink key={item.tab} {...item} active={activeTab === item.tab} mobile />
          ))}
        </div>
      </nav>
    </div>
  );
}

function NavLink({
  href,
  label,
  icon,
  active,
  mobile = false,
}: {
  href: string;
  label: string;
  icon: "map" | "bookmark" | "profile";
  active: boolean;
  mobile?: boolean;
  tab?: AppTab;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={mobile
        ? `focus-ring flex min-h-16 flex-col items-center justify-center gap-1 rounded-xl text-[11px] font-bold ${active ? "text-[var(--accent)]" : "text-slate-500"}`
        : `focus-ring inline-flex min-h-11 items-center gap-2 rounded-xl px-4 text-sm font-bold transition ${active ? "bg-slate-950 text-white" : "text-slate-600 hover:bg-white hover:text-slate-950"}`}
    >
      <UiIcon name={icon} className={mobile ? "size-5" : "size-4.5"} />
      {label}
    </Link>
  );
}
