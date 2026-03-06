"use client"

import Link from "next/link"
import { useState, type FormEvent } from "react"
import { useRouter } from "next/navigation"
import { getApiBaseUrl } from "@/lib/auth-client"

interface SignupRequestResponse {
  id: number
  loginId: string
  status: "PENDING" | "APPROVED" | "REJECTED"
}

export default function SignupPage() {
  const router = useRouter()
  const [loginId, setLoginId] = useState("")
  const [password, setPassword] = useState("")
  const [name, setName] = useState("")
  const [gender, setGender] = useState<"MALE" | "FEMALE">("FEMALE")
  const [phone, setPhone] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError("")
    setSuccess("")

    const normalizedLoginId = loginId.trim()
    const normalizedName = name.trim()
    const normalizedPhone = phone.trim()

    if (!normalizedLoginId || !password || !normalizedName || !normalizedPhone) {
      setError("모든 항목을 입력해주세요.")
      return
    }

    if (password.length < 8) {
      setError("비밀번호는 8자 이상 입력해주세요.")
      return
    }

    try {
      setLoading(true)
      const res = await fetch(`${getApiBaseUrl()}/api/v1/signup-requests`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          loginId: normalizedLoginId,
          password,
          name: normalizedName,
          gender,
          phone: normalizedPhone,
        }),
      })

      if (!res.ok) {
        const payload = (await res.json().catch(() => null)) as
          | { message?: string }
          | null
        setError(payload?.message ?? "회원가입 신청에 실패했습니다.")
        return
      }

      const created = (await res.json()) as SignupRequestResponse
      setSuccess(
        `신청이 접수되었습니다. (신청번호 #${created.id}) 관리자 승인 후 로그인할 수 있어요.`,
      )
      setLoginId("")
      setPassword("")
      setName("")
      setGender("FEMALE")
      setPhone("")
    } catch {
      setError("서버 연결에 실패했습니다. 잠시 후 다시 시도해주세요.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-sm">
        <h1 className="font-serif text-2xl font-bold text-foreground">
          회원가입 신청
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          신청 후 관리자 승인 시 로그인 가능합니다.
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label
              htmlFor="signup-login-id"
              className="mb-1 block text-xs font-medium text-muted-foreground"
            >
              아이디
            </label>
            <input
              id="signup-login-id"
              type="text"
              value={loginId}
              onChange={(e) => setLoginId(e.target.value)}
              required
              className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          <div>
            <label
              htmlFor="signup-password"
              className="mb-1 block text-xs font-medium text-muted-foreground"
            >
              비밀번호
            </label>
            <input
              id="signup-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={8}
              required
              className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
            <p className="mt-1 text-[11px] text-muted-foreground">8자 이상</p>
          </div>

          <div>
            <label
              htmlFor="signup-name"
              className="mb-1 block text-xs font-medium text-muted-foreground"
            >
              이름
            </label>
            <input
              id="signup-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          <div>
            <p className="mb-1 block text-xs font-medium text-muted-foreground">성별</p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setGender("FEMALE")}
                className={`flex-1 rounded-lg border py-2 text-sm font-medium transition-colors ${
                  gender === "FEMALE"
                    ? "border-primary bg-primary/5 text-primary"
                    : "border-border text-muted-foreground hover:text-foreground"
                }`}
              >
                여성
              </button>
              <button
                type="button"
                onClick={() => setGender("MALE")}
                className={`flex-1 rounded-lg border py-2 text-sm font-medium transition-colors ${
                  gender === "MALE"
                    ? "border-primary bg-primary/5 text-primary"
                    : "border-border text-muted-foreground hover:text-foreground"
                }`}
              >
                남성
              </button>
            </div>
          </div>

          <div>
            <label
              htmlFor="signup-phone"
              className="mb-1 block text-xs font-medium text-muted-foreground"
            >
              휴대폰 번호
            </label>
            <input
              id="signup-phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="010-0000-0000"
              required
              className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          {error && <p className="text-xs text-destructive">{error}</p>}
          {success && <p className="text-xs text-primary">{success}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-primary py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:opacity-90"
          >
            {loading ? "신청 중..." : "가입 신청하기"}
          </button>
        </form>

        <div className="mt-5 flex items-center justify-between text-xs">
          <Link
            href="/"
            className="text-muted-foreground transition-colors hover:text-foreground"
          >
            로그인으로 돌아가기
          </Link>
          <button
            type="button"
            onClick={() => router.push("/")}
            className="font-medium text-primary transition-colors hover:opacity-80"
          >
            홈 이동
          </button>
        </div>
      </div>
    </main>
  )
}
