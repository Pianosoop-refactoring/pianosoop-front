"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Check, RefreshCw, X } from "lucide-react"
import {
  clearAuthSession,
  getAccessToken,
  getApiBaseUrl,
} from "@/lib/auth-client"

type SignupRequestStatus = "PENDING" | "APPROVED" | "REJECTED"
type FilterStatus = SignupRequestStatus | "ALL"

interface SignupRequestItem {
  id: number
  loginId: string
  name: string
  gender: "male" | "female" | "unknown"
  phone: string
  status: SignupRequestStatus
  rejectionReason: string | null
  reviewedBy: string | null
  reviewedAt: string | null
  createdAt: string
}

const FILTERS: FilterStatus[] = ["ALL", "PENDING", "APPROVED", "REJECTED"]

export default function SignupRequestsPage() {
  const router = useRouter()
  const [items, setItems] = useState<SignupRequestItem[]>([])
  const [filter, setFilter] = useState<FilterStatus>("PENDING")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [processingId, setProcessingId] = useState<number | null>(null)

  const fetchRequests = async (nextFilter: FilterStatus = filter) => {
    const token = getAccessToken()
    if (!token) {
      router.replace("/")
      return
    }

    try {
      setLoading(true)
      setError("")
      const endpoint =
        nextFilter === "ALL"
          ? `${getApiBaseUrl()}/api/v1/signup-requests`
          : `${getApiBaseUrl()}/api/v1/signup-requests?status=${nextFilter}`

      const res = await fetch(endpoint, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (res.status === 401 || res.status === 403) {
        clearAuthSession()
        router.replace("/")
        return
      }

      if (!res.ok) {
        throw new Error("failed")
      }

      const data = (await res.json()) as SignupRequestItem[]
      setItems(data)
    } catch {
      setError("가입 신청 목록을 불러오지 못했습니다.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchRequests()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleFilterClick = (nextFilter: FilterStatus) => {
    setFilter(nextFilter)
    fetchRequests(nextFilter)
  }

  const approve = async (requestId: number) => {
    const token = getAccessToken()
    if (!token) return

    try {
      setProcessingId(requestId)
      const res = await fetch(
        `${getApiBaseUrl()}/api/v1/signup-requests/${requestId}/approve`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        },
      )

      if (!res.ok) {
        throw new Error("failed")
      }

      await fetchRequests()
    } catch {
      setError("승인 처리에 실패했습니다.")
    } finally {
      setProcessingId(null)
    }
  }

  const reject = async (requestId: number) => {
    const token = getAccessToken()
    if (!token) return

    const reason = window.prompt("거부 사유를 입력하세요. (선택)")
    if (reason === null) return

    try {
      setProcessingId(requestId)
      const res = await fetch(
        `${getApiBaseUrl()}/api/v1/signup-requests/${requestId}/reject`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            reason,
          }),
        },
      )

      if (!res.ok) {
        throw new Error("failed")
      }

      await fetchRequests()
    } catch {
      setError("거부 처리에 실패했습니다.")
    } finally {
      setProcessingId(null)
    }
  }

  const formatDateTime = (value: string | null) => {
    if (!value) return "-"
    return new Date(value).toLocaleString("ko-KR")
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-serif text-xl font-bold text-foreground sm:text-2xl">
            가입 신청 관리
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            회원가입 신청 승인/거부를 처리합니다.
          </p>
        </div>
        <button
          type="button"
          onClick={() => fetchRequests()}
          className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-xs text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          새로고침
        </button>
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        {FILTERS.map((status) => (
          <button
            key={status}
            type="button"
            onClick={() => handleFilterClick(status)}
            className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
              filter === status
                ? "border-primary bg-primary/10 text-primary"
                : "border-border text-muted-foreground hover:bg-secondary hover:text-foreground"
            }`}
          >
            {status === "ALL" && "전체"}
            {status === "PENDING" && "대기"}
            {status === "APPROVED" && "승인"}
            {status === "REJECTED" && "거부"}
          </button>
        ))}
      </div>

      {error && <p className="mb-3 text-sm text-destructive">{error}</p>}

      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px]">
            <thead>
              <tr className="border-b border-border bg-secondary/30">
                <th className="px-4 py-3 text-left text-xs text-muted-foreground">
                  신청일
                </th>
                <th className="px-4 py-3 text-left text-xs text-muted-foreground">
                  아이디
                </th>
                <th className="px-4 py-3 text-left text-xs text-muted-foreground">
                  이름
                </th>
                <th className="px-4 py-3 text-left text-xs text-muted-foreground">
                  성별
                </th>
                <th className="px-4 py-3 text-left text-xs text-muted-foreground">
                  연락처
                </th>
                <th className="px-4 py-3 text-left text-xs text-muted-foreground">
                  상태
                </th>
                <th className="px-4 py-3 text-left text-xs text-muted-foreground">
                  처리정보
                </th>
                <th className="px-4 py-3 text-right text-xs text-muted-foreground">
                  작업
                </th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center text-sm text-muted-foreground">
                    불러오는 중...
                  </td>
                </tr>
              )}

              {!loading && items.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center text-sm text-muted-foreground">
                    신청 내역이 없습니다.
                  </td>
                </tr>
              )}

              {!loading &&
                items.map((item) => {
                  const pending = item.status === "PENDING"
                  return (
                    <tr key={item.id} className="border-b border-border last:border-0">
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {formatDateTime(item.createdAt)}
                      </td>
                      <td className="px-4 py-3 text-sm font-medium text-foreground">
                        {item.loginId}
                      </td>
                      <td className="px-4 py-3 text-sm text-foreground">{item.name}</td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">
                        {item.gender === "female" ? "여성" : item.gender === "male" ? "남성" : "-"}
                      </td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">{item.phone}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`rounded-md px-2 py-1 text-[11px] font-medium ${
                            item.status === "PENDING"
                              ? "bg-[hsl(38,70%,50%)]/10 text-[hsl(38,70%,35%)]"
                              : item.status === "APPROVED"
                                ? "bg-primary/10 text-primary"
                                : "bg-destructive/10 text-destructive"
                          }`}
                        >
                          {item.status === "PENDING" && "대기"}
                          {item.status === "APPROVED" && "승인"}
                          {item.status === "REJECTED" && "거부"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {item.reviewedBy ? `${item.reviewedBy} / ${formatDateTime(item.reviewedAt)}` : "-"}
                        {item.rejectionReason ? ` (사유: ${item.rejectionReason})` : ""}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {pending ? (
                          <div className="inline-flex items-center gap-1">
                            <button
                              type="button"
                              disabled={processingId === item.id}
                              onClick={() => approve(item.id)}
                              className="inline-flex items-center gap-1 rounded-md bg-primary px-2 py-1 text-xs text-primary-foreground transition-colors hover:opacity-90"
                            >
                              <Check className="h-3.5 w-3.5" />
                              승인
                            </button>
                            <button
                              type="button"
                              disabled={processingId === item.id}
                              onClick={() => reject(item.id)}
                              className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                            >
                              <X className="h-3.5 w-3.5" />
                              거부
                            </button>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">처리 완료</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
