"use client"

import { useState, useCallback, useTransition, useEffect, useRef } from "react"
import Link from "next/link"
import {
  Users,
  Plus,
  Search,
  LayoutGrid,
  List,
  Mail,
  Star,
  MessageCircle,
  ChevronLeft,
  ChevronRight,
  X,
  Archive,
  AlertCircle,
} from "lucide-react"
import { Card } from "@/app/components/ui/Card"
import { Badge } from "@/app/components/ui/Badge"
import { Button } from "@/app/components/ui/Button"
import { Input, Select } from "@/app/components/ui/Input"
import { ConfirmModal } from "@/app/components/ui/Modal"
import { ModalCliente } from "./ModalCliente"
import {
  listarClientes,
  eliminarCliente,
  toggleFavorito,
  cambiarEtapa,
  cambiarEstadoCartera,
} from "@/app/actions/clientes"
import {
  formatMoney,
  encodeWhatsApp,
  getTemperaturaEmoji,
  getTemperaturaLabel,
  etapaLabel,
  getDiasDesde,
  formatFecha,
} from "@/app/lib/utils"
import type { FiltrosClientes } from "@/app/actions/clientes"

// ─── Types ────────────────────────────────────────────────────────────────

type ClienteItem = {
  id: string
  nombre: string
  correo: string | null
  telefono: string | null
  whatsapp: string | null
  empresaNombre: string | null
  empresaPuesto: string | null
  etapa: string
  temperatura: string
  estadoCartera: string
  origen: string | null
  valorEstimado: number | null
  ultimoContacto: Date | null
  proximaAccion: string | null
  fechaProximaAccion: Date | null
  notas: string | null
  creadoEn: Date
  esFavorito: boolean
  etiquetas: { etiqueta: { nombre: string; color: string } }[]
  _count: { pagos: number; notasHistorial: number }
}

type DatosIniciales = {
  clientes: ClienteItem[]
  total: number
  paginas: number
  pagina: number
  totalFavoritos: number
}

// ─── Badge helpers ────────────────────────────────────────────────────────

type BadgeVariante = "caliente" | "tibio" | "frio" | "activo" | "ganado" | "perdido" | "archivado" | "default"

function temperaturaVariante(t: string): BadgeVariante {
  if (t === "CALIENTE") return "caliente"
  if (t === "FRIO") return "frio"
  return "tibio"
}

function etapaVariante(e: string): BadgeVariante {
  const map: Record<string, BadgeVariante> = {
    GANADO: "ganado",
    PERDIDO: "perdido",
    ARCHIVADO: "archivado",
    ACTIVO: "activo",
  }
  return map[e] ?? "default"
}

// ─── Skeleton ─────────────────────────────────────────────────────────────

function CardSkeleton() {
  return (
    <div className="rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-[#1f1f1f] p-6 animate-pulse space-y-3">
      <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-2/3" />
      <div className="h-4 bg-gray-100 dark:bg-gray-800 rounded w-1/2" />
      <div className="flex gap-2 pt-2">
        <div className="h-6 bg-gray-100 dark:bg-gray-800 rounded-full w-16" />
        <div className="h-6 bg-gray-100 dark:bg-gray-800 rounded-full w-14" />
      </div>
    </div>
  )
}

// ─── Chip de filtro activo ─────────────────────────────────────────────────

function FiltroChip({ label, onQuitar }: { label: string; onQuitar: () => void }) {
  return (
    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-[#e8b763]/20 text-[#b8872a] border border-[#e8b763]/40">
      {label}
      <button onClick={onQuitar} className="hover:text-red-500 transition" aria-label="Quitar filtro">
        <X size={11} />
      </button>
    </span>
  )
}

// ─── Tarjeta de cliente ────────────────────────────────────────────────────

function ClienteCard({
  cliente,
  onFavorito,
  onCambiarEtapa,
  onArchivar,
}: {
  cliente: ClienteItem
  onFavorito: (id: string) => void
  onCambiarEtapa: (c: ClienteItem) => void
  onArchivar: (c: ClienteItem) => void
}) {
  const tel = cliente.whatsapp ?? cliente.telefono ?? ""
  const diasSin = getDiasDesde(cliente.ultimoContacto)
  const accionVencida =
    cliente.fechaProximaAccion && new Date(cliente.fechaProximaAccion) < new Date()

  return (
    <Card hover padding="md" className="flex flex-col gap-3 relative">
      {/* Favorito */}
      <button
        onClick={() => onFavorito(cliente.id)}
        className="absolute top-4 right-4 text-gray-300 hover:text-[#e8b763] transition"
        aria-label={cliente.esFavorito ? "Quitar favorito" : "Marcar favorito"}
      >
        <Star size={15} className={cliente.esFavorito ? "fill-[#e8b763] text-[#e8b763]" : ""} />
      </button>

      {/* Header */}
      <div className="pr-6">
        <Link
          href={`/clientes/${cliente.id}`}
          className="font-semibold text-gray-900 dark:text-white hover:text-[#e8b763] transition line-clamp-1"
        >
          {cliente.nombre}
        </Link>
        {cliente.empresaNombre && (
          <p className="text-xs text-gray-500 mt-0.5 truncate">{cliente.empresaNombre}</p>
        )}
      </div>

      {/* Badges */}
      <div className="flex flex-wrap gap-1.5">
        <Badge variante={temperaturaVariante(cliente.temperatura)}>
          {getTemperaturaEmoji(cliente.temperatura)} {getTemperaturaLabel(cliente.temperatura)}
        </Badge>
        <Badge variante={etapaVariante(cliente.etapa)}>{etapaLabel(cliente.etapa)}</Badge>
      </div>

      {/* Próxima acción */}
      {cliente.proximaAccion && (
        <div
          className={`text-xs px-2 py-1 rounded-lg ${accionVencida ? "bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400" : "bg-gray-50 text-gray-500 dark:bg-gray-800"}`}
        >
          {accionVencida && <AlertCircle size={10} className="inline mr-1" />}
          {cliente.proximaAccion}
          {cliente.fechaProximaAccion && (
            <span className="ml-1 opacity-70">· {formatFecha(cliente.fechaProximaAccion)}</span>
          )}
        </div>
      )}

      {/* Stats */}
      <div className="flex items-center justify-between text-xs text-gray-400 pt-1 border-t border-gray-50 dark:border-gray-800">
        <span className={diasSin > 7 ? "text-red-500" : ""}>
          {diasSin < 999 ? `${diasSin}d sin contacto` : "Sin contacto"}
        </span>
        {cliente.valorEstimado ? (
          <span className="font-medium text-gray-600 dark:text-gray-300">
            {formatMoney(cliente.valorEstimado)}
          </span>
        ) : null}
      </div>

      {/* Acciones rápidas */}
      <div className="flex gap-2">
        {tel && (
          <a
            href={`https://wa.me/${encodeWhatsApp(tel, `Hola ${cliente.nombre}`).split("wa.me/")[1]?.split("?")[0] ?? tel.replace(/\D/g, "")}?text=${encodeURIComponent(`Hola ${cliente.nombre}`)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 text-xs font-medium hover:bg-green-100 transition"
          >
            <MessageCircle size={13} />
            WhatsApp
          </a>
        )}
        {cliente.correo && (
          <a
            href={`mailto:${cliente.correo}`}
            className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 text-xs font-medium hover:bg-blue-100 transition"
          >
            <Mail size={13} />
            Email
          </a>
        )}
      </div>

      {/* Menú de etapa */}
      <div className="flex gap-1">
        <button
          onClick={() => onCambiarEtapa(cliente)}
          className="flex-1 text-xs py-1 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-500 hover:bg-gray-50 dark:hover:bg-white/5 transition"
        >
          Cambiar etapa
        </button>
        <button
          onClick={() => onArchivar(cliente)}
          className="px-2 py-1 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition"
          title="Archivar"
        >
          <Archive size={13} />
        </button>
      </div>
    </Card>
  )
}

// ─── Modal cambiar etapa ───────────────────────────────────────────────────

const ETAPAS_KANBAN = [
  { valor: "NUEVO", label: "Nuevo" },
  { valor: "CONTACTADO", label: "Contactado" },
  { valor: "CITA_AGENDADA", label: "Cita agendada" },
  { valor: "PROPUESTA_ENVIADA", label: "Propuesta enviada" },
  { valor: "NEGOCIACION", label: "Negociación" },
]

function ModalCambiarEtapa({
  cliente,
  onCerrar,
  onGuardado,
}: {
  cliente: ClienteItem | null
  onCerrar: () => void
  onGuardado: () => void
}) {
  const [pending, start] = useTransition()
  if (!cliente) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onCerrar} />
      <div className="relative bg-white dark:bg-[#1f1f1f] rounded-2xl p-6 w-full max-w-xs shadow-2xl border border-gray-100 dark:border-gray-800 space-y-3">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-semibold text-gray-900 dark:text-white">Cambiar etapa</h3>
          <button onClick={onCerrar} className="p-1 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg">
            <X size={16} />
          </button>
        </div>
        <p className="text-sm text-gray-500 truncate">{cliente.nombre}</p>
        <div className="space-y-2">
          {ETAPAS_KANBAN.map((e) => (
            <button
              key={e.valor}
              disabled={pending || cliente.etapa === e.valor}
              onClick={() => {
                start(async () => {
                  await cambiarEtapa(cliente.id, e.valor)
                  onGuardado()
                  onCerrar()
                })
              }}
              className={`w-full text-left px-4 py-2.5 rounded-xl text-sm transition ${
                cliente.etapa === e.valor
                  ? "bg-[#e8b763]/20 text-[#b8872a] font-medium"
                  : "hover:bg-gray-50 dark:hover:bg-white/5 text-gray-700 dark:text-gray-300"
              }`}
            >
              {e.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── Opciones ─────────────────────────────────────────────────────────────

const ETAPAS_OPCIONES = [
  { valor: "", label: "Todas las etapas" },
  { valor: "NUEVO", label: "Nuevo" },
  { valor: "CONTACTADO", label: "Contactado" },
  { valor: "CITA_AGENDADA", label: "Cita agendada" },
  { valor: "PROPUESTA_ENVIADA", label: "Propuesta enviada" },
  { valor: "NEGOCIACION", label: "Negociación" },
  { valor: "GANADO", label: "Ganado" },
  { valor: "PERDIDO", label: "Perdido" },
]

const TEMP_OPCIONES = [
  { valor: "", label: "Temperatura" },
  { valor: "CALIENTE", label: "🔥 Caliente" },
  { valor: "TIBIO", label: "🟡 Tibio" },
  { valor: "FRIO", label: "🔵 Frío" },
]

const CARTERA_OPCIONES = [
  { valor: "", label: "Estado" },
  { valor: "ACTIVO", label: "Activo" },
  { valor: "GANADO", label: "Ganado" },
  { valor: "PERDIDO", label: "Perdido" },
  { valor: "ARCHIVADO", label: "Archivado" },
]

// ─── Componente principal ─────────────────────────────────────────────────

export function ClientesCliente({ datosIniciales }: { datosIniciales: DatosIniciales }) {
  const [datos, setDatos] = useState<DatosIniciales>(datosIniciales)
  const [vista, setVista] = useState<"tarjetas" | "lista">("tarjetas")
  const [busqueda, setBusqueda] = useState("")
  const [filtros, setFiltros] = useState<Partial<FiltrosClientes>>({})
  const [pagina, setPagina] = useState(1)
  const [modalAbierto, setModalAbierto] = useState(false)
  const [clienteEliminar, setClienteEliminar] = useState<ClienteItem | null>(null)
  const [clienteEtapa, setClienteEtapa] = useState<ClienteItem | null>(null)
  const [cargando, startTransition] = useTransition()
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const cargar = useCallback((b: string, f: Partial<FiltrosClientes>, p: number) => {
    startTransition(async () => {
      const resultado = await listarClientes({ ...f, busqueda: b || undefined, pagina: p, porPagina: 25 })
      setDatos(resultado as DatosIniciales)
    })
  }, [])

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => {
      cargar(busqueda, filtros, 1)
      setPagina(1)
    }, 300)
    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
  }, [busqueda, filtros, cargar])

  function handleFiltro(campo: keyof FiltrosClientes, valor: string) {
    setFiltros((prev) => ({ ...prev, [campo]: valor || undefined }))
    setPagina(1)
  }

  function handlePagina(p: number) {
    setPagina(p)
    cargar(busqueda, filtros, p)
  }

  async function handleFavorito(id: string) {
    await toggleFavorito(id)
    cargar(busqueda, filtros, pagina)
  }

  async function handleArchivar(c: ClienteItem) {
    await cambiarEstadoCartera(c.id, "ARCHIVADO")
    cargar(busqueda, filtros, pagina)
  }

  const hayFiltros = busqueda || Object.values(filtros).some(Boolean)

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-[#e8b763]/15">
            <Users className="w-5 h-5 text-[#e8b763]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Mis Clientes</h1>
              <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400">
                {datos.total}
              </span>
              {datos.totalFavoritos > 0 && (
                <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-[#e8b763]/20 text-[#b8872a]">
                  ⭐ {datos.totalFavoritos} favoritos
                </span>
              )}
            </div>
            <p className="text-sm text-gray-500">Gestiona y da seguimiento a tus clientes</p>
          </div>
        </div>
        <Button icono={<Plus size={16} />} onClick={() => setModalAbierto(true)}>
          Nuevo cliente
        </Button>
      </div>

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1">
          <Input
            placeholder="Buscar nombre, empresa, teléfono..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            iconoIzquierda={<Search size={16} />}
            iconoDerecha={
              busqueda ? (
                <button onClick={() => setBusqueda("")}>
                  <X size={14} />
                </button>
              ) : undefined
            }
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          <Select
            opciones={ETAPAS_OPCIONES}
            value={filtros.etapa ?? ""}
            onChange={(e) => handleFiltro("etapa", e.target.value)}
            className="w-auto min-w-[150px]"
          />
          <Select
            opciones={TEMP_OPCIONES}
            value={filtros.temperatura ?? ""}
            onChange={(e) => handleFiltro("temperatura", e.target.value)}
            className="w-auto min-w-[130px]"
          />
          <Select
            opciones={CARTERA_OPCIONES}
            value={filtros.estadoCartera ?? ""}
            onChange={(e) => handleFiltro("estadoCartera", e.target.value)}
            className="w-auto min-w-[120px]"
          />
          {/* Toggle vista */}
          <div className="flex rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            <button
              onClick={() => setVista("tarjetas")}
              className={`px-3 py-2 transition ${vista === "tarjetas" ? "bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white" : "text-gray-400 hover:text-gray-600"}`}
              title="Tarjetas"
            >
              <LayoutGrid size={16} />
            </button>
            <button
              onClick={() => setVista("lista")}
              className={`px-3 py-2 transition ${vista === "lista" ? "bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white" : "text-gray-400 hover:text-gray-600"}`}
              title="Lista"
            >
              <List size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Chips de filtros activos */}
      {(filtros.etapa || filtros.temperatura || filtros.estadoCartera) && (
        <div className="flex flex-wrap gap-2">
          {filtros.etapa && (
            <FiltroChip
              label={`Etapa: ${etapaLabel(filtros.etapa)}`}
              onQuitar={() => handleFiltro("etapa", "")}
            />
          )}
          {filtros.temperatura && (
            <FiltroChip
              label={`${getTemperaturaEmoji(filtros.temperatura)} ${getTemperaturaLabel(filtros.temperatura)}`}
              onQuitar={() => handleFiltro("temperatura", "")}
            />
          )}
          {filtros.estadoCartera && (
            <FiltroChip
              label={`Estado: ${filtros.estadoCartera}`}
              onQuitar={() => handleFiltro("estadoCartera", "")}
            />
          )}
          <button
            onClick={() => { setFiltros({}); setBusqueda("") }}
            className="text-xs text-gray-400 hover:text-red-500 transition underline"
          >
            Limpiar todo
          </button>
        </div>
      )}

      {/* Contenido */}
      {cargando ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => <CardSkeleton key={i} />)}
        </div>
      ) : datos.clientes.length === 0 ? (
        <Card className="text-center py-16">
          <div className="text-5xl mb-4">🤷</div>
          <p className="text-lg font-medium text-gray-500 mb-2">
            {hayFiltros ? "No hay clientes con esos filtros" : "Aún no tienes clientes"}
          </p>
          <p className="text-sm text-gray-400 mb-6">
            {hayFiltros
              ? "Prueba ajustando los filtros o la búsqueda"
              : "¡Agrega tu primer cliente y empieza a crecer!"}
          </p>
          {!hayFiltros && (
            <Button icono={<Plus size={16} />} onClick={() => setModalAbierto(true)}>
              Nuevo cliente
            </Button>
          )}
        </Card>
      ) : vista === "tarjetas" ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {datos.clientes.map((c) => (
            <ClienteCard
              key={c.id}
              cliente={c}
              onFavorito={handleFavorito}
              onCambiarEtapa={setClienteEtapa}
              onArchivar={handleArchivar}
            />
          ))}
        </div>
      ) : (
        <Card padding="none">
          <div className="divide-y divide-gray-50 dark:divide-gray-800">
            {datos.clientes.map((c) => {
              const diasSin = getDiasDesde(c.ultimoContacto)
              const tel = c.whatsapp ?? c.telefono ?? ""
              const accionVencida = c.fechaProximaAccion && new Date(c.fechaProximaAccion) < new Date()
              return (
                <div
                  key={c.id}
                  className="flex items-center gap-4 px-6 py-3 hover:bg-gray-50 dark:hover:bg-white/5 transition"
                >
                  <button
                    onClick={() => handleFavorito(c.id)}
                    className="text-gray-300 hover:text-[#e8b763] transition shrink-0"
                  >
                    <Star size={14} className={c.esFavorito ? "fill-[#e8b763] text-[#e8b763]" : ""} />
                  </button>
                  <div className="flex-1 min-w-0">
                    <Link
                      href={`/clientes/${c.id}`}
                      className="font-medium text-gray-900 dark:text-white hover:text-[#e8b763] transition truncate block"
                    >
                      {c.nombre}
                    </Link>
                    <p className="text-xs text-gray-400 truncate">
                      {c.empresaNombre ?? c.correo ?? c.telefono ?? "—"}
                    </p>
                  </div>
                  {c.proximaAccion && (
                    <div className="hidden xl:block max-w-[160px]">
                      <p className={`text-xs truncate ${accionVencida ? "text-red-500" : "text-gray-400"}`}>
                        {accionVencida && "⚠ "}{c.proximaAccion}
                      </p>
                    </div>
                  )}
                  <div className="hidden md:flex gap-1.5 shrink-0">
                    <Badge variante={temperaturaVariante(c.temperatura)}>
                      {getTemperaturaEmoji(c.temperatura)}
                    </Badge>
                    <Badge variante={etapaVariante(c.etapa)}>{etapaLabel(c.etapa)}</Badge>
                  </div>
                  <span className={`hidden lg:block text-xs w-24 text-right shrink-0 ${diasSin > 7 ? "text-red-500" : "text-gray-400"}`}>
                    {diasSin < 999 ? `${diasSin}d` : "—"}
                  </span>
                  {c.valorEstimado ? (
                    <span className="hidden lg:block text-sm font-medium text-gray-600 dark:text-gray-300 w-28 text-right shrink-0">
                      {formatMoney(c.valorEstimado)}
                    </span>
                  ) : <span className="hidden lg:block w-28 shrink-0" />}
                  <div className="flex gap-1 shrink-0">
                    {tel && (
                      <a
                        href={`https://wa.me/${tel.replace(/\D/g, "").replace(/^(?!52)/, "52")}?text=${encodeURIComponent(`Hola ${c.nombre}`)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1.5 rounded-lg text-green-500 hover:bg-green-50 dark:hover:bg-green-900/20 transition"
                        title="WhatsApp"
                      >
                        <MessageCircle size={15} />
                      </a>
                    )}
                    <button
                      onClick={() => setClienteEtapa(c)}
                      className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-white/10 transition text-xs"
                      title="Cambiar etapa"
                    >
                      ↕
                    </button>
                    <button
                      onClick={() => setClienteEliminar(c)}
                      className="p-1.5 rounded-lg text-gray-400 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-500 transition"
                      title="Eliminar"
                    >
                      ×
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </Card>
      )}

      {/* Paginación */}
      {datos.paginas > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">
            {(pagina - 1) * 25 + 1}–{Math.min(pagina * 25, datos.total)} de {datos.total}
          </p>
          <div className="flex gap-2">
            <Button
              variante="secundario"
              tamaño="sm"
              disabled={pagina <= 1}
              onClick={() => handlePagina(pagina - 1)}
              icono={<ChevronLeft size={16} />}
            >
              Anterior
            </Button>
            <Button
              variante="secundario"
              tamaño="sm"
              disabled={pagina >= datos.paginas}
              onClick={() => handlePagina(pagina + 1)}
              icono={<ChevronRight size={16} />}
            >
              Siguiente
            </Button>
          </div>
        </div>
      )}

      {/* Modales */}
      <ModalCliente
        abierto={modalAbierto}
        onCerrar={() => setModalAbierto(false)}
        onGuardado={() => cargar(busqueda, filtros, pagina)}
        cliente={null}
      />

      <ModalCambiarEtapa
        cliente={clienteEtapa}
        onCerrar={() => setClienteEtapa(null)}
        onGuardado={() => cargar(busqueda, filtros, pagina)}
      />

      <ConfirmModal
        abierto={!!clienteEliminar}
        onCerrar={() => setClienteEliminar(null)}
        onConfirmar={async () => {
          if (!clienteEliminar) return
          await eliminarCliente(clienteEliminar.id)
          cargar(busqueda, filtros, pagina)
          setClienteEliminar(null)
        }}
        titulo="Eliminar cliente"
        mensaje={`¿Eliminar a "${clienteEliminar?.nombre}"? Esta acción se puede deshacer desde la papelera.`}
        textoConfirmar="Eliminar"
        peligroso
      />
    </div>
  )
}
