"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { clearAuthSession } from "@/lib/auth-client"
import { ApiError, apiRequest } from "@/lib/api-client"

interface MyProfileResponse {
  id: number
  loginId: string
  name: string
  phone: string
  gender: "male" | "female"
  registeredAt: string
  subscriptionId: number | null
}

interface SubscriptionApi {
  id: number
  name: string
  totalLessons: number
  remainingLessons: number
  durationMonths: number
  price: number
}

export default function MemberMyInfoPage() {
  const router = useRouter()
  const [profile, setProfile] = useState<MyProfileResponse | null>(null)
  const [subscriptions, setSubscriptions] = useState<SubscriptionApi[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [name, setName] = useState("")
  const [phone, setPhone] = useState("")
  const [gender, setGender] = useState<"male" | "female">("female")

  const handleApiError = useCallback(
    (err: unknown, fallback: string) => {
      if (err instanceof ApiError) {
        if (err.status === 401 || err.status === 403) {
          clearAuthSession()
          router.replace("/")
          return
        }
        setError(err.message)
        return
      }
      setError(fallback)
    },
    [router],
  )

  const loadProfile = useCallback(async () => {
    try {
      setLoading(true)
      setError("")
      setSuccess("")

      const [profileData, subscriptionData] = await Promise.all([
        apiRequest<MyProfileResponse>("/api/v1/members/me"),
        apiRequest<SubscriptionApi[]>("/api/v1/subscriptions"),
      ])

      setProfile(profileData)
      setName(profileData.name)
      setPhone(profileData.phone)
      setGender(profileData.gender)
      setSubscriptions(subscriptionData)
    } catch (err) {
      handleApiError(err, "내 정보를 불러오지 못했습니다.")
    } finally {
      setLoading(false)
    }
  }, [handleApiError])

  useEffect(() => {
    void loadProfile()
  }, [loadProfile])

  const subscriptionName = useMemo(() => {
    if (!profile?.subscriptionId) return "-"
    return subscriptions.find((s) => s.id === profile.subscriptionId)?.name ?? "-"
  }, [profile?.subscriptionId, subscriptions])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!profile) return

    if (!name.trim() || !phone.trim()) {
      setError("이름과 연락처를 입력해주세요.")
      return
    }

    try {
      setSaving(true)
      setError("")
      setSuccess("")

      const updated = await apiRequest<MyProfileResponse>("/api/v1/members/me", {
        method: "PATCH",
        body: {
          name: name.trim(),
          phone: phone.trim(),
          gender: gender.toUpperCase(),
        },
      })

      setProfile(updated)
      setName(updated.name)
      setPhone(updated.phone)
      setGender(updated.gender)
      setSuccess("내 정보가 수정되었습니다.")
    } catch (err) {
      handleApiError(err, "내 정보 수정에 실패했습니다.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="mx-auto max-w-3xl p-4 sm:p-6">
      <h1 className="mb-4 font-serif text-xl font-bold text-foreground sm:text-2xl">내 정보</h1>

      {loading && <p className="text-sm text-muted-foreground">불러오는 중...</p>}
      {error && <p className="mb-3 text-sm text-destructive">{error}</p>}
      {success && <p className="mb-3 text-sm text-primary">{success}</p>}

      {profile && (
        <form onSubmit={handleSave} className="space-y-4 rounded-xl border border-border bg-card p-5">
          <InfoRow label="로그인 아이디" value={profile.loginId} />
          <InfoRow label="등록일" value={profile.registeredAt} />
          <InfoRow label="수강권" value={subscriptionName} />

          <div>
            <label htmlFor="my-name" className="mb-1 block text-xs font-medium text-muted-foreground">
              이름
            </label>
            <input
              id="my-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          <div>
            <label htmlFor="my-phone" className="mb-1 block text-xs font-medium text-muted-foreground">
              연락처
            </label>
            <input
              id="my-phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
              className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          <div>
            <p className="mb-1 block text-xs font-medium text-muted-foreground">성별</p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setGender("female")}
                className={`flex-1 rounded-lg border py-2 text-sm font-medium transition-colors ${
                  gender === "female"
                    ? "border-primary bg-primary/5 text-primary"
                    : "border-border text-muted-foreground hover:text-foreground"
                }`}
              >
                여성
              </button>
              <button
                type="button"
                onClick={() => setGender("male")}
                className={`flex-1 rounded-lg border py-2 text-sm font-medium transition-colors ${
                  gender === "male"
                    ? "border-primary bg-primary/5 text-primary"
                    : "border-border text-muted-foreground hover:text-foreground"
                }`}
              >
                남성
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="w-full rounded-lg bg-primary py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? "저장 중..." : "수정 저장"}
          </button>
        </form>
      )}
    </div>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-border bg-background px-3 py-2.5">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-sm font-medium text-foreground">{value}</span>
    </div>
  )
}
