"use client"

import React, { useCallback, useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Filter, Phone, Plus, Save, Search, Trash2, X } from "lucide-react"
import { clearAuthSession } from "@/lib/auth-client"
import { ApiError, apiRequest } from "@/lib/api-client"
import type { Subscription, User } from "@/lib/types"

interface MemberApi {
  id: number
  loginId: string | null
  name: string
  phone: string
  role: string
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

interface MemberFormValues {
  loginId: string
  name: string
  phone: string
  gender: "male" | "female"
  subscriptionId: string
}

function toUser(member: MemberApi): User {
  return {
    id: String(member.id),
    loginId: member.loginId ?? undefined,
    name: member.name,
    phone: member.phone,
    role: member.role === "admin" ? "admin" : "member",
    gender: member.gender,
    registeredAt: member.registeredAt,
    subscriptionId: member.subscriptionId == null ? undefined : String(member.subscriptionId),
  }
}

function toSubscription(plan: SubscriptionApi): Subscription {
  return {
    id: String(plan.id),
    name: plan.name,
    totalLessons: plan.totalLessons,
    remainingLessons: plan.remainingLessons,
    durationMonths: plan.durationMonths,
    price: plan.price,
  }
}

export default function MembersPage() {
  const router = useRouter()
  const [members, setMembers] = useState<User[]>([])
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([])
  const [search, setSearch] = useState("")
  const [genderFilter, setGenderFilter] = useState<"all" | "male" | "female">("all")
  const [showAddModal, setShowAddModal] = useState(false)
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

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

  const loadData = useCallback(async () => {
    try {
      setLoading(true)
      setError("")

      const [memberData, subscriptionData] = await Promise.all([
        apiRequest<MemberApi[]>("/api/v1/members"),
        apiRequest<SubscriptionApi[]>("/api/v1/subscriptions"),
      ])

      setMembers(memberData.map(toUser))
      setSubscriptions(subscriptionData.map(toSubscription))
    } catch (err) {
      handleApiError(err, "회원 목록을 불러오지 못했습니다.")
    } finally {
      setLoading(false)
    }
  }, [handleApiError])

  useEffect(() => {
    loadData()
  }, [loadData])

  const filtered = useMemo(() => {
    return members.filter((m) => {
      const matchSearch =
        m.name.includes(search) || m.phone.includes(search) || (m.loginId ?? "").includes(search)
      const matchGender = genderFilter === "all" || m.gender === genderFilter
      return matchSearch && matchGender
    })
  }, [members, search, genderFilter])

  const selectedMember = useMemo(() => {
    if (!selectedMemberId) return null
    return members.find((member) => member.id === selectedMemberId) ?? null
  }, [members, selectedMemberId])

  const getSubscriptionName = useCallback(
    (id?: string) => {
      if (!id) return "-"
      return subscriptions.find((s) => s.id === id)?.name || "-"
    },
    [subscriptions],
  )

  const handleAddMember = async (formValues: MemberFormValues) => {
    try {
      setSaving(true)
      setError("")

      await apiRequest<MemberApi>("/api/v1/members", {
        method: "POST",
        body: {
          loginId: formValues.loginId || null,
          name: formValues.name,
          phone: formValues.phone,
          gender: formValues.gender === "male" ? "MALE" : "FEMALE",
          subscriptionId: formValues.subscriptionId ? Number(formValues.subscriptionId) : null,
        },
      })

      setShowAddModal(false)
      await loadData()
    } catch (err) {
      handleApiError(err, "회원 추가에 실패했습니다.")
    } finally {
      setSaving(false)
    }
  }

  const handleUpdateMember = async (memberId: string, formValues: MemberFormValues) => {
    try {
      setSaving(true)
      setError("")

      const updated = await apiRequest<MemberApi>(`/api/v1/members/${memberId}`, {
        method: "PATCH",
        body: {
          loginId: formValues.loginId || null,
          name: formValues.name,
          phone: formValues.phone,
          gender: formValues.gender === "male" ? "MALE" : "FEMALE",
          subscriptionId: formValues.subscriptionId ? Number(formValues.subscriptionId) : null,
        },
      })

      const next = toUser(updated)
      setMembers((prev) => prev.map((member) => (member.id === memberId ? next : member)))
      setSelectedMemberId(next.id)
    } catch (err) {
      handleApiError(err, "회원 수정에 실패했습니다.")
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteMember = async (memberId: string) => {
    if (!window.confirm("이 회원을 삭제할까요?")) return

    try {
      setSaving(true)
      setError("")

      await apiRequest<void>(`/api/v1/members/${memberId}`, {
        method: "DELETE",
      })

      setMembers((prev) => prev.filter((member) => member.id !== memberId))
      setSelectedMemberId(null)
    } catch (err) {
      handleApiError(err, "회원 삭제에 실패했습니다.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="mb-4 flex flex-col gap-3 sm:mb-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-serif text-xl font-bold text-foreground sm:text-2xl">회원 관리</h1>
          <p className="mt-1 text-sm text-muted-foreground">총 {members.length}명의 회원</p>
        </div>
        <button
          type="button"
          onClick={() => setShowAddModal(true)}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:opacity-90"
        >
          <Plus className="h-4 w-4" />
          회원 추가
        </button>
      </div>

      <div className="mb-5 flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="이름 또는 전화번호로 검색"
            className="w-full rounded-lg border border-border bg-card py-2.5 pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground/50 transition-colors focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          {(["all", "male", "female"] as const).map((g) => (
            <button
              key={g}
              type="button"
              onClick={() => setGenderFilter(g)}
              className={`rounded-lg border px-3 py-2 text-xs font-medium transition-colors ${
                genderFilter === g
                  ? "border-primary bg-primary/5 text-primary"
                  : "border-border bg-card text-muted-foreground hover:text-foreground"
              }`}
            >
              {g === "all" ? "전체" : g === "male" ? "남성" : "여성"}
            </button>
          ))}
        </div>
      </div>

      {error && <p className="mb-4 text-sm text-destructive">{error}</p>}

      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-secondary/30">
                <th className="px-5 py-3 text-left text-xs font-medium text-muted-foreground">이름</th>
                <th className="px-5 py-3 text-left text-xs font-medium text-muted-foreground">연락처</th>
                <th className="hidden px-5 py-3 text-left text-xs font-medium text-muted-foreground sm:table-cell">성별</th>
                <th className="hidden px-5 py-3 text-left text-xs font-medium text-muted-foreground md:table-cell">수강권</th>
                <th className="hidden px-5 py-3 text-left text-xs font-medium text-muted-foreground lg:table-cell">등록일</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={5} className="px-5 py-12 text-center text-sm text-muted-foreground">
                    불러오는 중...
                  </td>
                </tr>
              )}

              {!loading &&
                filtered.map((member) => (
                  <tr
                    key={member.id}
                    onClick={() => setSelectedMemberId(member.id)}
                    className="cursor-pointer border-b border-border last:border-0 transition-colors hover:bg-secondary/20"
                  >
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-accent text-xs font-bold text-accent-foreground">
                          {member.name.charAt(0)}
                        </div>
                        <span className="text-sm font-medium text-foreground">{member.name}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                        <Phone className="h-3 w-3" />
                        {member.phone}
                      </span>
                    </td>
                    <td className="hidden px-5 py-3.5 sm:table-cell">
                      <span
                        className={`inline-block rounded-md px-2 py-0.5 text-xs font-medium ${
                          member.gender === "female"
                            ? "bg-accent text-accent-foreground"
                            : "bg-secondary text-secondary-foreground"
                        }`}
                      >
                        {member.gender === "female" ? "여" : "남"}
                      </span>
                    </td>
                    <td className="hidden px-5 py-3.5 md:table-cell">
                      <span className="text-sm text-muted-foreground">{getSubscriptionName(member.subscriptionId)}</span>
                    </td>
                    <td className="hidden px-5 py-3.5 lg:table-cell">
                      <span className="text-sm text-muted-foreground">{member.registeredAt}</span>
                    </td>
                  </tr>
                ))}

              {!loading && filtered.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-5 py-12 text-center text-sm text-muted-foreground">
                    검색 결과가 없습니다
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showAddModal && (
        <MemberFormModal
          title="회원 추가"
          submitLabel="추가"
          subscriptions={subscriptions}
          loading={saving}
          onClose={() => setShowAddModal(false)}
          onSubmit={handleAddMember}
        />
      )}

      {selectedMember && (
        <MemberDetailModal
          member={selectedMember}
          subscriptions={subscriptions}
          subscriptionName={getSubscriptionName(selectedMember.subscriptionId)}
          loading={saving}
          onClose={() => setSelectedMemberId(null)}
          onSubmit={(values) => handleUpdateMember(selectedMember.id, values)}
          onDelete={() => handleDeleteMember(selectedMember.id)}
        />
      )}
    </div>
  )
}

function MemberFormModal({
  title,
  submitLabel,
  subscriptions,
  loading,
  initialValues,
  onClose,
  onSubmit,
}: {
  title: string
  submitLabel: string
  subscriptions: Subscription[]
  loading: boolean
  initialValues?: MemberFormValues
  onClose: () => void
  onSubmit: (values: MemberFormValues) => Promise<void> | void
}) {
  const [name, setName] = useState(initialValues?.name ?? "")
  const [phone, setPhone] = useState(initialValues?.phone ?? "")
  const [loginId, setLoginId] = useState(initialValues?.loginId ?? "")
  const [gender, setGender] = useState<"male" | "female">(initialValues?.gender ?? "female")
  const [subscriptionId, setSubscriptionId] = useState(initialValues?.subscriptionId ?? "")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name || !phone) return

    await onSubmit({
      loginId,
      name,
      phone,
      gender,
      subscriptionId,
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-foreground/20 backdrop-blur-sm sm:items-center">
      <div className="w-full max-h-[90vh] overflow-y-auto rounded-t-2xl border border-border bg-card p-5 shadow-lg sm:max-w-md sm:rounded-xl sm:p-6">
        <div className="mb-5 flex items-center justify-between">
          <h3 className="font-serif text-base font-bold text-foreground sm:text-lg">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            aria-label="닫기"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="member-login-id" className="mb-1.5 block text-xs font-medium text-muted-foreground">
              로그인 아이디 (선택)
            </label>
            <input
              id="member-login-id"
              type="text"
              value={loginId}
              onChange={(e) => setLoginId(e.target.value)}
              placeholder="예: member01"
              className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          <div>
            <label htmlFor="member-name" className="mb-1.5 block text-xs font-medium text-muted-foreground">
              이름 *
            </label>
            <input
              id="member-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          <div>
            <label htmlFor="member-phone" className="mb-1.5 block text-xs font-medium text-muted-foreground">
              휴대폰번호 *
            </label>
            <input
              id="member-phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="010-0000-0000"
              required
              className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">성별</label>
            <div className="flex gap-2">
              {(["female", "male"] as const).map((g) => (
                <button
                  key={g}
                  type="button"
                  onClick={() => setGender(g)}
                  className={`flex-1 rounded-lg border py-2 text-sm font-medium transition-colors ${
                    gender === g
                      ? "border-primary bg-primary/5 text-primary"
                      : "border-border text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {g === "female" ? "여성" : "남성"}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label htmlFor="member-sub" className="mb-1.5 block text-xs font-medium text-muted-foreground">
              수강권
            </label>
            <select
              id="member-sub"
              value={subscriptionId}
              onChange={(e) => setSubscriptionId(e.target.value)}
              className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="">선택 안함</option>
              {subscriptions.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="flex-1 rounded-lg border border-border py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground disabled:cursor-not-allowed disabled:opacity-60"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 rounded-lg bg-primary py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "처리 중..." : submitLabel}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function MemberDetailModal({
  member,
  subscriptions,
  subscriptionName,
  loading,
  onClose,
  onSubmit,
  onDelete,
}: {
  member: User
  subscriptions: Subscription[]
  subscriptionName: string
  loading: boolean
  onClose: () => void
  onSubmit: (values: MemberFormValues) => Promise<void> | void
  onDelete: () => Promise<void> | void
}) {
  const [editing, setEditing] = useState(false)

  const initialValues: MemberFormValues = {
    loginId: member.loginId ?? "",
    name: member.name,
    phone: member.phone,
    gender: member.gender,
    subscriptionId: member.subscriptionId ?? "",
  }

  if (!editing) {
    return (
      <div className="fixed inset-0 z-50 flex items-end justify-center bg-foreground/20 backdrop-blur-sm sm:items-center">
        <div className="w-full max-h-[90vh] overflow-y-auto rounded-t-2xl border border-border bg-card p-5 shadow-lg sm:max-w-md sm:rounded-xl sm:p-6">
          <div className="mb-5 flex items-center justify-between">
            <h3 className="font-serif text-base font-bold text-foreground sm:text-lg">회원 정보</h3>
            <button
              type="button"
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
              aria-label="닫기"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="mb-5 flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-accent text-lg font-bold text-accent-foreground">
              {member.name.charAt(0)}
            </div>
            <div>
              <p className="text-lg font-bold text-foreground">{member.name}</p>
              <p className="text-sm text-muted-foreground">{member.phone}</p>
            </div>
          </div>

          <div className="space-y-3 rounded-lg border border-border bg-background p-4">
            <InfoRow label="로그인 아이디" value={member.loginId ?? "-"} />
            <InfoRow label="성별" value={member.gender === "female" ? "여성" : "남성"} />
            <InfoRow label="등록일" value={member.registeredAt} />
            <InfoRow label="수강권" value={subscriptionName} />
          </div>

          <div className="mt-5 flex gap-2">
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-primary py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:opacity-90"
            >
              <Save className="h-4 w-4" />
              수정
            </button>
            <button
              type="button"
              onClick={() => {
                void onDelete()
              }}
              disabled={loading}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-destructive/40 py-2.5 text-sm font-medium text-destructive transition-colors hover:bg-destructive/10 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Trash2 className="h-4 w-4" />
              삭제
            </button>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="mt-2 w-full rounded-lg border border-border py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          >
            닫기
          </button>
        </div>
      </div>
    )
  }

  return (
    <MemberFormModal
      title="회원 정보 수정"
      submitLabel="저장"
      subscriptions={subscriptions}
      loading={loading}
      initialValues={initialValues}
      onClose={() => setEditing(false)}
      onSubmit={onSubmit}
    />
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-sm font-medium text-foreground">{value}</span>
    </div>
  )
}
