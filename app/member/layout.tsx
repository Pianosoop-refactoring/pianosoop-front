"use client"

import React from "react"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { CalendarDays, FileText, UserCircle, LogOut } from "lucide-react"
import NotificationBell from "@/components/notification-bell"
import { clearAuthSession } from "@/lib/auth-client"
import { useAuthGuard } from "@/hooks/use-auth-guard"

const tabs = [
  { href: "/member", label: "일정", icon: CalendarDays },
  { href: "/member/board", label: "게시판", icon: FileText },
  { href: "/member/myinfo", label: "내정보", icon: UserCircle },
]

function PianoLogo({ size = 24 }: { size?: number }) {
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

export default function MemberLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const pathname = usePathname()
  const ready = useAuthGuard("MEMBER")

  const handleLogout = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault()
    clearAuthSession()
    router.replace("/")
  }

  const isActive = (href: string) => {
    if (href === "/member") return pathname === "/member"
    return pathname.startsWith(href)
  }

  if (!ready) {
    return (
      <div className="flex h-screen items-center justify-center bg-background text-sm text-muted-foreground">
        인증 확인 중...
      </div>
    )
  }

  return (
    <div className="flex h-screen flex-col bg-background">
      {/* Desktop header */}
      <header className="hidden border-b border-border bg-card sm:block">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-6">
          <div className="flex items-center gap-6">
            <Link href="/member" className="flex items-center gap-2">
              <PianoLogo />
              <span className="font-serif text-base font-bold text-foreground">피아노숲</span>
            </Link>
            <nav className="flex items-center gap-1">
              {tabs.map((tab) => {
                const Icon = tab.icon
                const active = isActive(tab.href)
                return (
                  <Link
                    key={tab.href}
                    href={tab.href}
                    className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                      active
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {tab.label}
                  </Link>
                )
              })}
            </nav>
          </div>
          <div className="flex items-center gap-2">
            <NotificationBell />
            <Link
              href="/"
              onClick={handleLogout}
              className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
              aria-label="로그아웃"
            >
              <LogOut className="h-[18px] w-[18px]" />
            </Link>
          </div>
        </div>
      </header>

      {/* Mobile header */}
      <header className="flex h-14 items-center justify-between border-b border-border bg-card px-4 sm:hidden">
        <Link href="/member" className="flex items-center gap-2">
          <PianoLogo size={22} />
          <span className="font-serif text-sm font-bold text-foreground">피아노숲</span>
        </Link>
        <div className="flex items-center gap-1">
          <NotificationBell />
          <Link
            href="/"
            onClick={handleLogout}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary"
            aria-label="로그아웃"
          >
            <LogOut className="h-4 w-4" />
          </Link>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto pb-16 sm:pb-0">
        {children}
      </main>

      {/* Mobile bottom tab bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 flex items-center border-t border-border bg-card sm:hidden">
        {tabs.map((tab) => {
          const Icon = tab.icon
          const active = isActive(tab.href)
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`flex flex-1 flex-col items-center gap-0.5 py-2.5 text-[10px] font-medium transition-colors ${
                active
                  ? "text-primary"
                  : "text-muted-foreground"
              }`}
            >
              <Icon className="h-5 w-5" />
              <span>{tab.label}</span>
            </Link>
          )
        })}
      </nav>
    </div>
  )
}
