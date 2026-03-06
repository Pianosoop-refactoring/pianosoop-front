"use client"

import React, { useCallback, useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Pencil, Phone, Plus, Search, Trash2, X } from "lucide-react"
import { clearAuthSession } from "@/lib/auth-client"
import { ApiError, apiRequest } from "@/lib/api-client"
import type { Instructor } from "@/lib/types"

const COLORS = [
  { value: "#3a6b52", label: "숲" },
  { value: "#b87a3d", label: "호박" },
  { value: "#6b5a3a", label: "우드" },
  { value: "#5a6b3a", label: "올리브" },
  { value: "#8b5e3c", label: "어스" },
]

interface InstructorApi {
  id: number
  name: string
  phone: string
  specialty: string
  registeredAt: string
  color: string
}

interface InstructorFormValues {
  name: string
  phone: string
  specialty: string
  color: string
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

export default function InstructorsPage() {
  const router = useRouter()
  const [instructors, setInstructors] = useState<Instructor[]>([])
  const [search, setSearch] = useState("")
  const [showAddModal, setShowAddModal] = useState(false)
  const [selectedInstructorId, setSelectedInstructorId] = useState<string | null>(null)
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

  const loadInstructors = useCallback(async () => {
    try {
      setLoading(true)
      setError("")
      const data = await apiRequest<InstructorApi[]>("/api/v1/instructors")
      setInstructors(data.map(toInstructor))
    } catch (err) {
      handleApiError(err, "강사 목록을 불러오지 못했습니다.")
    } finally {
      setLoading(false)
    }
  }, [handleApiError])

  useEffect(() => {
    loadInstructors()
  }, [loadInstructors])

  const filtered = useMemo(() => {
    if (!search) return instructors
    return instructors.filter(
      (i) => i.name.includes(search) || i.phone.includes(search) || i.specialty.includes(search),
    )
  }, [instructors, search])

  const selectedInstructor = useMemo(() => {
    if (!selectedInstructorId) return null
    return instructors.find((inst) => inst.id === selectedInstructorId) ?? null
  }, [instructors, selectedInstructorId])

  const createInstructor = async (values: InstructorFormValues) => {
    try {
      setSaving(true)
      setError("")

      await apiRequest<InstructorApi>("/api/v1/instructors", {
        method: "POST",
        body: values,
      })

      setShowAddModal(false)
      await loadInstructors()
    } catch (err) {
      handleApiError(err, "강사 추가에 실패했습니다.")
    } finally {
      setSaving(false)
    }
  }

  const updateInstructor = async (instructorId: string, values: InstructorFormValues) => {
    try {
      setSaving(true)
      setError("")

      const updated = await apiRequest<InstructorApi>(`/api/v1/instructors/${instructorId}`, {
        method: "PATCH",
        body: values,
      })

      const next = toInstructor(updated)
      setInstructors((prev) => prev.map((inst) => (inst.id === instructorId ? next : inst)))
      setSelectedInstructorId(next.id)
    } catch (err) {
      handleApiError(err, "강사 수정에 실패했습니다.")
    } finally {
      setSaving(false)
    }
  }

  const deleteInstructor = async (instructorId: string) => {
    if (!window.confirm("이 강사를 삭제할까요?")) return

    try {
      setSaving(true)
      setError("")

      await apiRequest<void>(`/api/v1/instructors/${instructorId}`, {
        method: "DELETE",
      })

      setInstructors((prev) => prev.filter((inst) => inst.id !== instructorId))
      setSelectedInstructorId(null)
    } catch (err) {
      handleApiError(err, "강사 삭제에 실패했습니다.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="mb-4 flex flex-col gap-3 sm:mb-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-serif text-xl font-bold text-foreground sm:text-2xl">강사 관리</h1>
          <p className="mt-1 text-sm text-muted-foreground">총 {instructors.length}명의 강사</p>
        </div>
        <button
          type="button"
          onClick={() => setShowAddModal(true)}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:opacity-90"
        >
          <Plus className="h-4 w-4" />
          강사 추가
        </button>
      </div>

      <div className="relative mb-5">
        <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="이름, 연락처 또는 전공으로 검색"
          className="w-full rounded-lg border border-border bg-card py-2.5 pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground/50 transition-colors focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary sm:max-w-md"
        />
      </div>

      {error && <p className="mb-4 text-sm text-destructive">{error}</p>}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {loading && (
          <div className="col-span-full py-12 text-center text-sm text-muted-foreground">불러오는 중...</div>
        )}

        {!loading &&
          filtered.map((inst) => (
            <div
              key={inst.id}
              className="rounded-xl border border-border bg-card p-5 transition-shadow hover:shadow-md"
            >
              <div className="mb-4 flex items-center gap-3">
                <div
                  className="flex h-11 w-11 items-center justify-center rounded-xl text-sm font-bold text-[hsl(40,20%,97%)]"
                  style={{ backgroundColor: inst.color }}
                >
                  {inst.name.charAt(0)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-foreground">{inst.name}</p>
                  <p className="truncate text-xs text-muted-foreground">{inst.specialty}</p>
                </div>
              </div>

              <div className="space-y-2 rounded-lg border border-border bg-background p-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">연락처</span>
                  <span className="flex items-center gap-1.5 text-xs font-medium text-foreground">
                    <Phone className="h-3 w-3 text-muted-foreground" />
                    {inst.phone}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">등록일</span>
                  <span className="text-xs font-medium text-foreground">{inst.registeredAt}</span>
                </div>
              </div>

              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedInstructorId(inst.id)}
                  className="flex flex-1 items-center justify-center gap-1 rounded-lg border border-border py-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                >
                  <Pencil className="h-3.5 w-3.5" />
                  수정
                </button>
                <button
                  type="button"
                  onClick={() => {
                    void deleteInstructor(inst.id)
                  }}
                  disabled={saving}
                  className="flex flex-1 items-center justify-center gap-1 rounded-lg border border-destructive/40 py-2 text-xs font-medium text-destructive transition-colors hover:bg-destructive/10 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  삭제
                </button>
              </div>
            </div>
          ))}

        {!loading && filtered.length === 0 && (
          <div className="col-span-full py-12 text-center text-sm text-muted-foreground">검색 결과가 없습니다</div>
        )}
      </div>

      {showAddModal && (
        <InstructorFormModal
          title="강사 추가"
          submitLabel="추가"
          loading={saving}
          onClose={() => setShowAddModal(false)}
          onSubmit={createInstructor}
        />
      )}

      {selectedInstructor && (
        <InstructorFormModal
          title="강사 정보 수정"
          submitLabel="저장"
          loading={saving}
          initialValues={{
            name: selectedInstructor.name,
            phone: selectedInstructor.phone,
            specialty: selectedInstructor.specialty,
            color: selectedInstructor.color,
          }}
          onClose={() => setSelectedInstructorId(null)}
          onSubmit={(values) => updateInstructor(selectedInstructor.id, values)}
        />
      )}
    </div>
  )
}

function InstructorFormModal({
  title,
  submitLabel,
  loading,
  initialValues,
  onClose,
  onSubmit,
}: {
  title: string
  submitLabel: string
  loading: boolean
  initialValues?: InstructorFormValues
  onClose: () => void
  onSubmit: (values: InstructorFormValues) => Promise<void> | void
}) {
  const [name, setName] = useState(initialValues?.name ?? "")
  const [phone, setPhone] = useState(initialValues?.phone ?? "")
  const [specialty, setSpecialty] = useState(initialValues?.specialty ?? "")
  const [color, setColor] = useState(initialValues?.color ?? COLORS[0].value)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name || !phone) return

    await onSubmit({ name, phone, specialty, color })
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
            <label htmlFor="inst-name" className="mb-1.5 block text-xs font-medium text-muted-foreground">
              이름 *
            </label>
            <input
              id="inst-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          <div>
            <label htmlFor="inst-phone" className="mb-1.5 block text-xs font-medium text-muted-foreground">
              연락처 *
            </label>
            <input
              id="inst-phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="010-0000-0000"
              required
              className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          <div>
            <label htmlFor="inst-spec" className="mb-1.5 block text-xs font-medium text-muted-foreground">
              전공 / 분야
            </label>
            <input
              id="inst-spec"
              type="text"
              value={specialty}
              onChange={(e) => setSpecialty(e.target.value)}
              placeholder="예: 클래식, 재즈, 팝"
              className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">테마 컬러</label>
            <div className="flex gap-2">
              {COLORS.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => setColor(c.value)}
                  className={`flex h-9 w-9 items-center justify-center rounded-lg border-2 transition-all ${
                    color === c.value ? "scale-110 border-foreground" : "border-transparent"
                  }`}
                  style={{ backgroundColor: c.value }}
                  title={c.label}
                  aria-label={`${c.label} 색상 선택`}
                />
              ))}
            </div>
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
