"use client"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard, Users, KanbanSquare, CalendarDays, Wallet,
  ListChecks, Trophy, XCircle, Archive, Share2, UserCog,
  ShieldCheck, ChevronLeft, ChevronRight, Sparkles, MessageSquare,
} from "lucide-react"
import { cn } from "@/app/lib/utils"
import { useState } from "react"

const NAV = [
  { href: "/", label: "Tablero", Icon: LayoutDashboard, color: "#e8b763", exacto: true },
  { href: "/clientes", label: "Clientes", Icon: Users, color: "#3b82f6" },
  { href: "/embudo", label: "Embudo", Icon: KanbanSquare, color: "#8b5cf6" },
  { href: "/agenda", label: "Agenda", Icon: CalendarDays, color: "#22c55e" },
  { href: "/pagos", label: "Pagos", Icon: Wallet, color: "#10b981" },
  { href: "/seguimiento", label: "Seguimiento", Icon: ListChecks, color: "#f59e0b" },
  { href: "/plantillas", label: "Plantillas", Icon: MessageSquare, color: "#e8b763" },
  { href: "/completados", label: "Completados", Icon: Trophy, color: "#16a34a" },
  { href: "/perdidos", label: "Perdidos", Icon: XCircle, color: "#6b7280" },
  { href: "/archivados", label: "Archivados", Icon: Archive, color: "#9ca3af" },
  { href: "/compartir", label: "Comparte y crece", Icon: Share2, color: "#e8b763" },
  { href: "/equipo", label: "Equipo", Icon: UserCog, color: "#06b6d4" },
  { href: "/admin", label: "Panel admin", Icon: ShieldCheck, color: "#e8b763" },
]

export function Sidebar() {
  const pathname = usePathname()
  const [colapsado, setColapsado] = useState(false)

  return (
    <aside
      className={cn(
        "hidden md:flex flex-col h-screen sticky top-0 bg-white dark:bg-[#111] border-r border-gray-100 dark:border-gray-800 transition-all duration-300 z-20",
        colapsado ? "w-16" : "w-56"
      )}
    >
      {/* Logo */}
      <div
        className={cn(
          "flex items-center gap-3 p-4 border-b border-gray-100 dark:border-gray-800 shrink-0",
          colapsado && "justify-center"
        )}
      >
        <div className="w-8 h-8 rounded-lg bg-brand flex items-center justify-center shrink-0">
          <Sparkles className="w-4 h-4 text-white" />
        </div>
        {!colapsado && (
          <span className="font-bold text-gray-900 dark:text-white text-sm truncate">
            cesar cuapan
          </span>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto p-2 space-y-0.5">
        {NAV.map(({ href, label, Icon, color, exacto }) => {
          const activo = exacto ? pathname === href : pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              title={colapsado ? label : undefined}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all min-h-[44px]",
                activo
                  ? "bg-brand/10 dark:bg-brand/15 text-gray-900 dark:text-white"
                  : "text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5 hover:text-gray-900 dark:hover:text-white",
                colapsado && "justify-center"
              )}
            >
              <Icon
                size={18}
                style={{ color: activo ? color : undefined }}
                className="shrink-0"
              />
              {!colapsado && <span className="truncate">{label}</span>}
              {activo && !colapsado && (
                <div className="ml-auto w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
              )}
            </Link>
          )
        })}
      </nav>

      {/* Colapsar */}
      <div className="p-2 border-t border-gray-100 dark:border-gray-800">
        <button
          onClick={() => setColapsado(!colapsado)}
          className={cn(
            "flex items-center gap-2 w-full px-3 py-2 rounded-xl text-gray-500 hover:bg-gray-50 dark:hover:bg-white/5 text-sm transition min-h-[44px]",
            colapsado && "justify-center"
          )}
          aria-label={colapsado ? "Expandir menú" : "Colapsar menú"}
        >
          {colapsado ? (
            <ChevronRight size={16} />
          ) : (
            <>
              <ChevronLeft size={16} />
              <span>Colapsar</span>
            </>
          )}
        </button>
      </div>
    </aside>
  )
}
