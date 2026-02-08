import React from "react"
import type { Metadata } from 'next'

import './globals.css'

export const metadata: Metadata = {
  title: 'Geo-Intel Brief | 生成 Gamma 简报站点',
  description: '基于 Google RSS，为欧洲、中东北非与非洲生成图像优先的地缘情报简报站点',
  generator: 'v0.app',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="zh-CN">
      <body className="font-sans antialiased">{children}</body>
    </html>
  )
}
