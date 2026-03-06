"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import {
  CalendarDays,
  Users,
  FileText,
  Ticket,
  GraduationCap,
  UserPlus,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Menu,
  X,
} from "lucide-react"
import { useState, type MouseEvent } from "react"
import NotificationBell from "@/components/notification-bell"
import { clearAuthSession } from "@/lib/auth-client"

const navItems = [
  { href: "/admin", label: "일정", icon: CalendarDays },
  { href: "/admin/signup-requests", label: "가입신청", icon: UserPlus },
  { href: "/admin/members", label: "회원", icon: Users },
  { href: "/admin/board", label: "게시판", icon: FileText },
  { href: "/admin/subscriptions", label: "수강권", icon: Ticket },
  { href: "/admin/instructors", label: "강사", icon: GraduationCap },
]

function PianoLogo({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" aria-hidden="true">
      <rect x="8" y="28" width="4" height="14" rx="1" fill="hsl(40,30%,85%)" />
      <rect x="14" y="28" width="4" height="14" rx="1" fill="hsl(40,15%,60%)" />
      <rect x="20" y="28" width="4" height="14" rx="1" fill="hsl(40,30%,85%)" />
      <rect x="26" y="28" width="4" height="14" rx="1" fill="hsl(40,15%,60%)" />
      <rect x="32" y="28" width="4" height="14" rx="1" fill="hsl(40,30%,85%)" />
      <rect x="38" y="28" width="4" height="14" rx="1" fill="hsl(40,15%,60%)" />
      <path d="M20 12C20 12 23 9 26 11C29 13 27 18 24 19C21 20 18 17 20 12Z" fill="hsl(40,30%,85%)" opacity="0.7" />
    </svg>
  )
}

function NavList({
  collapsed = false,
  isActive,
  onNavigate,
}: {
  collapsed?: boolean
  isActive: (href: string) => boolean
  onNavigate?: () => void
}) {
  return (
    <ul className="space-y-1">
      {navItems.map((item) => {
        const Icon = item.icon
        const active = isActive(item.href)
        return (
          <li key={item.href}>
            <Link
              href={item.href}
              onClick={onNavigate}
              className={`group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150 ${
                active
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-foreground/60 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
              } ${collapsed ? "justify-center px-0" : ""}`}
              title={collapsed ? item.label : undefined}
            >
              <Icon className={`h-[18px] w-[18px] shrink-0 ${active ? "text-sidebar-primary" : ""}`} />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          </li>
        )
      })}
    </ul>
  )
}

// Mobile header + drawer
export function MobileAdminHeader() {
  const router = useRouter()
  const pathname = usePathname()
  const [drawerOpen, setDrawerOpen] = useState(false)

  const isActive = (href: string) => {
    if (href === "/admin") return pathname === "/admin"
    return pathname.startsWith(href)
  }

  const currentLabel = navItems.find((item) => isActive(item.href))?.label || "피아노숲"

  const handleLogout = (e: MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault()
    clearAuthSession()
    setDrawerOpen(false)
    router.replace("/")
  }

  return (
    <>
      <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-border bg-card px-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            className="flex h-9 w-9 items-center justify-center rounded-lg transition-colors hover:bg-secondary"
            aria-label="메뉴 열기"
          >
            <Menu className="h-5 w-5 text-foreground" />
          </button>
          <span className="font-serif text-base font-bold text-foreground">{currentLabel}</span>
        </div>
        <NotificationBell />
      </header>

      {/* Drawer overlay */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 flex">
          {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions */}
          <div
            className="absolute inset-0 bg-foreground/30"
            onClick={() => setDrawerOpen(false)}
          />
          <aside className="relative z-10 flex h-full w-[260px] flex-col bg-sidebar shadow-xl">
            <div className="flex h-14 items-center justify-between border-b border-sidebar-border px-4">
              <Link
                href="/admin"
                className="flex items-center gap-2"
                onClick={() => setDrawerOpen(false)}
              >
                <PianoLogo size={24} />
                <span className="font-serif text-base font-bold text-sidebar-foreground">피아노숲</span>
              </Link>
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-sidebar-foreground/60 hover:bg-sidebar-accent"
                aria-label="메뉴 닫기"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <nav className="flex-1 px-3 py-4">
              <NavList isActive={isActive} onNavigate={() => setDrawerOpen(false)} />
            </nav>
            <div className="border-t border-sidebar-border p-3">
              <Link
                href="/"
                onClick={handleLogout}
                className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-sidebar-foreground/50 transition-colors hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
              >
                <LogOut className="h-[18px] w-[18px] shrink-0" />
                <span>로그아웃</span>
              </Link>
            </div>
          </aside>
        </div>
      )}
    </>
  )
}

// Desktop sidebar
export default function AdminSidebar() {
  const router = useRouter()
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)

  const isActive = (href: string) => {
    if (href === "/admin") return pathname === "/admin"
    return pathname.startsWith(href)
  }

  const handleLogout = (e: MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault()
    clearAuthSession()
    router.replace("/")
  }

  return (
    <aside
      className={`relative hidden h-screen flex-col border-r border-sidebar-border bg-sidebar transition-all duration-300 lg:flex ${
        collapsed ? "w-[72px]" : "w-[240px]"
      }`}
    >
      {/* Logo + bell */}
      <div className={`flex h-16 items-center border-b border-sidebar-border px-5 ${collapsed ? "justify-center" : "justify-between"}`}>
        {!collapsed && (
          <Link href="/admin" className="flex items-center gap-2.5">
            <PianoLogo />
            <span className="font-serif text-base font-bold text-sidebar-foreground">
              피아노숲
            </span>
          </Link>
        )}
        {collapsed && <PianoLogo size={24} />}
        {!collapsed && (
          <div className="[&_button]:text-sidebar-foreground/60 [&_button]:hover:bg-sidebar-accent">
            <NotificationBell />
          </div>
        )}
      </div>

      {/* Collapse toggle */}
      <button
        type="button"
        onClick={() => setCollapsed(!collapsed)}
        className="absolute -right-3 top-20 z-20 flex h-6 w-6 items-center justify-center rounded-full border border-sidebar-border bg-sidebar text-sidebar-foreground shadow-sm transition-colors hover:bg-sidebar-accent"
        aria-label={collapsed ? "사이드바 펼치기" : "사이드바 접기"}
      >
        {collapsed ? (
          <ChevronRight className="h-3 w-3" />
        ) : (
          <ChevronLeft className="h-3 w-3" />
        )}
      </button>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4">
        <NavList collapsed={collapsed} isActive={isActive} />
      </nav>

      {/* Bottom section */}
      <div className={`border-t border-sidebar-border p-3 ${collapsed ? "flex justify-center" : ""}`}>
        <Link
          href="/"
          onClick={handleLogout}
          className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-sidebar-foreground/50 transition-colors hover:bg-sidebar-accent/50 hover:text-sidebar-foreground ${
            collapsed ? "justify-center px-0" : ""
          }`}
          title={collapsed ? "로그아웃" : undefined}
        >
          <LogOut className="h-[18px] w-[18px] shrink-0" />
          {!collapsed && <span>로그아웃</span>}
        </Link>
      </div>
    </aside>
  )
}
