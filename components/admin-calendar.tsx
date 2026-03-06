"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { ChevronLeft, ChevronRight, Clock, Pencil, RefreshCw, Trash2, X } from "lucide-react"
import { clearAuthSession } from "@/lib/auth-client"
import { ApiError, apiRequest } from "@/lib/api-client"
import type { LessonReservation } from "@/lib/types"

const DAYS = ["일", "월", "화", "수", "목", "금", "토"]
const MONTHS = ["1월", "2월", "3월", "4월", "5월", "6월", "7월", "8월", "9월", "10월", "11월", "12월"]

interface ReservationApi {
  id: number
  memberId: string
  memberName: string
  instructorId: string
  instructorName: string
  date: string
  startTime: string
  endTime: string
  type: "lesson" | "practice"
  roomNumber: number | null
  status: "confirmed" | "pending" | "cancelled" | "changed"
}

interface InstructorApi {
  id: number
  name: string
  phone: string
  specialty: string
  registeredAt: string
  color: string
}

interface EditReservationFormValues {
  memberName: string
  date: string
  startTime: string
  endTime: string
  type: "lesson" | "practice"
  roomNumber: string
  instructorId: string
  status: "confirmed" | "pending" | "cancelled" | "changed"
}

function toReservation(raw: ReservationApi): LessonReservation {
  return {
    id: String(raw.id),
    memberId: raw.memberId,
    memberName: raw.memberName,
    instructorId: raw.instructorId,
    instructorName: raw.instructorName,
    date: raw.date,
    startTime: raw.startTime,
    endTime: raw.endTime,
    type: raw.type,
    roomNumber: raw.roomNumber ?? undefined,
    status: raw.status,
  }
}

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate()
}

function getFirstDayOfMonth(year: number, month: number) {
  return new Date(year, month, 1).getDay()
}

function formatDateStr(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`
}

const statusColor: Record<string, string> = {
  confirmed: "bg-primary",
  pending: "bg-[hsl(38,70%,50%)]",
  changed: "bg-[hsl(28,60%,50%)]",
}

function CalendarEmptyIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  )
}

export default function AdminCalendar() {
  const router = useRouter()
  const today = new Date()
  const [currentYear, setCurrentYear] = useState(today.getFullYear())
  const [currentMonth, setCurrentMonth] = useState(today.getMonth())
  const [selectedDate, setSelectedDate] = useState<string>(
    formatDateStr(today.getFullYear(), today.getMonth(), today.getDate()),
  )
  const [reservations, setReservations] = useState<LessonReservation[]>([])
  const [instructors, setInstructors] = useState<InstructorApi[]>([])
  const [editingReservationId, setEditingReservationId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState("")

  const daysInMonth = getDaysInMonth(currentYear, currentMonth)
  const firstDay = getFirstDayOfMonth(currentYear, currentMonth)

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

  const fetchReservations = useCallback(async () => {
    const from = formatDateStr(currentYear, currentMonth, 1)
    const to = formatDateStr(currentYear, currentMonth, daysInMonth)

    try {
      setLoading(true)
      setError("")
      const data = await apiRequest<ReservationApi[]>(`/api/v1/reservations?from=${from}&to=${to}`)
      setReservations(data.map(toReservation))
    } catch (err) {
      handleApiError(err, "예약 목록을 불러오지 못했습니다.")
    } finally {
      setLoading(false)
    }
  }, [currentMonth, currentYear, daysInMonth, handleApiError])

  const fetchInstructors = useCallback(async () => {
    try {
      const data = await apiRequest<InstructorApi[]>("/api/v1/instructors")
      setInstructors(data)
    } catch (err) {
      handleApiError(err, "강사 목록을 불러오지 못했습니다.")
    }
  }, [handleApiError])

  useEffect(() => {
    fetchReservations()
  }, [fetchReservations])

  useEffect(() => {
    void fetchInstructors()
  }, [fetchInstructors])

  const prevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11)
      setCurrentYear(currentYear - 1)
    } else {
      setCurrentMonth(currentMonth - 1)
    }
  }

  const nextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0)
      setCurrentYear(currentYear + 1)
    } else {
      setCurrentMonth(currentMonth + 1)
    }
  }

  const goToToday = () => {
    setCurrentYear(today.getFullYear())
    setCurrentMonth(today.getMonth())
    setSelectedDate(formatDateStr(today.getFullYear(), today.getMonth(), today.getDate()))
  }

  const reservationsByDate = useMemo(() => {
    const grouped: Record<string, LessonReservation[]> = {}

    for (const reservation of reservations) {
      if (!grouped[reservation.date]) grouped[reservation.date] = []
      grouped[reservation.date].push(reservation)
    }

    for (const date in grouped) {
      grouped[date].sort((a, b) => a.startTime.localeCompare(b.startTime))
    }

    return grouped
  }, [reservations])

  const selectedReservations = useMemo(() => {
    return reservationsByDate[selectedDate] ?? []
  }, [reservationsByDate, selectedDate])

  const editingReservation = useMemo(() => {
    if (!editingReservationId) return null
    return reservations.find((reservation) => reservation.id === editingReservationId) ?? null
  }, [editingReservationId, reservations])

  const calendarCells = useMemo(() => {
    const cells: (number | null)[] = []
    for (let i = 0; i < firstDay; i++) cells.push(null)
    for (let d = 1; d <= daysInMonth; d++) cells.push(d)
    return cells
  }, [firstDay, daysInMonth])

  const todayStr = formatDateStr(today.getFullYear(), today.getMonth(), today.getDate())

  const cancelReservation = async (id: string) => {
    if (!window.confirm("이 예약을 취소할까요?")) return

    try {
      setProcessing(true)
      setError("")
      await apiRequest<void>(`/api/v1/reservations/${id}`, { method: "DELETE" })
      setReservations((prev) => prev.filter((reservation) => reservation.id !== id))
    } catch (err) {
      handleApiError(err, "예약 취소에 실패했습니다.")
    } finally {
      setProcessing(false)
    }
  }

  const updateReservation = async (id: string, values: EditReservationFormValues) => {
    try {
      setProcessing(true)
      setError("")

      const selectedInstructor = instructors.find((instructor) => String(instructor.id) === values.instructorId)

      const updated = await apiRequest<ReservationApi>(`/api/v1/reservations/${id}`, {
        method: "PATCH",
        body: {
          memberName: values.memberName.trim(),
          date: values.date,
          startTime: values.startTime,
          endTime: values.endTime,
          type: values.type.toUpperCase(),
          roomNumber: values.type === "practice" ? Number(values.roomNumber) : null,
          instructorId: values.type === "lesson" ? Number(values.instructorId) : null,
          instructorName: values.type === "lesson" ? selectedInstructor?.name ?? "" : null,
          status: values.status.toUpperCase(),
        },
      })

      const next = toReservation(updated)
      setReservations((prev) => prev.map((reservation) => (reservation.id === id ? next : reservation)))
      setEditingReservationId(null)
    } catch (err) {
      handleApiError(err, "예약 수정에 실패했습니다.")
    } finally {
      setProcessing(false)
    }
  }

  return (
    <div className="flex h-full flex-col gap-4 p-4 sm:gap-6 sm:p-6 lg:flex-row lg:p-8">
      <div className="flex-1">
        <div className="mb-4 flex items-center justify-between sm:mb-6">
          <div className="flex items-center gap-2 sm:gap-3">
            <h2 className="font-serif text-lg font-bold text-foreground sm:text-2xl">
              {currentYear}년 {MONTHS[currentMonth]}
            </h2>
            <button
              type="button"
              onClick={goToToday}
              className="rounded-lg border border-border bg-card px-2 py-1 text-[11px] font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground sm:px-3 sm:py-1.5 sm:text-xs"
            >
              오늘
            </button>
            <button
              type="button"
              onClick={() => {
                void fetchReservations()
              }}
              className="inline-flex items-center gap-1 rounded-lg border border-border bg-card px-2 py-1 text-[11px] font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground sm:px-3 sm:py-1.5 sm:text-xs"
            >
              <RefreshCw className="h-3 w-3" />
              새로고침
            </button>
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={prevMonth}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
              aria-label="이전 달"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={nextMonth}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
              aria-label="다음 달"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        {error && <p className="mb-3 text-sm text-destructive">{error}</p>}

        <div className="mb-1 grid grid-cols-7 gap-px sm:mb-2">
          {DAYS.map((day, i) => (
            <div
              key={day}
              className={`py-1 text-center text-[11px] font-medium sm:py-2 sm:text-xs ${
                i === 0 ? "text-destructive/70" : i === 6 ? "text-primary/70" : "text-muted-foreground"
              }`}
            >
              {day}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-px overflow-hidden rounded-xl border border-border bg-border">
          {calendarCells.map((day, idx) => {
            if (day === null) {
              return <div key={`empty-${idx}`} className="min-h-[52px] bg-card/50 sm:min-h-[80px] lg:min-h-[100px]" />
            }

            const dateStr = formatDateStr(currentYear, currentMonth, day)
            const dayReservations = reservationsByDate[dateStr] ?? []
            const isToday = dateStr === todayStr
            const isSelected = dateStr === selectedDate
            const dayOfWeek = (firstDay + day - 1) % 7

            return (
              <button
                key={dateStr}
                type="button"
                onClick={() => setSelectedDate(dateStr)}
                className={`group relative min-h-[52px] bg-card p-1 text-left transition-colors hover:bg-secondary/50 sm:min-h-[80px] sm:p-1.5 lg:min-h-[100px] lg:p-2 ${
                  isSelected ? "bg-accent/60 ring-1 ring-inset ring-primary/20" : ""
                }`}
              >
                <span
                  className={`inline-flex h-5 w-5 items-center justify-center rounded-full text-[11px] sm:h-7 sm:w-7 sm:text-sm ${
                    isToday
                      ? "bg-primary font-bold text-primary-foreground"
                      : dayOfWeek === 0
                        ? "font-medium text-destructive/80"
                        : dayOfWeek === 6
                          ? "font-medium text-primary/80"
                          : "font-medium text-foreground"
                  }`}
                >
                  {day}
                </span>

                {dayReservations.length > 0 && (
                  <div className="mt-0.5 flex flex-wrap gap-0.5 sm:hidden">
                    {dayReservations.slice(0, 4).map((r) => (
                      <span
                        key={r.id}
                        className={`h-1.5 w-1.5 rounded-full ${statusColor[r.status] || "bg-muted-foreground"}`}
                      />
                    ))}
                    {dayReservations.length > 4 && (
                      <span className="text-[8px] leading-none text-muted-foreground/50">{`+${dayReservations.length - 4}`}</span>
                    )}
                  </div>
                )}

                <div className="mt-1 hidden space-y-0.5 sm:block">
                  {dayReservations.slice(0, 3).map((r) => (
                    <div key={r.id} className="flex items-center gap-1 truncate rounded px-1 py-0.5">
                      <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${statusColor[r.status] || "bg-muted-foreground"}`} />
                      <span className="truncate text-[10px] leading-tight text-muted-foreground">
                        {r.startTime} {r.memberName}
                      </span>
                    </div>
                  ))}
                  {dayReservations.length > 3 && (
                    <span className="block px-1 text-[10px] text-muted-foreground/60">+{dayReservations.length - 3}건</span>
                  )}
                </div>
              </button>
            )
          })}
        </div>
      </div>

      <div className="w-full shrink-0 lg:w-[320px]">
        <div className="rounded-xl border border-border bg-card">
          <div className="border-b border-border px-4 py-3 sm:px-5 sm:py-4">
            <h3 className="text-sm font-bold text-foreground">{selectedDate.replace(/-/g, ". ")}</h3>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {selectedReservations.length > 0 ? `${selectedReservations.length}건의 예약` : "예약 없음"}
            </p>
          </div>

          <div className="max-h-[400px] overflow-y-auto p-2 sm:p-3 lg:max-h-[500px]">
            {loading ? (
              <div className="py-10 text-center text-sm text-muted-foreground">불러오는 중...</div>
            ) : selectedReservations.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center sm:py-12">
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-secondary sm:h-12 sm:w-12">
                  <CalendarEmptyIcon className="h-4 w-4 text-muted-foreground/50 sm:h-5 sm:w-5" />
                </div>
                <p className="text-xs text-muted-foreground/60 sm:text-sm">이 날짜에는 예약이 없습니다</p>
              </div>
            ) : (
              <div className="space-y-2">
                {selectedReservations.map((r) => (
                  <div
                    key={r.id}
                    className="rounded-lg border border-border bg-background p-3 transition-colors hover:bg-secondary/30 sm:p-3.5"
                  >
                    <div className="mb-2 flex items-center justify-between">
                      <span className="text-[13px] font-bold text-foreground sm:text-sm">{r.memberName}</span>
                      <span
                        className={`rounded-md px-2 py-0.5 text-[10px] font-medium ${
                          r.status === "confirmed"
                            ? "bg-primary/10 text-primary"
                            : r.status === "pending"
                              ? "bg-[hsl(38,70%,50%)]/10 text-[hsl(38,70%,40%)]"
                              : "bg-[hsl(28,60%,50%)]/10 text-[hsl(28,60%,40%)]"
                        }`}
                      >
                        {r.status === "confirmed" ? "확정" : r.status === "pending" ? "대기" : "변경"}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground sm:gap-4">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {r.startTime} - {r.endTime}
                      </span>
                      {r.type === "lesson" && <span>{r.instructorName}</span>}
                      {r.type === "practice" && r.roomNumber && <span>{r.roomNumber}번 연습실</span>}
                    </div>
                    <div className="mt-2 flex items-center justify-between">
                      <span
                        className={`text-[10px] font-medium ${
                          r.type === "lesson" ? "text-primary" : "text-muted-foreground"
                        }`}
                      >
                        {r.type === "lesson" ? "레슨" : "연습실"}
                      </span>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => setEditingReservationId(r.id)}
                          disabled={processing}
                          className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-[10px] font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          <Pencil className="h-3 w-3" />
                          수정
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            void cancelReservation(r.id)
                          }}
                          disabled={processing}
                          className="inline-flex items-center gap-1 rounded-md border border-destructive/40 px-2 py-1 text-[10px] font-medium text-destructive transition-colors hover:bg-destructive/10 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          <Trash2 className="h-3 w-3" />
                          취소
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {editingReservation && (
        <EditReservationModal
          reservation={editingReservation}
          instructors={instructors}
          loading={processing}
          onClose={() => setEditingReservationId(null)}
          onSubmit={(values) => {
            void updateReservation(editingReservation.id, values)
          }}
        />
      )}
    </div>
  )
}

function EditReservationModal({
  reservation,
  instructors,
  loading,
  onClose,
  onSubmit,
}: {
  reservation: LessonReservation
  instructors: InstructorApi[]
  loading: boolean
  onClose: () => void
  onSubmit: (values: EditReservationFormValues) => void
}) {
  const [memberName, setMemberName] = useState(reservation.memberName)
  const [date, setDate] = useState(reservation.date)
  const [startTime, setStartTime] = useState(reservation.startTime)
  const [endTime, setEndTime] = useState(reservation.endTime)
  const [type, setType] = useState<"lesson" | "practice">(reservation.type)
  const [roomNumber, setRoomNumber] = useState(reservation.roomNumber ? String(reservation.roomNumber) : "1")
  const [instructorId, setInstructorId] = useState(reservation.instructorId || (instructors[0] ? String(instructors[0].id) : ""))
  const [status, setStatus] = useState<"confirmed" | "pending" | "cancelled" | "changed">(reservation.status)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!memberName.trim() || !date || !startTime || !endTime) return
    if (type === "practice" && !roomNumber) return
    if (type === "lesson" && !instructorId) return

    onSubmit({
      memberName: memberName.trim(),
      date,
      startTime,
      endTime,
      type,
      roomNumber,
      instructorId,
      status,
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-foreground/20 backdrop-blur-sm sm:items-center">
      <div className="w-full max-h-[90vh] overflow-y-auto rounded-t-2xl border border-border bg-card p-5 shadow-lg sm:max-w-md sm:rounded-xl sm:p-6">
        <div className="mb-5 flex items-center justify-between">
          <h3 className="font-serif text-base font-bold text-foreground sm:text-lg">예약 수정</h3>
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
            <label className="mb-1 block text-xs font-medium text-muted-foreground">회원명</label>
            <input
              type="text"
              value={memberName}
              onChange={(e) => setMemberName(e.target.value)}
              required
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">날짜</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">상태</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as EditReservationFormValues["status"])}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="confirmed">확정</option>
                <option value="pending">대기</option>
                <option value="changed">변경</option>
                <option value="cancelled">취소</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">시작</label>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                required
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">종료</label>
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                required
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">유형</label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setType("lesson")}
                className={`flex-1 rounded-lg border py-2 text-sm font-medium transition-colors ${
                  type === "lesson"
                    ? "border-primary bg-primary/5 text-primary"
                    : "border-border text-muted-foreground hover:text-foreground"
                }`}
              >
                레슨
              </button>
              <button
                type="button"
                onClick={() => setType("practice")}
                className={`flex-1 rounded-lg border py-2 text-sm font-medium transition-colors ${
                  type === "practice"
                    ? "border-primary bg-primary/5 text-primary"
                    : "border-border text-muted-foreground hover:text-foreground"
                }`}
              >
                연습실
              </button>
            </div>
          </div>

          {type === "lesson" ? (
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">강사</label>
              <select
                value={instructorId}
                onChange={(e) => setInstructorId(e.target.value)}
                required
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              >
                {instructors.length === 0 && <option value="">강사 없음</option>}
                {instructors.map((inst) => (
                  <option key={inst.id} value={inst.id}>
                    {inst.name}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">연습실 번호</label>
              <input
                type="number"
                min={1}
                max={10}
                value={roomNumber}
                onChange={(e) => setRoomNumber(e.target.value)}
                required
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          )}

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
              {loading ? "저장 중..." : "저장"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
