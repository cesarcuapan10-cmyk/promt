"use client"

import { useState, useCallback, useEffect, useReducer } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
  type DragOverEvent,
  closestCorners,
} from "@dnd-kit/core"
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { motion, AnimatePresence } from "framer-motion"
import {
  Trophy,
  XCircle,
  Archive,
  ExternalLink,
  Clock,
  AlertCircle,
  ChevronRight,
} from "lucide-react"

import { Badge } from "@/app/components/ui/Badge"
import { Button } from "@/app/components/ui/Button"
import { Modal } from "@/app/components/ui/Modal"
import { formatMoney } from "@/app/lib/utils"
import {
  moverEtapa,
  marcarGanado,
  marcarPerdido,
  contarEstados,
} from "@/app/actions/embudo"

// ─── Types ────────────────────────────────────────────────────────────────────

interface Etiqueta {
  id: string
  nombre: string
  color: string
}

interface EtiquetaCliente {
  id: string
  etiqueta: Etiqueta
}

interface Vendedor {
  nombre: string
}

interface Cliente {
  id: string
  nombre: string
  etapa: string
  estadoCartera: string
  temperatura: string
  valorEstimado: number | null
  fechaProximaAccion: Date | null
  proximaAccion: string | null
  actualizadoEn: Date
  empresaNombre: string | null
  etiquetas: EtiquetaCliente[]
  vendedor: Vendedor
}

interface ConteoEstados {
  ganados: number
  perdidos: number
  archivados: number
  activosPorEtapa: { etapa: string; count: number; valorTotal: number }[]
}

interface Props {
  porEtapa: Record<string, Cliente[]>
  conteos: ConteoEstados
}

// ─── Constants ────────────────────────────────────────────────────────────────

const ETAPAS = [
  { id: "NUEVO", label: "Nuevo", color: "#6366f1" },
  { id: "CONTACTADO", label: "Contactado", color: "#3b82f6" },
  { id: "CITA_AGENDADA", label: "Cita Agendada", color: "#f59e0b" },
  { id: "PROPUESTA_ENVIADA", label: "Propuesta Enviada", color: "#8b5cf6" },
  { id: "GANADO", label: "Ganado", color: "#22c55e" },
  { id: "PERDIDO", label: "Perdido", color: "#ef4444" },
] as const

const MOTIVOS_PERDIDA = [
  "Está caro",
  "Lo voy a pensar",
  "Tengo que consultarlo",
  "Se fue con la competencia",
  "No contestó",
  "No era buen momento",
  "No calificaba",
]

const shouldReduceMotion =
  typeof window !== "undefined"
    ? window.matchMedia("(prefers-reduced-motion: reduce)").matches
    : false

// ─── Helpers ─────────────────────────────────────────────────────────────────

function temperaturaEmoji(t: string) {
  if (t === "CALIENTE") return "🔥"
  if (t === "FRIO") return "🔵"
  return "🟡"
}

function diasEnEtapa(actualizadoEn: Date): number {
  return Math.floor((Date.now() - new Date(actualizadoEn).getTime()) / 86400000)
}

function accionVencida(fecha: Date | null | undefined): boolean {
  if (!fecha) return false
  return new Date(fecha) < new Date()
}

// ─── Tarjeta individual (sortable) ────────────────────────────────────────────

function TarjetaCliente({
  cliente,
  overlay = false,
}: {
  cliente: Cliente
  overlay?: boolean
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: cliente.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.3 : 1,
  }

  const dias = diasEnEtapa(cliente.actualizadoEn)
  const vencida = accionVencida(cliente.fechaProximaAccion)
  const estancado = dias > 7

  const card = (
    <div
      className={`
        rounded-2xl border bg-white dark:bg-[#1f1f1f] p-4 transition-all duration-200
        ${overlay ? "shadow-2xl rotate-1 scale-105" : "hover:shadow-md hover:-translate-y-0.5"}
        border-gray-100 dark:border-gray-800 select-none
      `}
    >
      {/* Nombre + temperatura */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <Link
          href={`/clientes/${cliente.id}`}
          className="font-semibold text-sm text-gray-900 dark:text-white hover:text-brand truncate flex-1 min-w-0"
          onClick={(e) => e.stopPropagation()}
          draggable={false}
        >
          {cliente.nombre}
        </Link>
        <span className="text-base leading-none shrink-0" title={cliente.temperatura}>
          {temperaturaEmoji(cliente.temperatura)}
        </span>
      </div>

      {/* Empresa */}
      {cliente.empresaNombre && (
        <p className="text-xs text-gray-500 dark:text-gray-400 truncate mb-2">
          {cliente.empresaNombre}
        </p>
      )}

      {/* Valor estimado */}
      {cliente.valorEstimado != null && (
        <p className="text-sm font-medium text-brand mb-2">
          {formatMoney(cliente.valorEstimado)}
        </p>
      )}

      {/* Badges */}
      <div className="flex flex-wrap gap-1 mt-2">
        {vencida && cliente.proximaAccion && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700 border border-red-200">
            <AlertCircle className="w-3 h-3" />
            {cliente.proximaAccion}
          </span>
        )}
        {estancado && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700 border border-amber-200">
            <Clock className="w-3 h-3" />
            {dias}d sin avanzar
          </span>
        )}
      </div>
    </div>
  )

  if (overlay) return card

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      {card}
    </div>
  )
}

// ─── Columna ──────────────────────────────────────────────────────────────────

function ColumnaKanban({
  etapa,
  clientes,
  color,
}: {
  etapa: { id: string; label: string; color: string }
  clientes: Cliente[]
  color: string
}) {
  const valorTotal = clientes.reduce((s, c) => s + (c.valorEstimado ?? 0), 0)

  return (
    <div className="flex flex-col min-w-[260px] w-[260px] shrink-0">
      {/* Cabecera */}
      <div
        className="flex items-center justify-between px-3 py-2.5 rounded-xl mb-3"
        style={{ backgroundColor: `${color}15`, borderLeft: `3px solid ${color}` }}
      >
        <span className="text-sm font-semibold" style={{ color }}>
          {etapa.label}
        </span>
        <div className="flex items-center gap-2">
          {valorTotal > 0 && (
            <span className="text-xs text-gray-500 font-medium">
              {formatMoney(valorTotal)}
            </span>
          )}
          <span
            className="text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center text-white"
            style={{ backgroundColor: color }}
          >
            {clientes.length}
          </span>
        </div>
      </div>

      {/* Cards */}
      <SortableContext
        items={clientes.map((c) => c.id)}
        strategy={verticalListSortingStrategy}
      >
        <div className="flex flex-col gap-2 min-h-[80px]">
          {clientes.map((c) => (
            <TarjetaCliente key={c.id} cliente={c} />
          ))}
          {clientes.length === 0 && (
            <div className="text-center py-8 text-xs text-gray-400 border-2 border-dashed border-gray-100 dark:border-gray-800 rounded-xl">
              Sin clientes
            </div>
          )}
        </div>
      </SortableContext>
    </div>
  )
}

// ─── Modal Ganado ─────────────────────────────────────────────────────────────

function ModalGanado({
  cliente,
  onCerrar,
  onConfirmar,
}: {
  cliente: Cliente | null
  onCerrar: () => void
  onConfirmar: () => void
}) {
  const [cargando, setCargando] = useState(false)

  async function handleConfirmar() {
    setCargando(true)
    await onConfirmar()
    setCargando(false)
  }

  return (
    <Modal abierto={!!cliente} onCerrar={onCerrar} titulo="¿Marcar como GANADO? 🎉" tamaño="sm">
      <p className="text-gray-600 dark:text-gray-400 text-sm mb-6">
        <strong>{cliente?.nombre}</strong> pasará a <strong>Completados</strong>. Esta acción
        quedará registrada en el historial del cliente.
      </p>
      <div className="flex gap-3 justify-end">
        <button
          onClick={onCerrar}
          className="px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-sm hover:bg-gray-50 dark:hover:bg-white/5 transition"
        >
          Cancelar
        </button>
        <Button variante="exito" cargando={cargando} onClick={handleConfirmar}>
          Sí, marcar GANADO 🎉
        </Button>
      </div>
    </Modal>
  )
}

// ─── Modal Perdido ────────────────────────────────────────────────────────────

function ModalPerdido({
  cliente,
  onCerrar,
  onConfirmar,
}: {
  cliente: Cliente | null
  onCerrar: () => void
  onConfirmar: (motivo: string) => void
}) {
  const [motivo, setMotivo] = useState("")
  const [cargando, setCargando] = useState(false)

  async function handleConfirmar() {
    if (!motivo) return
    setCargando(true)
    await onConfirmar(motivo)
    setCargando(false)
    setMotivo("")
  }

  return (
    <Modal abierto={!!cliente} onCerrar={onCerrar} titulo="Motivo de pérdida" tamaño="sm">
      <p className="text-gray-600 dark:text-gray-400 text-sm mb-4">
        ¿Por qué se perdió <strong>{cliente?.nombre}</strong>?
      </p>
      <div className="space-y-2 mb-6">
        {MOTIVOS_PERDIDA.map((m) => (
          <button
            key={m}
            onClick={() => setMotivo(m)}
            className={`w-full text-left px-4 py-2.5 rounded-xl text-sm transition border ${
              motivo === m
                ? "border-red-500 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 font-medium"
                : "border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-white/5"
            }`}
          >
            {m}
          </button>
        ))}
      </div>
      <div className="flex gap-3 justify-end">
        <button
          onClick={onCerrar}
          className="px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-sm hover:bg-gray-50 dark:hover:bg-white/5 transition"
        >
          Cancelar
        </button>
        <Button
          variante="peligro"
          cargando={cargando}
          onClick={handleConfirmar}
          disabled={!motivo}
        >
          Marcar como perdido
        </Button>
      </div>
    </Modal>
  )
}

// ─── Board state reducer ──────────────────────────────────────────────────────

type BoardState = Record<string, Cliente[]>

type BoardAction =
  | { type: "MOVE"; clienteId: string; fromEtapa: string; toEtapa: string }
  | { type: "REVERT"; state: BoardState }

function boardReducer(state: BoardState, action: BoardAction): BoardState {
  if (action.type === "REVERT") return action.state
  if (action.type === "MOVE") {
    const { clienteId, fromEtapa, toEtapa } = action
    const cliente = state[fromEtapa]?.find((c) => c.id === clienteId)
    if (!cliente || fromEtapa === toEtapa) return state
    return {
      ...state,
      [fromEtapa]: (state[fromEtapa] ?? []).filter((c) => c.id !== clienteId),
      [toEtapa]: [{ ...cliente, etapa: toEtapa }, ...(state[toEtapa] ?? [])],
    }
  }
  return state
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function EmbudoKanban({ porEtapa, conteos }: Props) {
  const router = useRouter()
  const [board, dispatch] = useReducer(boardReducer, porEtapa as BoardState)
  const [activeId, setActiveId] = useState<string | null>(null)
  const [overEtapa, setOverEtapa] = useState<string | null>(null)
  const [modalGanado, setModalGanado] = useState<Cliente | null>(null)
  const [modalPerdido, setModalPerdido] = useState<Cliente | null>(null)
  const [pendingMove, setPendingMove] = useState<{
    clienteId: string
    fromEtapa: string
    toEtapa: string
    prevState: BoardState
  } | null>(null)

  // Sync when server data changes
  useEffect(() => {
    // Only update from props on mount
  }, [])

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  )

  const findEtapaOfCliente = useCallback(
    (id: string): string | null => {
      for (const etapa of ETAPAS) {
        if (board[etapa.id]?.some((c) => c.id === id)) return etapa.id
      }
      return null
    },
    [board]
  )

  const activeCliente = activeId ? Object.values(board).flat().find((c) => c.id === activeId) ?? null : null

  function handleDragStart(event: DragStartEvent) {
    setActiveId(String(event.active.id))
  }

  function handleDragOver(event: DragOverEvent) {
    const overId = event.over?.id
    if (!overId) return
    // Check if over is an etapa id
    const etapaOver = ETAPAS.find((e) => e.id === overId)
    if (etapaOver) {
      setOverEtapa(etapaOver.id)
      return
    }
    // Check if over is a client id
    const etapaDest = findEtapaOfCliente(String(overId))
    setOverEtapa(etapaDest)
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    setActiveId(null)
    setOverEtapa(null)

    if (!over) return

    const clienteId = String(active.id)
    const fromEtapa = findEtapaOfCliente(clienteId)
    if (!fromEtapa) return

    let toEtapa: string | null = null
    const etapaOver = ETAPAS.find((e) => e.id === over.id)
    if (etapaOver) {
      toEtapa = etapaOver.id
    } else {
      toEtapa = findEtapaOfCliente(String(over.id))
    }

    if (!toEtapa || toEtapa === fromEtapa) return

    const prevState = { ...board, [fromEtapa]: [...(board[fromEtapa] ?? [])], [toEtapa]: [...(board[toEtapa] ?? [])] }

    // Optimistic update
    dispatch({ type: "MOVE", clienteId, fromEtapa, toEtapa })

    if (toEtapa === "GANADO") {
      const cliente = prevState[fromEtapa]?.find((c) => c.id === clienteId) ?? null
      setModalGanado(cliente)
      setPendingMove({ clienteId, fromEtapa, toEtapa, prevState })
      return
    }

    if (toEtapa === "PERDIDO") {
      const cliente = prevState[fromEtapa]?.find((c) => c.id === clienteId) ?? null
      setModalPerdido(cliente)
      setPendingMove({ clienteId, fromEtapa, toEtapa, prevState })
      return
    }

    // Regular move
    moverEtapa(clienteId, toEtapa).then((res) => {
      if (!res.ok) {
        dispatch({ type: "REVERT", state: prevState })
      }
    })
  }

  async function confirmarGanado() {
    if (!pendingMove) return
    const res = await marcarGanado(pendingMove.clienteId)
    if (!res.ok) {
      dispatch({ type: "REVERT", state: pendingMove.prevState })
    } else {
      // Remove from board since estadoCartera changed
      dispatch({
        type: "REVERT",
        state: {
          ...pendingMove.prevState,
          [pendingMove.fromEtapa]: (pendingMove.prevState[pendingMove.fromEtapa] ?? []).filter(
            (c) => c.id !== pendingMove.clienteId
          ),
        },
      })
    }
    setPendingMove(null)
    setModalGanado(null)
  }

  async function confirmarPerdido(motivo: string) {
    if (!pendingMove) return
    const res = await marcarPerdido(pendingMove.clienteId, motivo)
    if (!res.ok) {
      dispatch({ type: "REVERT", state: pendingMove.prevState })
    } else {
      dispatch({
        type: "REVERT",
        state: {
          ...pendingMove.prevState,
          [pendingMove.fromEtapa]: (pendingMove.prevState[pendingMove.fromEtapa] ?? []).filter(
            (c) => c.id !== pendingMove.clienteId
          ),
        },
      })
    }
    setPendingMove(null)
    setModalPerdido(null)
  }

  function cancelarModal() {
    if (pendingMove) {
      dispatch({ type: "REVERT", state: pendingMove.prevState })
      setPendingMove(null)
    }
    setModalGanado(null)
    setModalPerdido(null)
  }

  return (
    <>
      {/* Contadores del encabezado */}
      <div className="flex flex-wrap gap-3 mb-4">
        <button
          onClick={() => router.push("/clientes?estadoCartera=GANADO")}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 hover:bg-green-100 transition text-sm"
        >
          <Trophy className="w-4 h-4 text-green-600" />
          <span className="text-green-700 dark:text-green-400 font-medium">
            Completados ({conteos.ganados})
          </span>
          <ChevronRight className="w-3.5 h-3.5 text-green-500" />
        </button>
        <button
          onClick={() => router.push("/clientes?estadoCartera=PERDIDO")}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 hover:bg-red-100 transition text-sm"
        >
          <XCircle className="w-4 h-4 text-red-600" />
          <span className="text-red-700 dark:text-red-400 font-medium">
            Perdidos ({conteos.perdidos})
          </span>
          <ChevronRight className="w-3.5 h-3.5 text-red-500" />
        </button>
        <button
          onClick={() => router.push("/clientes?estadoCartera=ARCHIVADO")}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-stone-50 dark:bg-stone-900/20 border border-stone-200 dark:border-stone-800 hover:bg-stone-100 transition text-sm"
        >
          <Archive className="w-4 h-4 text-stone-600" />
          <span className="text-stone-700 dark:text-stone-400 font-medium">
            Archivados ({conteos.archivados})
          </span>
          <ChevronRight className="w-3.5 h-3.5 text-stone-500" />
        </button>
      </div>

      {/* Tablero */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <div className="flex gap-4 overflow-x-auto pb-6 -mx-4 px-4 md:-mx-6 md:px-6">
          {ETAPAS.map((etapa) => (
            <motion.div
              key={etapa.id}
              layout={!shouldReduceMotion}
              className={`transition-all duration-150 ${overEtapa === etapa.id ? "ring-2 ring-offset-1 rounded-2xl" : ""}`}
              style={overEtapa === etapa.id ? { ringColor: etapa.color } : {}}
            >
              <ColumnaKanban
                etapa={etapa}
                clientes={board[etapa.id] ?? []}
                color={etapa.color}
              />
            </motion.div>
          ))}
        </div>

        <DragOverlay dropAnimation={shouldReduceMotion ? null : undefined}>
          {activeCliente && <TarjetaCliente cliente={activeCliente} overlay />}
        </DragOverlay>
      </DndContext>

      {/* Modales */}
      <ModalGanado
        cliente={modalGanado}
        onCerrar={cancelarModal}
        onConfirmar={confirmarGanado}
      />
      <ModalPerdido
        cliente={modalPerdido}
        onCerrar={cancelarModal}
        onConfirmar={confirmarPerdido}
      />
    </>
  )
}
