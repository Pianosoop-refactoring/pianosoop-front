"use client"

export type AuthRole = "ADMIN" | "MEMBER"

export interface AuthUser {
  id: number
  loginId: string
  name: string
  role: AuthRole
}

const ACCESS_TOKEN_KEY = "accessToken"
const AUTH_USER_KEY = "authUser"

export function getApiBaseUrl() {
  return process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8080"
}

export function getAccessToken() {
  if (typeof window === "undefined") return null
  return localStorage.getItem(ACCESS_TOKEN_KEY)
}

export function getStoredAuthUser(): AuthUser | null {
  if (typeof window === "undefined") return null
  const raw = localStorage.getItem(AUTH_USER_KEY)
  if (!raw) return null

  try {
    return JSON.parse(raw) as AuthUser
  } catch {
    return null
  }
}

export function setAuthSession(accessToken: string, user: AuthUser) {
  localStorage.setItem(ACCESS_TOKEN_KEY, accessToken)
  localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user))
}

export function clearAuthSession() {
  if (typeof window === "undefined") return
  localStorage.removeItem(ACCESS_TOKEN_KEY)
  localStorage.removeItem(AUTH_USER_KEY)
}
