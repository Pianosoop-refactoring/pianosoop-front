"use client"

import React from "react"

import Link from "next/link"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Eye, EyeOff } from "lucide-react"
import {
  clearAuthSession,
  getApiBaseUrl,
  getStoredAuthUser,
  setAuthSession,
} from "@/lib/auth-client"

type LoginRole = "admin" | "member"

interface LoginResponse {
  accessToken: string
  tokenType: string
  expiresIn: number
  user: {
    id: number
    loginId: string
    name: string
    role: "ADMIN" | "MEMBER"
  }
}

export default function LoginPage() {
  const router = useRouter()
  const [role, setRole] = useState<LoginRole>("admin")
  const [id, setId] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const user = getStoredAuthUser()
    if (!user) return
    router.replace(user.role === "ADMIN" ? "/admin" : "/member")
  }, [router])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    if (!id || !password) {
      setError("아이디와 비밀번호를 입력해주세요.")
      return
    }

    try {
      setLoading(true)
      const apiBaseUrl = getApiBaseUrl()

      const loginRes = await fetch(`${apiBaseUrl}/api/v1/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          loginId: id,
          password,
        }),
      })

      if (!loginRes.ok) {
        setError("아이디 또는 비밀번호가 올바르지 않습니다.")
        return
      }

      const loginData = (await loginRes.json()) as LoginResponse
      const serverRole = loginData.user.role === "ADMIN" ? "admin" : "member"

      if (serverRole !== role) {
        setError("선택한 로그인 유형과 계정 권한이 다릅니다.")
        return
      }

      setAuthSession(loginData.accessToken, loginData.user)

      const meRes = await fetch(`${apiBaseUrl}/api/v1/auth/me`, {
        headers: {
          Authorization: `Bearer ${loginData.accessToken}`,
        },
      })

      if (!meRes.ok) {
        setError("로그인 검증에 실패했습니다. 다시 시도해주세요.")
        clearAuthSession()
        return
      }

      router.push(serverRole === "admin" ? "/admin" : "/member")
    } catch {
      setError("서버 연결에 실패했습니다. 백엔드 실행 상태를 확인해주세요.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -left-32 -top-32 h-96 w-96 rounded-full bg-primary opacity-[0.03]" />
        <div className="absolute -bottom-48 -right-48 h-[500px] w-[500px] rounded-full bg-[hsl(28,40%,55%)] opacity-[0.04]" />
      </div>

      <div className="relative z-10 w-full max-w-md px-6">
        <div className="mb-10 text-center">
          <div className="mb-5 inline-flex items-center justify-center">
            <svg width="48" height="48" viewBox="0 0 48 48" fill="none" aria-hidden="true">
              <rect x="8" y="28" width="4" height="14" rx="1" fill="hsl(152,32%,28%)" />
              <rect x="14" y="28" width="4" height="14" rx="1" fill="hsl(30,10%,20%)" />
              <rect x="20" y="28" width="4" height="14" rx="1" fill="hsl(152,32%,28%)" />
              <rect x="26" y="28" width="4" height="14" rx="1" fill="hsl(30,10%,20%)" />
              <rect x="32" y="28" width="4" height="14" rx="1" fill="hsl(152,32%,28%)" />
              <rect x="38" y="28" width="4" height="14" rx="1" fill="hsl(30,10%,20%)" />
              <path d="M16 8C16 8 20 4 24 6C28 8 26 14 22 16C18 18 14 14 16 8Z" fill="hsl(152,32%,28%)" opacity="0.6" />
              <path d="M28 6C28 6 32 2 36 5C40 8 37 14 33 15C29 16 26 12 28 6Z" fill="hsl(152,32%,28%)" opacity="0.4" />
              <path d="M20 12C20 12 23 9 26 11C29 13 27 18 24 19C21 20 18 17 20 12Z" fill="hsl(152,32%,28%)" opacity="0.8" />
            </svg>
          </div>
          <h1 className="font-serif text-3xl font-bold tracking-tight text-foreground">
            피아노숲
          </h1>
          <p className="mt-1 text-sm tracking-widest text-muted-foreground">
            PIANO FOREST
          </p>
        </div>

        <div className="mb-6 flex rounded-xl border border-border bg-card p-1">
          <button
            type="button"
            onClick={() => setRole("admin")}
            className={`flex-1 rounded-lg py-2.5 text-sm font-medium transition-all duration-200 ${
              role === "admin"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            관리자
          </button>
          <button
            type="button"
            onClick={() => setRole("member")}
            className={`flex-1 rounded-lg py-2.5 text-sm font-medium transition-all duration-200 ${
              role === "member"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            회원
          </button>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
            <div className="space-y-4">
              <div>
                <label
                  htmlFor="login-id"
                  className="mb-1.5 block text-xs font-medium text-muted-foreground"
                >
                  아이디
                </label>
                <input
                  id="login-id"
                  type="text"
                  value={id}
                  onChange={(e) => setId(e.target.value)}
                  placeholder="아이디를 입력해주세요"
                  className="w-full rounded-lg border border-border bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/50 transition-colors focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div>
                <label
                  htmlFor="login-pw"
                  className="mb-1.5 block text-xs font-medium text-muted-foreground"
                >
                  비밀번호
                </label>
                <div className="relative">
                  <input
                    id="login-pw"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="비밀번호를 입력해주세요"
                    className="w-full rounded-lg border border-border bg-background px-4 py-3 pr-11 text-sm text-foreground placeholder:text-muted-foreground/50 transition-colors focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
                    aria-label={showPassword ? "비밀번호 숨기기" : "비밀번호 보기"}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>
            </div>

            {error && <p className="mt-3 text-xs text-destructive">{error}</p>}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-primary py-3.5 text-sm font-medium text-primary-foreground shadow-sm transition-all duration-200 hover:opacity-90 active:scale-[0.99]"
          >
            {loading ? "로그인 중..." : "로그인"}
          </button>
        </form>

        {role === "member" && (
          <p className="mt-3 text-center text-xs text-muted-foreground">
            계정이 없나요?{" "}
            <Link
              href="/signup"
              className="font-medium text-primary transition-colors hover:opacity-80"
            >
              회원가입 신청
            </Link>
          </p>
        )}

        <p className="mt-8 text-center text-xs text-muted-foreground/60">
          계정 문의는 학원으로 연락해주세요
        </p>
      </div>
    </main>
  )
}
