import React from "react"
import type { Metadata, Viewport } from 'next'
import { Noto_Sans_KR, Noto_Serif_KR } from 'next/font/google'

import './globals.css'

const notoSansKR = Noto_Sans_KR({
  subsets: ['latin'],
  weight: ['300', '400', '500', '700'],
  variable: '--font-noto-sans-kr',
})

const notoSerifKR = Noto_Serif_KR({
  subsets: ['latin'],
  weight: ['400', '700'],
  variable: '--font-noto-serif-kr',
})

export const metadata: Metadata = {
  title: '피아노숲 | Piano Forest',
  description: '성인 피아노 학원 관리 시스템',
}

export const viewport: Viewport = {
  themeColor: '#3a6b52',
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="ko">
      <body className={`${notoSansKR.variable} ${notoSerifKR.variable} font-sans antialiased`}>
        {children}
      </body>
    </html>
  )
}
