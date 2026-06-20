"use client"

import { useState, useTransition } from "react"
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
  type DragStartEvent,
  type DragEndEvent,
} from "@dnd-kit/core"
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { Badge } from "@/app/components/ui/Badge"
import {
  moverClienteEtapa,
  type ClienteEtapa,
  type ClientesPorEtapa,
  type EtapaKey,
} from "@/app/actions/embudo"

const ETAPAS: EtapaKey[] = [
  "NUEVO",
  "CONTACTADO",
  "CITA_AGENDADA",
  "PROPUESTA_ENVIADA",
  "GANADO",
]

const ETAPA_CONFIG: Record<
  EtapaKey,
  { label: string; color: string; textColor: string; borderColor: string; bgHeader: string }
> = {
  NUEVO: {
    label: "Nuevo",
    color: "bg-purple-50 dark:bg-purple-900/10",
    textColor: "text-purple-700 dark:text-purple-400",
    borderColor: "border-purple-200 dark:border-purple-800",
    bgHeader: "bg-purple-100 dark:bg-purple-900/20",
  },
  CONTACTADO: {
    label: "Contactado",
    color: "bg-blue-50 dark:bg-blue-900/10",
    textColor: "text-blue-700 dark:text-blue-400",
    borderColor: "border-blue-200 dark:border-blue-800",
    bgHeader: "bg-blue-100 dark:bg-blue-900/20",
  },
  CITA_AGENDADA: {
    label: "Cita agendada",
    color: "bg-amber-50 dark:bg-amber-900/10",
    textColor: "text-amber-700 dark:text-amber-400",
    borderColor: "border-amber-200 dark:border-amber-800",
    bgHeader: "bg-amber-100 dark:bg-amber-900/20",
  },
  PROPUESTA_ENVIADA: {
    label: "Propuesta enviada",
    color: "bg-orange-50 dark:bg-orange-900/10",
    textColor: "text-orange-700 dark:text-orange-400",
    borderColor: "border-orange-200 dark:border-orange-800",
    bgHeader: "bg-orange-100 dark:bg-orange-900/20",
  },
  GANADO: {
    label: "Ganado",
    color: "bg-green-50 dark:bg-green-900/10",
    textColor: "text-green-700 dark:text-green-400",
    borderColor: "border-green-200 dark:border-green-800",
    bgHeader: "bg-green-100 dark:bg-green-900/20",
  },
}

function formatValor(valor: number | null) {
  if (!valor) return null
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    minimumFractionDigits: 0,
  }).format(valor)
}

function diasSinContacto(fecha: Date): number {
  const ahora = new Date()
  const diff = ahora.getTime() - new Date(fecha).getTime()
  return Math.floor(diff / (1000 * 60 * 60 * 24))
}

function TemperaturaBadge({ temperatura }: { temperatura: string }) {
  const map: Record<string, { variante: "frio" | "tibio" | "caliente"; label: string }> = {
    FRIO: { variante: "frio", label: "Frío" },
    TIBIO: { variante: "tibio", label: "Tibio" },
    CALIENTE: { variante: "caliente", label: "Caliente" },
  }
  const cfg = map[temperatura] ?? { variante: "default" as const, label: temperatura }
  return <Badge variante={cfg.variante}>{cfg.label}</Badge>
}

function ClienteCard({
  cliente,
  isDragging,
}: {
  cliente: ClienteEtapa
  isDragging?: boolean
}) {
  const dias = diasSinContacto(cliente.actualizadoEn)

  return (
    <div
      className={`bg-white dark:bg-[#1f1f1f] border border-gray-100 dark:border-gray-800 rounded-xl p-3 space-y-2 shadow-sm ${
        isDragging ? "opacity-50" : ""
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-medium text-sm text-gray-900 dark:text-white truncate">{cliente.nombre}</p>
          {cliente.empresaNombre && (
            <p className="text-xs text-gray-500 truncate">{cliente.empresaNombre}</p>
          )}
        </div>
        <TemperaturaBadge temperatura={cliente.temperatura} />
      </div>
      <div className="flex items-center justify-between gap-2 text-xs text-gray-400">
        <span>{dias === 0 ? "Hoy" : `Hace ${dias}d`}</span>
        {cliente.valorEstimado && (
          <span className="font-medium text-gray-600 dark:text-gray-300">
            {formatValor(cliente.valorEstimado)}
          </span>
        )}
      </div>
    </div>
  )
}

function SortableClienteCard({ cliente }: { cliente: ClienteEtapa }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: cliente.id,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="touch-manipulation cursor-grab active:cursor-grabbing"
    >
      <ClienteCard cliente={cliente} isDragging={isDragging} />
    </div>
  )
}

function Columna({
  etapa,
  clientes,
}: {
  etapa: EtapaKey
  clientes: ClienteEtapa[]
}) {
  const cfg = ETAPA_CONFIG[etapa]
  const totalValor = clientes.reduce((s, c) => s + (c.valorEstimado ?? 0), 0)

  return (
    <div
      className={`flex-shrink-0 w-[280px] flex flex-col rounded-2xl border ${cfg.borderColor} ${cfg.color}`}
    >
      <div className={`p-3 rounded-t-2xl ${cfg.bgHeader}`}>
        <div className="flex items-center justify-between mb-1">
          <span className={`text-sm font-semibold ${cfg.textColor}`}>{cfg.label}</span>
          <span
            className={`text-xs font-bold px-2 py-0.5 rounded-full ${cfg.bgHeader} ${cfg.textColor} border ${cfg.borderColor}`}
          >
            {clientes.length}
          </span>
        </div>
        {totalValor > 0 && (
          <p className="text-xs text-gray-500">{formatValor(totalValor)}</p>
        )}
      </div>
      <SortableContext items={clientes.map((c) => c.id)} strategy={verticalListSortingStrategy}>
        <div className="flex-1 p-2 space-y-2 min-h-[120px]">
          {clientes.length === 0 ? (
            <div className="border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-xl p-4 text-center text-xs text-gray-400 h-full flex items-center justify-center min-h-[80px]">
              Arrastra clientes aquí
            </div>
          ) : (
            clientes.map((cliente) => (
              <SortableClienteCard key={cliente.id} cliente={cliente} />
            ))
          )}
        </div>
      </SortableContext>
    </div>
  )
}

interface EmbudoKanbanProps {
  clientesPorEtapa: ClientesPorEtapa
}

export function EmbudoKanban({ clientesPorEtapa }: EmbudoKanbanProps) {
  const [estado, setEstado] = useState<ClientesPorEtapa>(clientesPorEtapa)
  const [activeCliente, setActiveCliente] = useState<ClienteEtapa | null>(null)
  const [, startTransition] = useTransition()

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    })
  )

  function encontrarEtapaDeCliente(clienteId: string): EtapaKey | null {
    for (const etapa of ETAPAS) {
      if (estado[etapa].some((c) => c.id === clienteId)) return etapa
    }
    return null
  }

  function encontrarEtapaPorContenedor(id: string): EtapaKey | null {
    if (ETAPAS.includes(id as EtapaKey)) return id as EtapaKey
    return encontrarEtapaDeCliente(id)
  }

  function onDragStart(event: DragStartEvent) {
    const etapa = encontrarEtapaDeCliente(String(event.active.id))
    if (!etapa) return
    const cliente = estado[etapa].find((c) => c.id === event.active.id)
    if (cliente) setActiveCliente(cliente)
  }

  function onDragEnd(event: DragEndEvent) {
    setActiveCliente(null)
    const { active, over } = event
    if (!over) return

    const etapaOrigen = encontrarEtapaDeCliente(String(active.id))
    const etapaDestino = encontrarEtapaPorContenedor(String(over.id))

    if (!etapaOrigen || !etapaDestino || etapaOrigen === etapaDestino) return

    const cliente = estado[etapaOrigen].find((c) => c.id === active.id)
    if (!cliente) return

    // Optimistic update
    setEstado((prev) => {
      const nuevo = { ...prev }
      nuevo[etapaOrigen] = prev[etapaOrigen].filter((c) => c.id !== active.id)
      nuevo[etapaDestino] = [{ ...cliente, etapa: etapaDestino }, ...prev[etapaDestino]]
      return nuevo
    })

    startTransition(() => {
      moverClienteEtapa(String(active.id), etapaDestino).catch(() => {
        // Revert on error
        setEstado(clientesPorEtapa)
      })
    })
  }

  return (
    <div className="overflow-x-auto pb-4">
      <div className="flex gap-4" style={{ minWidth: `${ETAPAS.length * 296}px` }}>
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={onDragStart}
          onDragEnd={onDragEnd}
        >
          {ETAPAS.map((etapa) => (
            <Columna key={etapa} etapa={etapa} clientes={estado[etapa]} />
          ))}
          <DragOverlay>
            {activeCliente && <ClienteCard cliente={activeCliente} />}
          </DragOverlay>
        </DndContext>
      </div>
    </div>
  )
}
