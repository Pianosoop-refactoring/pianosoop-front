"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { Bell, CalendarPlus, Check, Info, RefreshCw, XCircle } from "lucide-react"
import { clearAuthSession } from "@/lib/auth-client"
import { ApiError, apiRequest } from "@/lib/api-client"
import type { Notification } from "@/lib/types"

interface NotificationApi {
  id: number
  type: string
  title: string
  message: string
  createdAt: string
  read: boolean
}

function toNotificationType(type: string): Notification["type"] {
  if (type === "reservation" || type === "change" || type === "cancel") return type
  return "system"
}

function toNotification(raw: NotificationApi): Notification {
  return {
    id: String(raw.id),
    type: toNotificationType(raw.type),
    title: raw.title,
    message: raw.message,
    createdAt: raw.createdAt,
    read: raw.read,
  }
}

const typeConfig: Record<Notification["type"], { icon: typeof CalendarPlus; color: string }> = {
  reservation: { icon: CalendarPlus, color: "text-primary" },
  change: { icon: RefreshCw, color: "text-[hsl(38,70%,40%)]" },
  cancel: { icon: XCircle, color: "text-destructive" },
  system: { icon: Info, color: "text-muted-foreground" },
}

export default function NotificationBell() {
  const router = useRouter()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [open, setOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [error, setError] = useState("")
  const ref = useRef<HTMLDivElement>(null)

  const unreadCount = notifications.filter((n) => !n.read).length

  const fetchNotifications = async () => {
    try {
      setError("")
      const data = await apiRequest<NotificationApi[]>("/api/v1/notifications")
      setNotifications(data.map(toNotification))
    } catch (err) {
      if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
        clearAuthSession()
        router.replace("/")
        return
      }
      setError("알림을 불러오지 못했습니다.")
    }
  }

  useEffect(() => {
    setMounted(true)
    void fetchNotifications()
  }, [])

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }

    document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [])

  const markAsRead = async (id: string) => {
    try {
      await apiRequest<NotificationApi>(`/api/v1/notifications/${id}/read`, {
        method: "PATCH",
      })
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)))
    } catch (err) {
      if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
        clearAuthSession()
        router.replace("/")
        return
      }
      setError("읽음 처리에 실패했습니다.")
    }
  }

  const markAllAsRead = async () => {
    try {
      await apiRequest<{ updated: number }>("/api/v1/notifications/read-all", {
        method: "PATCH",
      })
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
    } catch (err) {
      if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
        clearAuthSession()
        router.replace("/")
        return
      }
      setError("전체 읽음 처리에 실패했습니다.")
    }
  }

  function formatTimeRelative(dateStr: string) {
    const d = new Date(dateStr)
    const now = new Date()
    const diffMs = now.getTime() - d.getTime()
    const diffH = Math.floor(diffMs / (1000 * 60 * 60))
    const diffD = Math.floor(diffMs / (1000 * 60 * 60 * 24))
    if (diffH < 1) return "방금 전"
    if (diffH < 24) return `${diffH}시간 전`
    if (diffD < 7) return `${diffD}일 전`
    return d.toLocaleDateString("ko-KR")
  }

  function formatTimeStatic(dateStr: string) {
    const d = new Date(dateStr)
    return d.toLocaleDateString("ko-KR", { month: "short", day: "numeric" })
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => {
          setOpen((prev) => !prev)
          if (!open) {
            void fetchNotifications()
          }
        }}
        className="relative flex h-9 w-9 items-center justify-center rounded-lg transition-colors hover:bg-secondary"
        aria-label={`알림 ${unreadCount}개`}
      >
        <Bell className="h-[18px] w-[18px] text-muted-foreground" />
        {unreadCount > 0 && (
          <span className="absolute right-1 top-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">
            {unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-[340px] max-w-[calc(100vw-2rem)] overflow-hidden rounded-xl border border-border bg-card shadow-lg sm:w-[380px]">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <h3 className="text-sm font-bold text-foreground">알림</h3>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  void fetchNotifications()
                }}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                새로고침
              </button>
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    void markAllAsRead()
                  }}
                  className="flex items-center gap-1 text-xs text-primary hover:underline"
                >
                  <Check className="h-3 w-3" />
                  모두 읽음
                </button>
              )}
            </div>
          </div>

          {error && <p className="border-b border-border px-4 py-2 text-xs text-destructive">{error}</p>}

          <div className="max-h-[360px] overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="py-10 text-center text-sm text-muted-foreground">알림이 없습니다</div>
            ) : (
              notifications.map((notification) => {
                const config = typeConfig[notification.type]
                const Icon = config.icon
                return (
                  <div
                    key={notification.id}
                    className={`flex gap-3 border-b border-border/50 px-4 py-3 transition-colors last:border-0 hover:bg-secondary/50 ${
                      !notification.read ? "bg-primary/[0.03]" : ""
                    }`}
                  >
                    <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${config.color}`} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-[13px] font-medium leading-snug text-foreground">{notification.title}</p>
                        {!notification.read && (
                          <button
                            type="button"
                            onClick={() => {
                              void markAsRead(notification.id)
                            }}
                            className="shrink-0 rounded p-0.5 text-muted-foreground hover:text-foreground"
                            aria-label="읽음 처리"
                          >
                            <Check className="h-3 w-3" />
                          </button>
                        )}
                      </div>
                      <p className="mt-0.5 line-clamp-2 text-xs leading-relaxed text-muted-foreground">{notification.message}</p>
                      <span className="mt-1 block text-[11px] text-muted-foreground/50">
                        {mounted ? formatTimeRelative(notification.createdAt) : formatTimeStatic(notification.createdAt)}
                      </span>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>
      )}
    </div>
  )
}
