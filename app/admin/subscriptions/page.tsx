"use client"

import React, { useCallback, useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Pencil, Plus, Ticket, Trash2, X } from "lucide-react"
import { clearAuthSession } from "@/lib/auth-client"
import { ApiError, apiRequest } from "@/lib/api-client"
import type { Subscription } from "@/lib/types"

interface SubscriptionApi {
  id: number
  name: string
  totalLessons: number
  remainingLessons: number
  durationMonths: number
  price: number
}

interface SubscriptionFormValues {
  name: string
  totalLessons: string
  remainingLessons: string
  durationMonths: string
  price: string
}

function toSubscription(raw: SubscriptionApi): Subscription {
  return {
    id: String(raw.id),
    name: raw.name,
    totalLessons: raw.totalLessons,
    remainingLessons: raw.remainingLessons,
    durationMonths: raw.durationMonths,
    price: raw.price,
  }
}

function formatPrice(price: number) {
  return `${price.toLocaleString("ko-KR")}원`
}

export default function SubscriptionsPage() {
  const router = useRouter()
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([])
  const [showAddModal, setShowAddModal] = useState(false)
  const [selectedSubscriptionId, setSelectedSubscriptionId] = useState<string | null>(null)
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

  const loadSubscriptions = useCallback(async () => {
    try {
      setLoading(true)
      setError("")
      const data = await apiRequest<SubscriptionApi[]>("/api/v1/subscriptions")
      setSubscriptions(data.map(toSubscription))
    } catch (err) {
      handleApiError(err, "수강권 목록을 불러오지 못했습니다.")
    } finally {
      setLoading(false)
    }
  }, [handleApiError])

  useEffect(() => {
    loadSubscriptions()
  }, [loadSubscriptions])

  const selectedSubscription = useMemo(() => {
    if (!selectedSubscriptionId) return null
    return subscriptions.find((subscription) => subscription.id === selectedSubscriptionId) ?? null
  }, [subscriptions, selectedSubscriptionId])

  const createSubscription = async (values: SubscriptionFormValues) => {
    try {
      setSaving(true)
      setError("")

      await apiRequest<SubscriptionApi>("/api/v1/subscriptions", {
        method: "POST",
        body: {
          name: values.name,
          totalLessons: Number(values.totalLessons),
          durationMonths: Number(values.durationMonths),
          price: Number(values.price),
        },
      })

      setShowAddModal(false)
      await loadSubscriptions()
    } catch (err) {
      handleApiError(err, "수강권 추가에 실패했습니다.")
    } finally {
      setSaving(false)
    }
  }

  const updateSubscription = async (subscriptionId: string, values: SubscriptionFormValues) => {
    try {
      setSaving(true)
      setError("")

      const updated = await apiRequest<SubscriptionApi>(`/api/v1/subscriptions/${subscriptionId}`, {
        method: "PATCH",
        body: {
          name: values.name,
          totalLessons: Number(values.totalLessons),
          remainingLessons: Number(values.remainingLessons),
          durationMonths: Number(values.durationMonths),
          price: Number(values.price),
        },
      })

      const next = toSubscription(updated)
      setSubscriptions((prev) => prev.map((subscription) => (subscription.id === subscriptionId ? next : subscription)))
      setSelectedSubscriptionId(next.id)
    } catch (err) {
      handleApiError(err, "수강권 수정에 실패했습니다.")
    } finally {
      setSaving(false)
    }
  }

  const deleteSubscription = async (subscriptionId: string) => {
    if (!window.confirm("이 수강권을 삭제할까요?")) return

    try {
      setSaving(true)
      setError("")

      await apiRequest<void>(`/api/v1/subscriptions/${subscriptionId}`, {
        method: "DELETE",
      })

      setSubscriptions((prev) => prev.filter((subscription) => subscription.id !== subscriptionId))
      setSelectedSubscriptionId(null)
    } catch (err) {
      handleApiError(err, "수강권 삭제에 실패했습니다.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="mb-4 flex flex-col gap-3 sm:mb-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-serif text-xl font-bold text-foreground sm:text-2xl">수강권 관리</h1>
          <p className="mt-1 text-sm text-muted-foreground">회원 등록 시 부여할 수강권을 관리합니다</p>
        </div>
        <button
          type="button"
          onClick={() => setShowAddModal(true)}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:opacity-90"
        >
          <Plus className="h-4 w-4" />
          수강권 추가
        </button>
      </div>

      {error && <p className="mb-4 text-sm text-destructive">{error}</p>}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {loading && (
          <div className="col-span-full py-12 text-center text-sm text-muted-foreground">불러오는 중...</div>
        )}

        {!loading &&
          subscriptions.map((sub) => (
            <div
              key={sub.id}
              className="group relative overflow-hidden rounded-xl border border-border bg-card transition-shadow hover:shadow-md"
            >
              <div className="h-1 w-full bg-primary" />

              <div className="p-5">
                <div className="mb-4 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="mb-1 flex items-center gap-2">
                      <Ticket className="h-4 w-4 text-primary" />
                      <h3 className="truncate text-sm font-bold text-foreground">{sub.name}</h3>
                    </div>
                    <p className="text-xs text-muted-foreground">{sub.durationMonths}개월</p>
                  </div>
                  <span className="font-serif text-lg font-bold text-foreground">{formatPrice(sub.price)}</span>
                </div>

                <div className="space-y-2.5 rounded-lg border border-border bg-background p-3.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">총 레슨 횟수</span>
                    <span className="text-sm font-bold text-foreground">{sub.totalLessons}회</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">잔여 횟수</span>
                    <span className="text-sm font-medium text-foreground">{sub.remainingLessons}회</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">회당 가격</span>
                    <span className="text-sm font-medium text-muted-foreground">
                      {sub.totalLessons > 0 ? formatPrice(Math.round(sub.price / sub.totalLessons)) : "-"}
                    </span>
                  </div>
                </div>

                <div className="mt-3 flex gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedSubscriptionId(sub.id)}
                    className="flex flex-1 items-center justify-center gap-1 rounded-lg border border-border py-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                    수정
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      void deleteSubscription(sub.id)
                    }}
                    disabled={saving}
                    className="flex flex-1 items-center justify-center gap-1 rounded-lg border border-destructive/40 py-2 text-xs font-medium text-destructive transition-colors hover:bg-destructive/10 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    삭제
                  </button>
                </div>
              </div>
            </div>
          ))}
      </div>

      {showAddModal && (
        <SubscriptionFormModal
          title="수강권 추가"
          submitLabel="추가"
          loading={saving}
          showRemainingLessons={false}
          onClose={() => setShowAddModal(false)}
          onSubmit={createSubscription}
        />
      )}

      {selectedSubscription && (
        <SubscriptionFormModal
          title="수강권 수정"
          submitLabel="저장"
          loading={saving}
          showRemainingLessons
          initialValues={{
            name: selectedSubscription.name,
            totalLessons: String(selectedSubscription.totalLessons),
            remainingLessons: String(selectedSubscription.remainingLessons),
            durationMonths: String(selectedSubscription.durationMonths),
            price: String(selectedSubscription.price),
          }}
          onClose={() => setSelectedSubscriptionId(null)}
          onSubmit={(values) => updateSubscription(selectedSubscription.id, values)}
        />
      )}
    </div>
  )
}

function SubscriptionFormModal({
  title,
  submitLabel,
  loading,
  showRemainingLessons,
  initialValues,
  onClose,
  onSubmit,
}: {
  title: string
  submitLabel: string
  loading: boolean
  showRemainingLessons: boolean
  initialValues?: SubscriptionFormValues
  onClose: () => void
  onSubmit: (values: SubscriptionFormValues) => Promise<void> | void
}) {
  const [name, setName] = useState(initialValues?.name ?? "")
  const [totalLessons, setTotalLessons] = useState(initialValues?.totalLessons ?? "")
  const [remainingLessons, setRemainingLessons] = useState(
    initialValues?.remainingLessons ?? initialValues?.totalLessons ?? "",
  )
  const [durationMonths, setDurationMonths] = useState(initialValues?.durationMonths ?? "")
  const [price, setPrice] = useState(initialValues?.price ?? "")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name || !totalLessons || !durationMonths || !price) return

    await onSubmit({
      name,
      totalLessons,
      remainingLessons,
      durationMonths,
      price,
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
            <label htmlFor="sub-name" className="mb-1.5 block text-xs font-medium text-muted-foreground">
              수강권 이름 *
            </label>
            <input
              id="sub-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="예: 기본반 (주1회)"
              required
              className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="sub-lessons" className="mb-1.5 block text-xs font-medium text-muted-foreground">
                레슨 횟수 *
              </label>
              <input
                id="sub-lessons"
                type="number"
                min="1"
                value={totalLessons}
                onChange={(e) => setTotalLessons(e.target.value)}
                placeholder="4"
                required
                className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            <div>
              <label htmlFor="sub-months" className="mb-1.5 block text-xs font-medium text-muted-foreground">
                기간 (개월) *
              </label>
              <input
                id="sub-months"
                type="number"
                min="1"
                value={durationMonths}
                onChange={(e) => setDurationMonths(e.target.value)}
                placeholder="1"
                required
                className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>

          {showRemainingLessons && (
            <div>
              <label htmlFor="sub-remaining" className="mb-1.5 block text-xs font-medium text-muted-foreground">
                잔여 횟수
              </label>
              <input
                id="sub-remaining"
                type="number"
                min="0"
                value={remainingLessons}
                onChange={(e) => setRemainingLessons(e.target.value)}
                placeholder="4"
                className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          )}

          <div>
            <label htmlFor="sub-price" className="mb-1.5 block text-xs font-medium text-muted-foreground">
              가격 (원) *
            </label>
            <input
              id="sub-price"
              type="number"
              min="0"
              step="1000"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="200000"
              required
              className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
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
