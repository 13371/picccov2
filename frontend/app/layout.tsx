import type { Metadata } from 'next'
import './globals.css'
import Header from './components/Header'
import TabBar from './components/TabBar'

export const metadata: Metadata = {
  title: 'Piccco App',
  description: 'Monorepo with Next.js and NestJS',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="zh-CN">
      <body>
        <Header />
        <main className="main-content">
          {children}
        </main>
        <TabBar />
      </body>
    </html>
  )
}

