"use client"

import { useState, useTransition } from "react"
import Link from "next/link"
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
} from "@dnd-kit/core"
import type { DragEndEvent, DragStartEvent } from "@dnd-kit/core"
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { AlertCircle, MessageCircle } from "lucide-react"
import { Badge } from "@/app/components/ui/Badge"
import { moverClienteEtapa } from "@/app/actions/embudo"
import { formatMoney, getTemperaturaEmoji, getDiasDesde, etapaLabel, formatFecha } from "@/app/lib/utils"

// ─── Types ────────────────────────────────────────────────────────────────

type ClienteKanban = {
  id: string
  nombre: string
  correo: string | null
  telefono: string | null
  whatsapp: string | null
  empresaNombre: string | null
  etapa: string
  estadoCartera: string
  temperatura: string
  valorEstimado: number | null
  proximaAccion: string | null
  fechaProximaAccion: Date | null
  ultimoContacto: Date | null
  actualizadoEn: Date
}

type PorEtapa = Record<string, ClienteKanban[]>

// ─── Columnas del kanban ───────────────────────────────────────────────────

const COLUMNAS = [
  { id: "NUEVO", label: "Nuevo", color: "#6366f1" },
  { id: "CONTACTADO", label: "Contactado", color: "#f59e0b" },
  { id: "CITA_AGENDADA", label: "Cita agendada", color: "#8b5cf6" },
  { id: "PROPUESTA_ENVIADA", label: "Propuesta enviada", color: "#e8b763" },
]

// ─── Tarjeta draggable ─────────────────────────────────────────────────────

function TarjetaKanban({ cliente, overlay }: { cliente: ClienteKanban; overlay?: boolean }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: cliente.id,
    data: { etapa: cliente.etapa },
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  }

  const tel = cliente.whatsapp ?? cliente.telefono ?? ""
  const diasEstancado = getDiasDesde(cliente.actualizadoEn)
  const accionVencida = cliente.fechaProximaAccion && new Date(cliente.fechaProximaAccion) < new Date()

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`bg-white dark:bg-[#1f1f1f] rounded-2xl border border-gray-100 dark:border-gray-800 p-3 cursor-grab active:cursor-grabbing select-none ${overlay ? "shadow-2xl ring-2 ring-[#e8b763]/50" : "hover:shadow-md transition-shadow"}`}
    >
      <div className="flex items-start justify-between gap-1 mb-2">
        <Link
          href={`/clientes/${cliente.id}`}
          onClick={(e) => e.stopPropagation()}
          className="font-semibold text-sm text-gray-900 dark:text-white hover:text-[#e8b763] transition line-clamp-1 flex-1"
        >
          {cliente.nombre}
        </Link>
        <span className="text-base">{getTemperaturaEmoji(cliente.temperatura)}</span>
      </div>

      {cliente.empresaNombre && (
        <p className="text-xs text-gray-500 mb-2 truncate">{cliente.empresaNombre}</p>
      )}

      {cliente.proximaAccion && (
        <div
          className={`text-xs px-2 py-1 rounded-lg mb-2 ${accionVencida ? "bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400" : "bg-gray-50 dark:bg-gray-800 text-gray-500"}`}
        >
          {accionVencida && <AlertCircle size={10} className="inline mr-1" />}
          {cliente.proximaAccion}
          {cliente.fechaProximaAccion && (
            <span className="ml-1 opacity-60">· {formatFecha(cliente.fechaProximaAccion)}</span>
          )}
        </div>
      )}

      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          {cliente.valorEstimado && (
            <span className="text-xs font-semibold text-gray-600 dark:text-gray-300">
              {formatMoney(cliente.valorEstimado)}
            </span>
          )}
          {diasEstancado >= 7 && (
            <Badge variante="vencido">
              <AlertCircle size={9} /> {diasEstancado}d
            </Badge>
          )}
        </div>
        {tel && (
          <a
            href={`https://wa.me/${tel.replace(/\D/g, "").replace(/^(?!52)/, "52")}?text=${encodeURIComponent(`Hola ${cliente.nombre}`)}`}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="p-1 rounded-lg text-green-500 hover:bg-green-50 dark:hover:bg-green-900/20 transition"
          >
            <MessageCircle size={14} />
          </a>
        )}
      </div>
    </div>
  )
}

// ─── Columna droppable ─────────────────────────────────────────────────────

function ColumnaKanban({
  id,
  label,
  color,
  clientes,
}: {
  id: string
  label: string
  color: string
  clientes: ClienteKanban[]
}) {
  const total = clientes.reduce((s, c) => s + (c.valorEstimado ?? 0), 0)

  return (
    <div className="flex flex-col min-w-[280px] max-w-[300px]">
      {/* Header columna */}
      <div className="flex items-center justify-between mb-3 px-1">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
          <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">{label}</span>
          <span
            className="text-xs px-2 py-0.5 rounded-full font-medium text-white"
            style={{ backgroundColor: color }}
          >
            {clientes.length}
          </span>
        </div>
        {total > 0 && (
          <span className="text-xs text-gray-400 font-medium">{formatMoney(total)}</span>
        )}
      </div>

      {/* Tarjetas */}
      <div className="flex-1 min-h-[100px] rounded-2xl bg-gray-50 dark:bg-gray-900/50 border-2 border-dashed border-gray-200 dark:border-gray-800 p-2 space-y-2 transition-colors">
        <SortableContext items={clientes.map((c) => c.id)} strategy={verticalListSortingStrategy}>
          {clientes.map((c) => (
            <TarjetaKanban key={c.id} cliente={c} />
          ))}
        </SortableContext>
        {clientes.length === 0 && (
          <div className="flex items-center justify-center h-20 text-xs text-gray-300 dark:text-gray-600">
            Arrastra aquí
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Componente principal ─────────────────────────────────────────────────

export function EmbudoKanban({
  porEtapa: porEtapaInicial,
  resumen,
}: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  porEtapa: Record<string, any[]>
  resumen?: { completados: number; perdidos: number; archivados: number }
}) {
  const [porEtapa, setPorEtapa] = useState<PorEtapa>(() => {
    const resultado: PorEtapa = {}
    for (const col of COLUMNAS) {
      resultado[col.id] = (porEtapaInicial[col.id] ?? []) as ClienteKanban[]
    }
    return resultado
  })

  const [activo, setActivo] = useState<ClienteKanban | null>(null)
  const [, start] = useTransition()

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  )

  function encontrarEtapa(clienteId: string): string | undefined {
    return COLUMNAS.find((col) => porEtapa[col.id]?.some((c) => c.id === clienteId))?.id
  }

  function handleDragStart(event: DragStartEvent) {
    const etapa = encontrarEtapa(event.active.id as string)
    if (!etapa) return
    const cliente = porEtapa[etapa]?.find((c) => c.id === event.active.id)
    if (cliente) setActivo(cliente)
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    setActivo(null)
    if (!over) return

    const etapaOrigen = encontrarEtapa(active.id as string)
    if (!etapaOrigen) return

    // Determinar etapa destino
    let etapaDestino: string | undefined
    if (COLUMNAS.some((c) => c.id === over.id)) {
      etapaDestino = over.id as string
    } else {
      etapaDestino = encontrarEtapa(over.id as string)
    }

    if (!etapaDestino || etapaDestino === etapaOrigen) return

    const cliente = porEtapa[etapaOrigen]?.find((c) => c.id === active.id)
    if (!cliente) return

    // Actualizar UI optimisticamente
    setPorEtapa((prev) => {
      const nuevo = { ...prev }
      nuevo[etapaOrigen] = nuevo[etapaOrigen].filter((c) => c.id !== active.id)
      nuevo[etapaDestino!] = [{ ...cliente, etapa: etapaDestino! }, ...nuevo[etapaDestino!]]
      return nuevo
    })

    // Persistir en servidor
    start(async () => {
      const r = await moverClienteEtapa(active.id as string, etapaDestino!)
      if (!r.ok) {
        // Revertir
        setPorEtapa((prev) => {
          const revert = { ...prev }
          revert[etapaDestino!] = revert[etapaDestino!].filter((c) => c.id !== active.id)
          revert[etapaOrigen] = [cliente, ...revert[etapaOrigen]]
          return revert
        })
      }
    })
  }

  const total = COLUMNAS.reduce((s, col) => s + (porEtapa[col.id]?.length ?? 0), 0)

  return (
    <div className="space-y-4">
      {/* Accesos rápidos */}
      {resumen && (
        <div className="flex gap-3 flex-wrap">
          <Link
            href="/completados"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 text-sm font-medium hover:bg-green-100 transition"
          >
            ✅ Completados ({resumen.completados})
          </Link>
          <Link
            href="/perdidos"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-400 text-sm font-medium hover:bg-gray-100 dark:hover:bg-gray-700 transition"
          >
            ❌ Perdidos ({resumen.perdidos})
          </Link>
          <Link
            href="/archivados"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-stone-50 dark:bg-stone-900/30 text-stone-600 dark:text-stone-400 text-sm font-medium hover:bg-stone-100 transition"
          >
            📦 Archivados ({resumen.archivados})
          </Link>
          <span className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#e8b763]/10 text-[#b8872a] text-sm font-medium">
            📊 {total} activos en embudo
          </span>
        </div>
      )}

      {/* Kanban */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="flex gap-4 overflow-x-auto pb-4 -mx-1 px-1">
          {COLUMNAS.map((col) => (
            <ColumnaKanban
              key={col.id}
              id={col.id}
              label={col.label}
              color={col.color}
              clientes={porEtapa[col.id] ?? []}
            />
          ))}
        </div>

        <DragOverlay>
          {activo && <TarjetaKanban cliente={activo} overlay />}
        </DragOverlay>
      </DndContext>
    </div>
  )
}
