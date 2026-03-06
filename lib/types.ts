export type UserRole = "admin" | "member"

export interface User {
  id: string
  loginId?: string
  name: string
  phone: string
  role: UserRole
  gender: "male" | "female"
  registeredAt: string
  subscriptionId?: string
}

export interface Instructor {
  id: string
  name: string
  phone: string
  specialty: string
  registeredAt: string
  color: string
}

export interface Subscription {
  id: string
  name: string
  totalLessons: number
  remainingLessons: number
  durationMonths: number
  price: number
}

export interface LessonReservation {
  id: string
  memberId: string
  memberName: string
  instructorId: string
  instructorName: string
  date: string
  startTime: string
  endTime: string
  type: "lesson" | "practice"
  roomNumber?: number
  status: "confirmed" | "pending" | "cancelled" | "changed"
}

export interface Notification {
  id: string
  type: "reservation" | "change" | "cancel" | "system"
  title: string
  message: string
  createdAt: string
  read: boolean
}

export interface BoardPost {
  id: string
  title: string
  content: string
  authorName: string
  createdAt: string
  pinned: boolean
}
