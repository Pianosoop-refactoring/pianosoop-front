"use client"

import { getAccessToken, getApiBaseUrl } from "@/lib/auth-client"

interface ApiRequestOptions extends Omit<RequestInit, "body" | "headers"> {
  body?: unknown
  headers?: HeadersInit
  auth?: boolean
}

export class ApiError extends Error {
  status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = "ApiError"
    this.status = status
  }
}

function extractErrorMessage(payload: unknown, fallback: string) {
  if (!payload || typeof payload !== "object") return fallback
  const map = payload as Record<string, unknown>
  if (typeof map.message === "string" && map.message.trim()) return map.message
  if (typeof map.error === "string" && map.error.trim()) return map.error
  return fallback
}

export async function apiRequest<T>(path: string, options: ApiRequestOptions = {}): Promise<T> {
  const { auth = true, body, headers, ...rest } = options

  const mergedHeaders = new Headers(headers)
  let requestBody: BodyInit | undefined

  if (body !== undefined && body !== null) {
    const isFormData = body instanceof FormData
    if (isFormData) {
      requestBody = body
    } else {
      if (!mergedHeaders.has("Content-Type")) {
        mergedHeaders.set("Content-Type", "application/json")
      }
      requestBody = JSON.stringify(body)
    }
  }

  if (auth) {
    const token = getAccessToken()
    if (!token) {
      throw new ApiError("인증 토큰이 없습니다. 다시 로그인해주세요.", 401)
    }
    mergedHeaders.set("Authorization", `Bearer ${token}`)
  }

  const res = await fetch(`${getApiBaseUrl()}${path}`, {
    ...rest,
    headers: mergedHeaders,
    body: requestBody,
  })

  const contentType = res.headers.get("content-type") ?? ""
  const isJson = contentType.includes("application/json")
  const payload = isJson ? await res.json() : null

  if (!res.ok) {
    throw new ApiError(extractErrorMessage(payload, "요청 처리에 실패했습니다."), res.status)
  }

  return payload as T
}
