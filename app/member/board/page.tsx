"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { ChevronRight, Pin, X } from "lucide-react"
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

export default function MemberBoardPage() {
  const router = useRouter()
  const [posts, setPosts] = useState<BoardPost[]>([])
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  const loadPosts = useCallback(async () => {
    try {
      setLoading(true)
      setError("")
      const data = await apiRequest<PostApi[]>("/api/v1/posts")
      setPosts(data.map(toPost))
    } catch (err) {
      if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
        clearAuthSession()
        router.replace("/")
        return
      }
      setError("게시글을 불러오지 못했습니다.")
    } finally {
      setLoading(false)
    }
  }, [router])

  useEffect(() => {
    void loadPosts()
  }, [loadPosts])

  const selectedPost = useMemo(() => {
    if (!selectedPostId) return null
    return posts.find((post) => post.id === selectedPostId) ?? null
  }, [posts, selectedPostId])

  return (
    <div className="mx-auto max-w-3xl p-4 sm:p-6">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="font-serif text-xl font-bold text-foreground sm:text-2xl">게시판</h1>
          <p className="mt-1 text-sm text-muted-foreground">공지사항 및 학원 안내</p>
        </div>
        <button
          type="button"
          onClick={() => {
            void loadPosts()
          }}
          className="rounded-lg border border-border px-3 py-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
        >
          새로고침
        </button>
      </div>

      {error && <p className="mb-3 text-sm text-destructive">{error}</p>}

      <div className="overflow-hidden rounded-xl border border-border bg-card">
        {loading && <div className="py-12 text-center text-sm text-muted-foreground">불러오는 중...</div>}

        {!loading &&
          posts.map((post, idx) => (
            <button
              key={post.id}
              type="button"
              onClick={() => setSelectedPostId(post.id)}
              className={`flex w-full items-center gap-4 px-5 py-4 text-left transition-colors hover:bg-secondary/20 ${
                idx < posts.length - 1 ? "border-b border-border" : ""
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

        {!loading && posts.length === 0 && (
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

            <button
              type="button"
              onClick={() => setSelectedPostId(null)}
              className="mt-5 w-full rounded-lg border border-border py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            >
              닫기
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
