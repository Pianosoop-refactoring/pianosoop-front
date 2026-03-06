"use client"

import React from "react"
import AdminSidebar, { MobileAdminHeader } from "@/components/admin-sidebar"
import { useAuthGuard } from "@/hooks/use-auth-guard"

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const ready = useAuthGuard("ADMIN")

  if (!ready) {
    return (
      <div className="flex h-screen items-center justify-center bg-background text-sm text-muted-foreground">
        인증 확인 중...
      </div>
    )
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Desktop sidebar */}
      <AdminSidebar />

      {/* Main content area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Mobile header - hidden on lg+ */}
        <div className="lg:hidden">
          <MobileAdminHeader />
        </div>

        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  )
}
