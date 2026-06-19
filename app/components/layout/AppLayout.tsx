"use client"
import { Sidebar } from "./Sidebar"
import { BottomNav } from "./BottomNav"
import { TopBar } from "./TopBar"
import { SessionProvider } from "next-auth/react"
import type { Session } from "next-auth"

interface AppLayoutProps {
  children: React.ReactNode
  titulo?: string
  subtitulo?: string
  session?: Session | null
}

export function AppLayout({ children, titulo, subtitulo, session }: AppLayoutProps) {
  return (
    <SessionProvider session={session}>
      <div className="flex h-screen bg-gray-50 dark:bg-[#0f0f0f]">
        <Sidebar />
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <TopBar titulo={titulo} subtitulo={subtitulo} />
          <main className="flex-1 overflow-y-auto pb-20 md:pb-6">{children}</main>
        </div>
        <BottomNav />
      </div>
    </SessionProvider>
  )
}
