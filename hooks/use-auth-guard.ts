"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import {
  clearAuthSession,
  getAccessToken,
  getApiBaseUrl,
  getStoredAuthUser,
  type AuthRole,
} from "@/lib/auth-client"

export function useAuthGuard(requiredRole: AuthRole) {
  const router = useRouter()
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function verify() {
      const token = getAccessToken()
      const user = getStoredAuthUser()

      if (!token || !user || user.role !== requiredRole) {
        clearAuthSession()
        router.replace("/")
        return
      }

      try {
        const res = await fetch(`${getApiBaseUrl()}/api/v1/auth/me`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })

        if (!res.ok) {
          clearAuthSession()
          router.replace("/")
          return
        }

        const me = (await res.json()) as { role: AuthRole }
        if (me.role !== requiredRole) {
          clearAuthSession()
          router.replace("/")
          return
        }

        if (!cancelled) setReady(true)
      } catch {
        clearAuthSession()
        router.replace("/")
      }
    }

    verify()
    return () => {
      cancelled = true
    }
  }, [requiredRole, router])

  return ready
}
