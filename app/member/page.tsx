"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { ChevronLeft, ChevronRight, Clock, DoorOpen, Music, X } from "lucide-react"
import { clearAuthSession, getStoredAuthUser } from "@/lib/auth-client"
import { ApiError, apiRequest } from "@/lib/api-client"
import type { Instructor, LessonReservation } from "@/lib/types"

const DAYS = ["일", "월", "화", "수", "목", "금", "토"]
const MONTHS = ["1월", "2월", "3월", "4월", "5월", "6월", "7월", "8월", "9월", "10월", "11월", "12월"]
const TIME_SLOTS = Array.from({ length: 11 }, (_, i) => {
  const h = 11 + i
  return { start: `${h}:00`, end: `${h + 1}:00`, label: `${h}:00` }
})
const ROOMS = Array.from({ length: 10 }, (_, i) => i + 1)

type ReservationType = "practice" | "lesson"
type BookingStep = "select-type" | "select-time" | "select-room" | "select-instructor" | "confirm"

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

interface AvailabilityRoomsResponse {
  date: string
  time: string
  occupiedRooms: number[]
}

interface AvailabilityInstructorsResponse {
  date: string
  time: string
  occupiedInstructorIds: number[]
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

function toInstructor(raw: InstructorApi): Instructor {
  return {
    id: String(raw.id),
    name: raw.name,
    phone: raw.phone,
    specialty: raw.specialty,
    registeredAt: raw.registeredAt,
    color: raw.color,
  }
}

function getDaysInMonth(y: number, m: number) {
  return new Date(y, m + 1, 0).getDate()
}

function getFirstDayOfMonth(y: number, m: number) {
  return new Date(y, m, 1).getDay()
}

function fmtDate(y: number, m: number, d: number) {
  return `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`
}

export default function MemberSchedulePage() {
  const router = useRouter()
  const today = new Date()
  const [year, setYear] = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth())
  const [selectedDate, setSelectedDate] = useState(fmtDate(today.getFullYear(), today.getMonth(), today.getDate()))

  const [bookingOpen, setBookingOpen] = useState(false)
  const [bookingStep, setBookingStep] = useState<BookingStep>("select-type")
  const [reservationType, setReservationType] = useState<ReservationType>("practice")
  const [selectedTime, setSelectedTime] = useState("")
  const [selectedRoom, setSelectedRoom] = useState<number | null>(null)
  const [selectedInstructor, setSelectedInstructor] = useState("")

  const [reservations, setReservations] = useState<LessonReservation[]>([])
  const [instructors, setInstructors] = useState<Instructor[]>([])
  const [occupiedRoomsByTime, setOccupiedRoomsByTime] = useState<Record<string, number[]>>({})
  const [occupiedInstructorIdsByTime, setOccupiedInstructorIdsByTime] = useState<Record<string, number[]>>({})

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [availabilityLoading, setAvailabilityLoading] = useState(false)
  const [error, setError] = useState("")
  const [bookingError, setBookingError] = useState("")

  const authUser = getStoredAuthUser()

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

  const fetchMonthReservations = useCallback(
    async (targetYear: number, targetMonth: number) => {
      const from = fmtDate(targetYear, targetMonth, 1)
      const to = fmtDate(targetYear, targetMonth, getDaysInMonth(targetYear, targetMonth))

      try {
        setLoading(true)
        setError("")
        const data = await apiRequest<ReservationApi[]>(`/api/v1/reservations?from=${from}&to=${to}&mine=true`)
        setReservations(data.map(toReservation))
      } catch (err) {
        handleApiError(err, "예약 목록을 불러오지 못했습니다.")
      } finally {
        setLoading(false)
      }
    },
    [handleApiError],
  )

  const fetchInstructors = useCallback(async () => {
    try {
      const data = await apiRequest<InstructorApi[]>("/api/v1/instructors")
      setInstructors(data.map(toInstructor))
    } catch (err) {
      handleApiError(err, "강사 목록을 불러오지 못했습니다.")
    }
  }, [handleApiError])

  useEffect(() => {
    void fetchMonthReservations(year, month)
  }, [fetchMonthReservations, month, year])

  useEffect(() => {
    void fetchInstructors()
  }, [fetchInstructors])

  useEffect(() => {
    if (!bookingOpen || bookingStep !== "select-time" || reservationType !== "practice") return

    let cancelled = false

    const loadRoomAvailability = async () => {
      try {
        setAvailabilityLoading(true)
        setBookingError("")

        const responses = await Promise.all(
          TIME_SLOTS.map((slot) =>
            apiRequest<AvailabilityRoomsResponse>(
              `/api/v1/availability/rooms?date=${selectedDate}&time=${encodeURIComponent(slot.start)}`,
            ),
          ),
        )

        if (cancelled) return

        const map: Record<string, number[]> = {}
        for (const item of responses) {
          map[item.time] = item.occupiedRooms
        }
        setOccupiedRoomsByTime(map)
      } catch (err) {
        if (!cancelled) {
          if (err instanceof ApiError) {
            setBookingError(err.message)
          } else {
            setBookingError("연습실 가용 정보를 불러오지 못했습니다.")
          }
        }
      } finally {
        if (!cancelled) setAvailabilityLoading(false)
      }
    }

    void loadRoomAvailability()

    return () => {
      cancelled = true
    }
  }, [bookingOpen, bookingStep, reservationType, selectedDate])

  useEffect(() => {
    if (!bookingOpen || bookingStep !== "select-time" || reservationType !== "lesson" || !selectedInstructor) {
      return
    }

    let cancelled = false

    const loadInstructorAvailability = async () => {
      try {
        setAvailabilityLoading(true)
        setBookingError("")

        const responses = await Promise.all(
          TIME_SLOTS.map((slot) =>
            apiRequest<AvailabilityInstructorsResponse>(
              `/api/v1/availability/instructors?date=${selectedDate}&time=${encodeURIComponent(slot.start)}`,
            ),
          ),
        )

        if (cancelled) return

        const map: Record<string, number[]> = {}
        for (const item of responses) {
          map[item.time] = item.occupiedInstructorIds
        }
        setOccupiedInstructorIdsByTime(map)
      } catch (err) {
        if (!cancelled) {
          if (err instanceof ApiError) {
            setBookingError(err.message)
          } else {
            setBookingError("강사 가용 정보를 불러오지 못했습니다.")
          }
        }
      } finally {
        if (!cancelled) setAvailabilityLoading(false)
      }
    }

    void loadInstructorAvailability()

    return () => {
      cancelled = true
    }
  }, [bookingOpen, bookingStep, reservationType, selectedDate, selectedInstructor])

  const myReservations = useMemo(() => {
    return reservations
      .filter((r) => r.date === selectedDate && r.status !== "cancelled")
      .sort((a, b) => a.startTime.localeCompare(b.startTime))
  }, [reservations, selectedDate])

  const daysInMonth = getDaysInMonth(year, month)
  const firstDay = getFirstDayOfMonth(year, month)
  const todayStr = fmtDate(today.getFullYear(), today.getMonth(), today.getDate())

  const cells = useMemo(() => {
    const c: (number | null)[] = []
    for (let i = 0; i < firstDay; i++) c.push(null)
    for (let d = 1; d <= daysInMonth; d++) c.push(d)
    return c
  }, [firstDay, daysInMonth])

  const reservationCountByDate = useMemo(() => {
    const map: Record<string, number> = {}
    for (const reservation of reservations) {
      if (reservation.status === "cancelled") continue
      map[reservation.date] = (map[reservation.date] ?? 0) + 1
    }
    return map
  }, [reservations])

  const prevMonth = () => {
    if (month === 0) {
      setMonth(11)
      setYear(year - 1)
    } else {
      setMonth(month - 1)
    }
  }

  const nextMonth = () => {
    if (month === 11) {
      setMonth(0)
      setYear(year + 1)
    } else {
      setMonth(month + 1)
    }
  }

  const openBooking = () => {
    setBookingError("")
    setBookingStep("select-type")
    setReservationType("practice")
    setSelectedTime("")
    setSelectedRoom(null)
    setSelectedInstructor("")
    setOccupiedRoomsByTime({})
    setOccupiedInstructorIdsByTime({})
    setBookingOpen(true)
  }

  const getOccupiedRooms = (time: string) => occupiedRoomsByTime[time] ?? []

  const isInstructorOccupied = (time: string, instructorId: string) => {
    const occupied = occupiedInstructorIdsByTime[time] ?? []
    return occupied.includes(Number(instructorId))
  }

  const confirmBooking = async () => {
    try {
      if (!selectedTime) {
        setBookingError("시간을 선택해주세요.")
        return
      }

      if (reservationType === "practice" && !selectedRoom) {
        setBookingError("연습실을 선택해주세요.")
        return
      }

      if (reservationType === "lesson" && !selectedInstructor) {
        setBookingError("강사를 선택해주세요.")
        return
      }

      const endTime = `${parseInt(selectedTime, 10) + 1}:00`
      const selectedInstructorInfo = instructors.find((inst) => inst.id === selectedInstructor)

      await apiRequest<ReservationApi>("/api/v1/reservations", {
        method: "POST",
        body: {
          date: selectedDate,
          startTime: selectedTime,
          endTime,
          type: reservationType === "practice" ? "PRACTICE" : "LESSON",
          roomNumber: reservationType === "practice" ? selectedRoom : null,
          instructorId: reservationType === "lesson" ? Number(selectedInstructor) : null,
          instructorName: reservationType === "lesson" ? selectedInstructorInfo?.name ?? "" : null,
        },
      })

      setBookingOpen(false)
      setBookingError("")
      await fetchMonthReservations(year, month)
    } catch (err) {
      if (err instanceof ApiError) {
        setBookingError(err.message)
      } else {
        setBookingError("예약 생성에 실패했습니다.")
      }
    }
  }

  const cancelReservation = async (reservationId: string) => {
    if (!window.confirm("이 예약을 취소할까요?")) return

    try {
      setSaving(true)
      setError("")
      await apiRequest<void>(`/api/v1/reservations/${reservationId}`, {
        method: "DELETE",
      })
      setReservations((prev) => prev.filter((reservation) => reservation.id !== reservationId))
    } catch (err) {
      handleApiError(err, "예약 취소에 실패했습니다.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="mx-auto max-w-3xl p-4 sm:p-6">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-serif text-lg font-bold text-foreground sm:text-xl">
          {year}년 {MONTHS[month]}
        </h2>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => {
              setYear(today.getFullYear())
              setMonth(today.getMonth())
              setSelectedDate(todayStr)
            }}
            className="mr-1 rounded-lg border border-border px-2 py-1 text-[11px] font-medium text-muted-foreground hover:bg-secondary hover:text-foreground sm:px-3 sm:text-xs"
          >
            오늘
          </button>
          <button
            type="button"
            onClick={prevMonth}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground"
            aria-label="이전 달"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={nextMonth}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground"
            aria-label="다음 달"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {error && <p className="mb-3 text-sm text-destructive">{error}</p>}

      <div className="mb-1 grid grid-cols-7">
        {DAYS.map((day, i) => (
          <div
            key={day}
            className={`py-1.5 text-center text-[11px] font-medium sm:text-xs ${
              i === 0 ? "text-destructive/70" : i === 6 ? "text-primary/70" : "text-muted-foreground"
            }`}
          >
            {day}
          </div>
        ))}
      </div>

      <div className="mb-4 grid grid-cols-7 gap-1 sm:mb-6 sm:gap-1.5">
        {cells.map((day, idx) => {
          if (day === null) return <div key={`e-${idx}`} className="aspect-square" />
          const ds = fmtDate(year, month, day)
          const isToday = ds === todayStr
          const isSelected = ds === selectedDate
          const count = reservationCountByDate[ds] ?? 0
          const dow = (firstDay + day - 1) % 7
          return (
            <button
              key={ds}
              type="button"
              onClick={() => setSelectedDate(ds)}
              className={`relative flex aspect-square flex-col items-center justify-center rounded-xl transition-all ${
                isSelected
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : isToday
                    ? "bg-accent font-bold text-foreground"
                    : dow === 0
                      ? "text-destructive/70 hover:bg-secondary"
                      : dow === 6
                        ? "text-primary/70 hover:bg-secondary"
                        : "text-foreground hover:bg-secondary"
              }`}
            >
              <span className="text-[13px] font-medium sm:text-sm">{day}</span>
              {count > 0 && (
                <span className={`mt-0.5 h-1 w-1 rounded-full ${isSelected ? "bg-primary-foreground" : "bg-primary"}`} />
              )}
            </button>
          )
        })}
      </div>

      <div className="mb-4 flex items-center justify-between rounded-xl border border-border bg-card px-4 py-3">
        <div>
          <p className="text-sm font-bold text-foreground">{selectedDate.replace(/-/g, ". ")}</p>
          <p className="text-xs text-muted-foreground">
            {myReservations.length > 0 ? `${myReservations.length}건의 내 예약` : "예약 없음"}
          </p>
        </div>
        <button
          type="button"
          onClick={openBooking}
          className="rounded-lg bg-primary px-3 py-2 text-xs font-medium text-primary-foreground transition-colors hover:opacity-90 sm:px-4 sm:text-sm"
        >
          예약하기
        </button>
      </div>

      {loading && <p className="mb-3 text-sm text-muted-foreground">불러오는 중...</p>}

      {myReservations.length > 0 && (
        <div className="space-y-2">
          {myReservations.map((r) => (
            <div key={r.id} className="flex items-center gap-3 rounded-xl border border-border bg-card p-3 sm:p-4">
              <div
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg sm:h-10 sm:w-10 ${
                  r.type === "lesson" ? "bg-primary/10" : "bg-accent"
                }`}
              >
                {r.type === "lesson" ? (
                  <Music className="h-4 w-4 text-primary" />
                ) : (
                  <DoorOpen className="h-4 w-4 text-accent-foreground" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-medium text-foreground sm:text-sm">
                  {r.type === "lesson" ? `레슨 - ${r.instructorName}` : `연습실 ${r.roomNumber}번`}
                </p>
                <p className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  {r.startTime} - {r.endTime}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={`shrink-0 rounded-md px-2 py-0.5 text-[10px] font-medium ${
                    r.status === "confirmed"
                      ? "bg-primary/10 text-primary"
                      : "bg-[hsl(38,70%,50%)]/10 text-[hsl(38,70%,40%)]"
                  }`}
                >
                  {r.status === "confirmed" ? "확정" : "대기"}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    void cancelReservation(r.id)
                  }}
                  disabled={saving}
                  className="rounded-md border border-destructive/40 px-2 py-1 text-[10px] font-medium text-destructive transition-colors hover:bg-destructive/10 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  취소
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {bookingOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-foreground/20 backdrop-blur-sm sm:items-center">
          <div className="w-full max-h-[85vh] overflow-y-auto rounded-t-2xl border border-border bg-card shadow-lg sm:max-w-md sm:rounded-xl">
            <div className="sticky top-0 z-10 flex items-center justify-between rounded-t-2xl border-b border-border bg-card px-5 py-4 sm:rounded-t-xl">
              <h3 className="font-serif text-base font-bold text-foreground">
                {bookingStep === "select-type" && "예약 유형 선택"}
                {bookingStep === "select-time" && "시간 선택"}
                {bookingStep === "select-room" && "연습실 선택"}
                {bookingStep === "select-instructor" && "강사 선택"}
                {bookingStep === "confirm" && "예약 확인"}
              </h3>
              <button
                type="button"
                onClick={() => setBookingOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground"
                aria-label="닫기"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-5">
              {bookingError && <p className="mb-3 text-sm text-destructive">{bookingError}</p>}

              {bookingStep === "select-type" && (
                <div className="space-y-3">
                  <p className="mb-4 text-sm text-muted-foreground">{selectedDate.replace(/-/g, ". ")} 예약</p>
                  <button
                    type="button"
                    onClick={() => {
                      setReservationType("practice")
                      setBookingStep("select-time")
                    }}
                    className="flex w-full items-center gap-4 rounded-xl border border-border bg-background p-4 text-left transition-colors hover:bg-secondary/50"
                  >
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-accent">
                      <DoorOpen className="h-5 w-5 text-accent-foreground" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-foreground">연습실 예약</p>
                      <p className="text-xs text-muted-foreground">11:00 ~ 22:00 / 1시간 단위</p>
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setReservationType("lesson")
                      setBookingStep("select-instructor")
                    }}
                    className="flex w-full items-center gap-4 rounded-xl border border-border bg-background p-4 text-left transition-colors hover:bg-secondary/50"
                  >
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                      <Music className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-foreground">레슨 예약</p>
                      <p className="text-xs text-muted-foreground">강사 선택 후 시간 예약</p>
                    </div>
                  </button>
                </div>
              )}

              {bookingStep === "select-time" && reservationType === "practice" && (
                <div>
                  <p className="mb-4 text-xs text-muted-foreground">
                    운영시간 11:00 ~ 22:00 {availabilityLoading ? "(가용 정보 조회 중...)" : ""}
                  </p>
                  <div className="grid grid-cols-3 gap-2">
                    {TIME_SLOTS.map((slot) => {
                      const occupiedRooms = getOccupiedRooms(slot.start)
                      const full = occupiedRooms.length >= 10
                      return (
                        <button
                          key={slot.start}
                          type="button"
                          disabled={full || availabilityLoading}
                          onClick={() => {
                            setSelectedTime(slot.start)
                            setBookingStep("select-room")
                          }}
                          className={`rounded-lg border py-3 text-center text-sm font-medium transition-colors ${
                            full || availabilityLoading
                              ? "cursor-not-allowed border-border bg-muted text-muted-foreground/40"
                              : "border-border bg-background text-foreground hover:border-primary hover:bg-primary/5"
                          }`}
                        >
                          <span>{slot.label}</span>
                          {!full && occupiedRooms.length > 0 && (
                            <span className="block text-[10px] text-muted-foreground">{10 - occupiedRooms.length}실 가능</span>
                          )}
                          {full && <span className="block text-[10px]">마감</span>}
                        </button>
                      )
                    })}
                  </div>
                  <button
                    type="button"
                    onClick={() => setBookingStep("select-type")}
                    className="mt-4 w-full rounded-lg border border-border py-2.5 text-sm font-medium text-muted-foreground hover:bg-secondary hover:text-foreground"
                  >
                    이전
                  </button>
                </div>
              )}

              {bookingStep === "select-room" && (
                <div>
                  <p className="mb-1 text-xs text-muted-foreground">
                    {selectedDate.replace(/-/g, ".")} {selectedTime}
                  </p>
                  <p className="mb-4 text-sm font-medium text-foreground">연습실을 선택하세요</p>
                  <div className="grid grid-cols-5 gap-2">
                    {ROOMS.map((room) => {
                      const occupied = getOccupiedRooms(selectedTime).includes(room)
                      return (
                        <button
                          key={room}
                          type="button"
                          disabled={occupied}
                          onClick={() => {
                            setSelectedRoom(room)
                            setBookingStep("confirm")
                          }}
                          className={`flex aspect-square flex-col items-center justify-center rounded-xl border text-center transition-colors ${
                            occupied
                              ? "cursor-not-allowed border-border bg-muted text-muted-foreground/40"
                              : "border-border bg-background text-foreground hover:border-primary hover:bg-primary/5"
                          }`}
                        >
                          <span className="text-base font-bold">{room}</span>
                          <span className="text-[10px] text-muted-foreground">{occupied ? "예약됨" : "가능"}</span>
                        </button>
                      )
                    })}
                  </div>
                  <button
                    type="button"
                    onClick={() => setBookingStep("select-time")}
                    className="mt-4 w-full rounded-lg border border-border py-2.5 text-sm font-medium text-muted-foreground hover:bg-secondary hover:text-foreground"
                  >
                    이전
                  </button>
                </div>
              )}

              {bookingStep === "select-instructor" && (
                <div>
                  <p className="mb-4 text-sm text-muted-foreground">강사를 선택하세요</p>
                  <div className="space-y-2">
                    {instructors.map((inst) => (
                      <button
                        key={inst.id}
                        type="button"
                        onClick={() => {
                          setSelectedInstructor(inst.id)
                          setBookingStep("select-time")
                        }}
                        className="flex w-full items-center gap-3 rounded-xl border border-border bg-background p-3.5 text-left transition-colors hover:bg-secondary/50"
                      >
                        <div
                          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-sm font-bold text-[hsl(40,20%,97%)]"
                          style={{ backgroundColor: inst.color }}
                        >
                          {inst.name.charAt(0)}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-foreground">{inst.name}</p>
                          <p className="text-xs text-muted-foreground">{inst.specialty}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={() => setBookingStep("select-type")}
                    className="mt-4 w-full rounded-lg border border-border py-2.5 text-sm font-medium text-muted-foreground hover:bg-secondary hover:text-foreground"
                  >
                    이전
                  </button>
                </div>
              )}

              {bookingStep === "select-time" && reservationType === "lesson" && (
                <div>
                  <p className="mb-1 text-xs text-muted-foreground">
                    {instructors.find((i) => i.id === selectedInstructor)?.name} 선생님
                  </p>
                  <p className="mb-4 text-xs text-muted-foreground">
                    운영시간 11:00 ~ 22:00 {availabilityLoading ? "(가용 정보 조회 중...)" : ""}
                  </p>
                  <div className="grid grid-cols-3 gap-2">
                    {TIME_SLOTS.map((slot) => {
                      const occupied = isInstructorOccupied(slot.start, selectedInstructor)
                      return (
                        <button
                          key={slot.start}
                          type="button"
                          disabled={occupied || availabilityLoading}
                          onClick={() => {
                            setSelectedTime(slot.start)
                            setBookingStep("confirm")
                          }}
                          className={`rounded-lg border py-3 text-center text-sm font-medium transition-colors ${
                            occupied || availabilityLoading
                              ? "cursor-not-allowed border-border bg-muted text-muted-foreground/40"
                              : "border-border bg-background text-foreground hover:border-primary hover:bg-primary/5"
                          }`}
                        >
                          {slot.label}
                          {occupied && <span className="block text-[10px]">예약됨</span>}
                        </button>
                      )
                    })}
                  </div>
                  <button
                    type="button"
                    onClick={() => setBookingStep("select-instructor")}
                    className="mt-4 w-full rounded-lg border border-border py-2.5 text-sm font-medium text-muted-foreground hover:bg-secondary hover:text-foreground"
                  >
                    이전
                  </button>
                </div>
              )}

              {bookingStep === "confirm" && (
                <div>
                  <div className="mb-5 space-y-3 rounded-xl border border-border bg-background p-4">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">유형</span>
                      <span className="text-sm font-medium text-foreground">
                        {reservationType === "practice" ? "연습실" : "레슨"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">날짜</span>
                      <span className="text-sm font-medium text-foreground">{selectedDate.replace(/-/g, ". ")}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">시간</span>
                      <span className="text-sm font-medium text-foreground">
                        {selectedTime} - {parseInt(selectedTime, 10) + 1}:00
                      </span>
                    </div>
                    {reservationType === "practice" && selectedRoom && (
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">연습실</span>
                        <span className="text-sm font-medium text-foreground">{selectedRoom}번</span>
                      </div>
                    )}
                    {reservationType === "lesson" && (
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">강사</span>
                        <span className="text-sm font-medium text-foreground">
                          {instructors.find((i) => i.id === selectedInstructor)?.name}
                        </span>
                      </div>
                    )}
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">예약자</span>
                      <span className="text-sm font-medium text-foreground">{authUser?.name ?? "회원"}</span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setBookingStep(reservationType === "practice" ? "select-room" : "select-time")}
                      className="flex-1 rounded-lg border border-border py-2.5 text-sm font-medium text-muted-foreground hover:bg-secondary hover:text-foreground"
                    >
                      이전
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        void confirmBooking()
                      }}
                      disabled={saving}
                      className="flex-1 rounded-lg bg-primary py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {saving ? "처리 중..." : "예약 확정"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
