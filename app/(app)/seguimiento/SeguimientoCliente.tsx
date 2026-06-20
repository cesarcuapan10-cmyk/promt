"use client"

import { useState, useTransition } from "react"
import {
  Bell,
  CheckCircle2,
  Trash2,
  Plus,
  AlertTriangle,
  Clock,
  CalendarDays,
} from "lucide-react"
import { Button } from "@/app/components/ui/Button"
import { Card } from "@/app/components/ui/Card"
import { Badge } from "@/app/components/ui/Badge"
import { completarRecordatorio, eliminarRecordatorio } from "@/app/actions/seguimiento"
import { ModalRecordatorio } from "./ModalRecordatorio"
import { useRouter } from "next/navigation"
import {
  format,
  isToday,
  isPast,
  isFuture,
  addDays,
  isWithinInterval,
  startOfDay,
  endOfDay,
  parseISO,
} from "date-fns"
import { es } from "date-fns/locale"

type Recordatorio = {
  id: string
  titulo: string
  fecha: Date
  hora: string | null
  completado: boolean
  pospuesto: boolean
  usuarioId: string
  clienteId: string | null
  creadoEn: Date
  cliente: { id: string; nombre: string } | null
}

type FiltroTab = "TODOS" | "PENDIENTES" | "COMPLETADOS"

function getFechaHora(rec: Recordatorio): Date {
  const fecha = new Date(rec.fecha)
  if (rec.hora) {
    const [h, m] = rec.hora.split(":").map(Number)
    fecha.setHours(h, m, 0, 0)
  }
  return fecha
}

function TareaCard({
  rec,
  onCompletar,
  onEliminar,
}: {
  rec: Recordatorio
  onCompletar: (id: string) => void
  onEliminar: (id: string) => void
}) {
  const [pendingCompletar, startCompletar] = useTransition()
  const [pendingEliminar, startEliminar] = useTransition()
  const fechaHora = getFechaHora(rec)

  return (
    <div
      className={`flex items-start gap-3 p-3 rounded-xl border transition-all ${
        rec.completado
          ? "bg-gray-50 dark:bg-gray-900/20 border-gray-100 dark:border-gray-800 opacity-60"
          : "bg-white dark:bg-[#1f1f1f] border-gray-100 dark:border-gray-800"
      }`}
    >
      <div className="mt-0.5 text-gray-400">
        <Bell size={14} />
      </div>
      <div className="flex-1 min-w-0">
        <p
          className={`text-sm font-medium ${
            rec.completado
              ? "line-through text-gray-400"
              : "text-gray-900 dark:text-white"
          }`}
        >
          {rec.titulo}
        </p>
        {rec.cliente && (
          <p className="text-xs text-gray-500 mt-0.5">{rec.cliente.nombre}</p>
        )}
        <p className="text-xs text-gray-400 mt-1">
          {rec.hora
            ? format(fechaHora, "d MMM, HH:mm", { locale: es })
            : format(new Date(rec.fecha), "d MMM", { locale: es })}
        </p>
      </div>
      <div className="flex gap-1 flex-shrink-0">
        {!rec.completado && (
          <button
            onClick={() => startCompletar(() => onCompletar(rec.id))}
            disabled={pendingCompletar}
            className="p-1.5 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition"
            title="Marcar completado"
          >
            <CheckCircle2 size={16} />
          </button>
        )}
        <button
          onClick={() => startEliminar(() => onEliminar(rec.id))}
          disabled={pendingEliminar}
          className="p-1.5 text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition"
          title="Eliminar"
        >
          <Trash2 size={16} />
        </button>
      </div>
    </div>
  )
}

interface SeguimientoClienteProps {
  recordatorios: Recordatorio[]
  clientes: { id: string; nombre: string }[]
}

export function SeguimientoCliente({ recordatorios: inicial, clientes }: SeguimientoClienteProps) {
  const router = useRouter()
  const [records, setRecords] = useState<Recordatorio[]>(inicial)
  const [modalAbierto, setModalAbierto] = useState(false)
  const [filtro, setFiltro] = useState<FiltroTab>("TODOS")

  async function handleCompletar(id: string) {
    await completarRecordatorio(id)
    setRecords((prev) => prev.map((r) => (r.id === id ? { ...r, completado: true } : r)))
    router.refresh()
  }

  async function handleEliminar(id: string) {
    await eliminarRecordatorio(id)
    setRecords((prev) => prev.filter((r) => r.id !== id))
    router.refresh()
  }

  const ahora = new Date()

  const filtrados = records.filter((r) => {
    if (filtro === "PENDIENTES") return !r.completado
    if (filtro === "COMPLETADOS") return r.completado
    return true
  })

  const hoy = filtrados.filter((r) => !r.completado && isToday(new Date(r.fecha)))
  const vencidos = filtrados.filter(
    (r) =>
      !r.completado &&
      isPast(new Date(r.fecha)) &&
      !isToday(new Date(r.fecha))
  )
  const proximos = filtrados.filter((r) => {
    const fecha = new Date(r.fecha)
    return (
      !r.completado &&
      isFuture(fecha) &&
      !isToday(fecha) &&
      isWithinInterval(fecha, {
        start: startOfDay(addDays(ahora, 1)),
        end: endOfDay(addDays(ahora, 7)),
      })
    )
  })
  const completados = filtrados.filter((r) => r.completado)

  const TABS: { id: FiltroTab; label: string }[] = [
    { id: "TODOS", label: "Todos" },
    { id: "PENDIENTES", label: "Pendientes" },
    { id: "COMPLETADOS", label: "Completados" },
  ]

  function Section({
    title,
    icon,
    items,
    badge,
  }: {
    title: string
    icon: React.ReactNode
    items: Recordatorio[]
    badge?: React.ReactNode
  }) {
    if (items.length === 0) return null
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          {icon}
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">{title}</h2>
          {badge}
          <span className="text-xs text-gray-400">({items.length})</span>
        </div>
        <div className="space-y-2">
          {items.map((r) => (
            <TareaCard key={r.id} rec={r} onCompletar={handleCompletar} onEliminar={handleEliminar} />
          ))}
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="flex items-center justify-between">
        <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 rounded-xl p-1">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFiltro(tab.id)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                filtro === tab.id
                  ? "bg-white dark:bg-[#1f1f1f] text-gray-900 dark:text-white shadow-sm"
                  : "text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <Button icono={<Plus size={16} />} onClick={() => setModalAbierto(true)} tamaño="sm">
          Nueva tarea
        </Button>
      </div>

      {filtrados.length === 0 ? (
        <Card className="text-center py-16">
          <Bell className="w-12 h-12 mx-auto mb-3 opacity-20" />
          <p className="text-base font-medium text-gray-500">Sin tareas</p>
          <p className="text-sm text-gray-400 mt-1">Crea una nueva tarea de seguimiento</p>
        </Card>
      ) : (
        <div className="space-y-6">
          <Section
            title="Vencidas"
            icon={<AlertTriangle size={16} className="text-red-500" />}
            items={vencidos}
            badge={
              vencidos.length > 0 ? (
                <Badge variante="vencido">
                  {vencidos.length} atrasada{vencidos.length > 1 ? "s" : ""}
                </Badge>
              ) : undefined
            }
          />
          <Section
            title="Hoy"
            icon={<Clock size={16} className="text-amber-500" />}
            items={hoy}
          />
          <Section
            title="Próximos 7 días"
            icon={<CalendarDays size={16} className="text-blue-500" />}
            items={proximos}
          />
          {filtro !== "PENDIENTES" && (
            <Section
              title="Completados"
              icon={<CheckCircle2 size={16} className="text-green-500" />}
              items={completados}
            />
          )}
        </div>
      )}

      <ModalRecordatorio
        abierto={modalAbierto}
        onCerrar={() => setModalAbierto(false)}
        clientes={clientes}
      />
    </>
  )
}
