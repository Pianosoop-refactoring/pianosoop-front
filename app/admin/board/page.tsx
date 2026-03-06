"use client"

import React, { useCallback, useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { ChevronRight, Pencil, Pin, Plus, Trash2, X } from "lucide-react"
import { clearAuthSession } from "@/lib/auth-client"
import { ApiError, apiRequest } from "@/lib/api-client"
import type { BoardPost } from "@/lib/types"

interface PostApi {
  id: number
  title: string
  content: string
  authorName: string
  createdAt: string
  pinned: boolean
}

interface PostFormValues {
  title: string
  content: string
  pinned: boolean
}

function toPost(raw: PostApi): BoardPost {
  return {
    id: String(raw.id),
    title: raw.title,
    content: raw.content,
    authorName: raw.authorName,
    createdAt: raw.createdAt,
    pinned: raw.pinned,
  }
}

export default function BoardPage() {
  const router = useRouter()
  const [posts, setPosts] = useState<BoardPost[]>([])
  const [showAddModal, setShowAddModal] = useState(false)
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null)
  const [editingPostId, setEditingPostId] = useState<string | null>(null)
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

  const loadPosts = useCallback(async () => {
    try {
      setLoading(true)
      setError("")
      const data = await apiRequest<PostApi[]>("/api/v1/posts")
      setPosts(data.map(toPost))
    } catch (err) {
      handleApiError(err, "게시글 목록을 불러오지 못했습니다.")
    } finally {
      setLoading(false)
    }
  }, [handleApiError])

  useEffect(() => {
    loadPosts()
  }, [loadPosts])

  const selectedPost = useMemo(() => {
    if (!selectedPostId) return null
    return posts.find((post) => post.id === selectedPostId) ?? null
  }, [posts, selectedPostId])

  const editingPost = useMemo(() => {
    if (!editingPostId) return null
    return posts.find((post) => post.id === editingPostId) ?? null
  }, [posts, editingPostId])

  const createPost = async (values: PostFormValues) => {
    try {
      setSaving(true)
      setError("")

      await apiRequest<PostApi>("/api/v1/posts", {
        method: "POST",
        body: values,
      })

      setShowAddModal(false)
      await loadPosts()
    } catch (err) {
      handleApiError(err, "게시글 작성에 실패했습니다.")
    } finally {
      setSaving(false)
    }
  }

  const updatePost = async (postId: string, values: PostFormValues) => {
    try {
      setSaving(true)
      setError("")

      const updated = await apiRequest<PostApi>(`/api/v1/posts/${postId}`, {
        method: "PATCH",
        body: values,
      })

      const next = toPost(updated)
      setPosts((prev) => prev.map((post) => (post.id === postId ? next : post)))
      setSelectedPostId(next.id)
      setEditingPostId(null)
    } catch (err) {
      handleApiError(err, "게시글 수정에 실패했습니다.")
    } finally {
      setSaving(false)
    }
  }

  const deletePost = async (postId: string) => {
    if (!window.confirm("이 게시글을 삭제할까요?")) return

    try {
      setSaving(true)
      setError("")

      await apiRequest<void>(`/api/v1/posts/${postId}`, {
        method: "DELETE",
      })

      setPosts((prev) => prev.filter((post) => post.id !== postId))
      setSelectedPostId(null)
      setEditingPostId(null)
    } catch (err) {
      handleApiError(err, "게시글 삭제에 실패했습니다.")
    } finally {
      setSaving(false)
    }
  }

  const sortedPosts = [...posts].sort((a, b) => {
    if (a.pinned && !b.pinned) return -1
    if (!a.pinned && b.pinned) return 1
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  })

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="mb-4 flex flex-col gap-3 sm:mb-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-serif text-xl font-bold text-foreground sm:text-2xl">게시판</h1>
          <p className="mt-1 text-sm text-muted-foreground">공지사항 및 안내</p>
        </div>
        <button
          type="button"
          onClick={() => setShowAddModal(true)}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:opacity-90"
        >
          <Plus className="h-4 w-4" />
          글 작성
        </button>
      </div>

      {error && <p className="mb-3 text-sm text-destructive">{error}</p>}

      <div className="overflow-hidden rounded-xl border border-border bg-card">
        {loading && <div className="py-12 text-center text-sm text-muted-foreground">불러오는 중...</div>}

        {!loading &&
          sortedPosts.map((post, idx) => (
            <button
              key={post.id}
              type="button"
              onClick={() => setSelectedPostId(post.id)}
              className={`flex w-full items-center gap-4 px-5 py-4 text-left transition-colors hover:bg-secondary/20 ${
                idx < sortedPosts.length - 1 ? "border-b border-border" : ""
              }`}
            >
              {post.pinned && <Pin className="h-3.5 w-3.5 shrink-0 rotate-45 text-primary" />}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  {post.pinned && (
                    <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-bold text-primary">고정</span>
                  )}
                  <h3 className="truncate text-sm font-medium text-foreground">{post.title}</h3>
                </div>
                <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
                  <span>{post.authorName}</span>
                  <span>{post.createdAt}</span>
                </div>
              </div>
              <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/30" />
            </button>
          ))}

        {!loading && sortedPosts.length === 0 && (
          <div className="py-16 text-center text-sm text-muted-foreground">게시글이 없습니다</div>
        )}
      </div>

      {selectedPost && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-foreground/20 backdrop-blur-sm sm:items-center">
          <div className="w-full max-h-[90vh] overflow-y-auto rounded-t-2xl border border-border bg-card p-5 shadow-lg sm:max-w-lg sm:rounded-xl sm:p-6">
            <div className="mb-5 flex items-start justify-between">
              <div>
                <div className="mb-1 flex items-center gap-2">
                  {selectedPost.pinned && (
                    <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-bold text-primary">고정</span>
                  )}
                  <h3 className="font-serif text-base font-bold text-foreground sm:text-lg">{selectedPost.title}</h3>
                </div>
                <p className="text-xs text-muted-foreground">
                  {selectedPost.authorName} | {selectedPost.createdAt}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedPostId(null)}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                aria-label="닫기"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="whitespace-pre-wrap rounded-lg border border-border bg-background p-4 text-sm leading-relaxed text-foreground">
              {selectedPost.content}
            </div>

            <div className="mt-5 flex gap-2">
              <button
                type="button"
                onClick={() => setEditingPostId(selectedPost.id)}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-border py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
              >
                <Pencil className="h-4 w-4" />
                수정
              </button>
              <button
                type="button"
                onClick={() => {
                  void deletePost(selectedPost.id)
                }}
                disabled={saving}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-destructive/40 py-2.5 text-sm font-medium text-destructive transition-colors hover:bg-destructive/10 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Trash2 className="h-4 w-4" />
                삭제
              </button>
            </div>

            <button
              type="button"
              onClick={() => setSelectedPostId(null)}
              className="mt-2 w-full rounded-lg border border-border py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            >
              닫기
            </button>
          </div>
        </div>
      )}

      {showAddModal && (
        <PostFormModal
          title="글 작성"
          submitLabel="작성"
          loading={saving}
          onClose={() => setShowAddModal(false)}
          onSubmit={createPost}
        />
      )}

      {editingPost && (
        <PostFormModal
          title="글 수정"
          submitLabel="저장"
          loading={saving}
          initialValues={{
            title: editingPost.title,
            content: editingPost.content,
            pinned: editingPost.pinned,
          }}
          onClose={() => setEditingPostId(null)}
          onSubmit={(values) => updatePost(editingPost.id, values)}
        />
      )}
    </div>
  )
}

function PostFormModal({
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
  initialValues?: PostFormValues
  onClose: () => void
  onSubmit: (values: PostFormValues) => Promise<void> | void
}) {
  const [titleValue, setTitleValue] = useState(initialValues?.title ?? "")
  const [content, setContent] = useState(initialValues?.content ?? "")
  const [pinned, setPinned] = useState(initialValues?.pinned ?? false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!titleValue || !content) return
    await onSubmit({ title: titleValue, content, pinned })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-foreground/20 backdrop-blur-sm sm:items-center">
      <div className="w-full max-h-[90vh] overflow-y-auto rounded-t-2xl border border-border bg-card p-5 shadow-lg sm:max-w-lg sm:rounded-xl sm:p-6">
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
            <label htmlFor="post-title" className="mb-1.5 block text-xs font-medium text-muted-foreground">
              제목 *
            </label>
            <input
              id="post-title"
              type="text"
              value={titleValue}
              onChange={(e) => setTitleValue(e.target.value)}
              required
              className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          <div>
            <label htmlFor="post-content" className="mb-1.5 block text-xs font-medium text-muted-foreground">
              내용 *
            </label>
            <textarea
              id="post-content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              required
              rows={6}
              className="w-full resize-none rounded-lg border border-border bg-background px-4 py-2.5 text-sm leading-relaxed text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          <label className="flex cursor-pointer items-center gap-2">
            <input
              type="checkbox"
              checked={pinned}
              onChange={(e) => setPinned(e.target.checked)}
              className="h-4 w-4 rounded border-border text-primary accent-primary"
            />
            <span className="text-sm text-foreground">상단 고정</span>
          </label>

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
