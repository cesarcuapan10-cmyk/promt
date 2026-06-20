"use client"

import { useState, useCallback, useTransition, useEffect, useRef } from "react"
import {
  Users,
  Plus,
  Search,
  LayoutGrid,
  List,
  Phone,
  Mail,
  Building2,
  Pencil,
  Trash2,
  ChevronLeft,
  ChevronRight,
  MessageCircle,
  Flame,
} from "lucide-react"
import { Card } from "@/app/components/ui/Card"
import { Badge } from "@/app/components/ui/Badge"
import { Button } from "@/app/components/ui/Button"
import { Input, Select } from "@/app/components/ui/Input"
import { ConfirmModal } from "@/app/components/ui/Modal"
import { ModalCliente } from "./ModalCliente"
import { listarClientes, eliminarCliente } from "@/app/actions/clientes"
import { formatMoney, diasSinContacto, encodeWhatsApp } from "@/app/lib/utils"
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
  notas: string | null
  creadoEn: Date
  etiquetas: { etiqueta: { nombre: string; color: string } }[]
  _count: { pagos: number; notasHistorial: number }
}

type DatosIniciales = {
  clientes: ClienteItem[]
  total: number
  paginas: number
  pagina: number
}

// ─── Badge helpers ────────────────────────────────────────────────────────

type BadgeVariante = "caliente" | "tibio" | "frio" | "activo" | "ganado" | "perdido" | "archivado" | "pendiente" | "pagado" | "vencido" | "default"

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

function etapaLabel(e: string): string {
  const map: Record<string, string> = {
    NUEVO: "Nuevo",
    PROSPECTO: "Prospecto",
    CONTACTADO: "Contactado",
    PROPUESTA: "Propuesta",
    NEGOCIACION: "Negociación",
    GANADO: "Ganado",
    PERDIDO: "Perdido",
    ARCHIVADO: "Archivado",
  }
  return map[e] ?? e
}

function temperaturaLabel(t: string): string {
  const map: Record<string, string> = {
    CALIENTE: "Caliente",
    TIBIO: "Tibio",
    FRIO: "Frío",
  }
  return map[t] ?? t
}

// ─── Skeleton ─────────────────────────────────────────────────────────────

function CardSkeleton() {
  return (
    <div className="rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-[#1f1f1f] p-6 animate-pulse space-y-3">
      <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-2/3" />
      <div className="h-4 bg-gray-100 dark:bg-gray-800 rounded w-1/2" />
      <div className="h-4 bg-gray-100 dark:bg-gray-800 rounded w-3/4" />
      <div className="flex gap-2 pt-2">
        <div className="h-6 bg-gray-100 dark:bg-gray-800 rounded-full w-16" />
        <div className="h-6 bg-gray-100 dark:bg-gray-800 rounded-full w-14" />
      </div>
    </div>
  )
}

// ─── Client card ──────────────────────────────────────────────────────────

function ClienteCard({
  cliente,
  onEditar,
  onEliminar,
}: {
  cliente: ClienteItem
  onEditar: (c: ClienteItem) => void
  onEliminar: (c: ClienteItem) => void
}) {
  const dias = diasSinContacto(cliente.ultimoContacto)
  const tel = cliente.whatsapp ?? cliente.telefono ?? ""

  return (
    <Card hover padding="md" className="flex flex-col gap-3">
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-semibold text-gray-900 dark:text-white truncate">{cliente.nombre}</p>
          {cliente.empresaNombre && (
            <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
              <Building2 size={11} />
              {cliente.empresaNombre}
            </p>
          )}
        </div>
        <div className="flex gap-1 shrink-0">
          <button
            onClick={() => onEditar(cliente)}
            className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 text-gray-400 hover:text-gray-600 transition"
            title="Editar"
          >
            <Pencil size={14} />
          </button>
          <button
            onClick={() => onEliminar(cliente)}
            className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-400 hover:text-red-500 transition"
            title="Eliminar"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {/* Contact info */}
      <div className="space-y-1">
        {cliente.correo && (
          <p className="text-xs text-gray-500 flex items-center gap-1.5 truncate">
            <Mail size={11} className="shrink-0" />
            {cliente.correo}
          </p>
        )}
        {tel && (
          <p className="text-xs text-gray-500 flex items-center gap-1.5">
            <Phone size={11} className="shrink-0" />
            {tel}
          </p>
        )}
      </div>

      {/* Badges */}
      <div className="flex flex-wrap gap-1.5">
        <Badge variante={temperaturaVariante(cliente.temperatura)}>
          <Flame size={10} />
          {temperaturaLabel(cliente.temperatura)}
        </Badge>
        <Badge variante={etapaVariante(cliente.etapa)}>{etapaLabel(cliente.etapa)}</Badge>
      </div>

      {/* Stats */}
      <div className="flex items-center justify-between text-xs text-gray-400 pt-1 border-t border-gray-50 dark:border-gray-800">
        <span>{dias < 999 ? `${dias}d sin contacto` : "Sin contacto"}</span>
        {cliente.valorEstimado ? (
          <span className="font-medium text-gray-600 dark:text-gray-300">
            {formatMoney(cliente.valorEstimado)}
          </span>
        ) : null}
      </div>

      {/* Quick actions */}
      <div className="flex gap-2">
        {tel && (
          <a
            href={encodeWhatsApp(tel, `Hola ${cliente.nombre}`)}
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
    </Card>
  )
}

// ─── Main component ───────────────────────────────────────────────────────

const ETAPAS_OPCIONES = [
  { valor: "", label: "Todas las etapas" },
  { valor: "NUEVO", label: "Nuevo" },
  { valor: "PROSPECTO", label: "Prospecto" },
  { valor: "CONTACTADO", label: "Contactado" },
  { valor: "PROPUESTA", label: "Propuesta" },
  { valor: "NEGOCIACION", label: "Negociación" },
  { valor: "GANADO", label: "Ganado" },
  { valor: "PERDIDO", label: "Perdido" },
]

const TEMP_OPCIONES = [
  { valor: "", label: "Temperatura" },
  { valor: "CALIENTE", label: "Caliente" },
  { valor: "TIBIO", label: "Tibio" },
  { valor: "FRIO", label: "Frío" },
]

const CARTERA_OPCIONES = [
  { valor: "", label: "Estado cartera" },
  { valor: "ACTIVO", label: "Activo" },
  { valor: "INACTIVO", label: "Inactivo" },
  { valor: "POTENCIAL", label: "Potencial" },
]

const ORDEN_OPCIONES = [
  { valor: "creadoEn", label: "Más recientes" },
  { valor: "nombre", label: "Nombre A-Z" },
  { valor: "valorEstimado", label: "Mayor presupuesto" },
]

export function ClientesCliente({ datosIniciales }: { datosIniciales: DatosIniciales }) {
  const [datos, setDatos] = useState<DatosIniciales>(datosIniciales)
  const [vista, setVista] = useState<"tarjetas" | "lista">("tarjetas")
  const [busqueda, setBusqueda] = useState("")
  const [filtros, setFiltros] = useState<Partial<FiltrosClientes>>({})
  const [pagina, setPagina] = useState(1)
  const [modalAbierto, setModalAbierto] = useState(false)
  const [clienteEditar, setClienteEditar] = useState<ClienteItem | null>(null)
  const [clienteEliminar, setClienteEliminar] = useState<ClienteItem | null>(null)
  const [cargando, startTransition] = useTransition()
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const cargar = useCallback(
    (b: string, f: Partial<FiltrosClientes>, p: number) => {
      startTransition(async () => {
        const resultado = await listarClientes({
          ...f,
          busqueda: b || undefined,
          pagina: p,
          porPagina: 20,
        })
        setDatos(resultado as DatosIniciales)
      })
    },
    []
  )

  // Debounced search
  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => {
      cargar(busqueda, filtros, 1)
      setPagina(1)
    }, 300)
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [busqueda, filtros, cargar])

  function handleFiltro(campo: keyof FiltrosClientes, valor: string) {
    const nuevos = { ...filtros, [campo]: valor || undefined }
    setFiltros(nuevos)
    setPagina(1)
  }

  function handlePagina(p: number) {
    setPagina(p)
    cargar(busqueda, filtros, p)
  }

  function handleEditar(c: ClienteItem) {
    setClienteEditar(c)
    setModalAbierto(true)
  }

  function handleNuevo() {
    setClienteEditar(null)
    setModalAbierto(true)
  }

  async function handleEliminarConfirmar() {
    if (!clienteEliminar) return
    await eliminarCliente(clienteEliminar.id)
    cargar(busqueda, filtros, pagina)
    setClienteEliminar(null)
  }

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ backgroundColor: "color-mix(in srgb, var(--color-brand) 15%, transparent)" }}
          >
            <Users className="w-5 h-5" style={{ color: "var(--color-brand)" }} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Mis Clientes</h1>
              <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400">
                {datos.total}
              </span>
            </div>
            <p className="text-sm text-gray-500">Gestiona y da seguimiento a tus clientes</p>
          </div>
        </div>
        <Button icono={<Plus size={16} />} onClick={handleNuevo}>
          Nuevo Cliente
        </Button>
      </div>

      {/* Filters bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1">
          <Input
            placeholder="Buscar por nombre, correo, teléfono o empresa..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            iconoIzquierda={<Search size={16} />}
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          <Select
            opciones={ETAPAS_OPCIONES}
            value={filtros.etapa ?? ""}
            onChange={(e) => handleFiltro("etapa", e.target.value)}
            className="w-auto min-w-[140px]"
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
            className="w-auto min-w-[140px]"
          />
          <Select
            opciones={ORDEN_OPCIONES}
            value={filtros.ordenarPor ?? "creadoEn"}
            onChange={(e) => handleFiltro("ordenarPor", e.target.value)}
            className="w-auto min-w-[150px]"
          />
          {/* View toggle */}
          <div className="flex rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            <button
              onClick={() => setVista("tarjetas")}
              className={`px-3 py-2 transition ${
                vista === "tarjetas"
                  ? "bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white"
                  : "text-gray-400 hover:text-gray-600"
              }`}
              title="Vista tarjetas"
            >
              <LayoutGrid size={16} />
            </button>
            <button
              onClick={() => setVista("lista")}
              className={`px-3 py-2 transition ${
                vista === "lista"
                  ? "bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white"
                  : "text-gray-400 hover:text-gray-600"
              }`}
              title="Vista lista"
            >
              <List size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      {cargando ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
      ) : datos.clientes.length === 0 ? (
        <Card className="text-center py-16">
          <Users className="w-16 h-16 mx-auto mb-4 opacity-20" />
          <p className="text-lg font-medium text-gray-500 mb-2">Sin clientes</p>
          <p className="text-sm text-gray-400 mb-6">
            {busqueda || Object.values(filtros).some(Boolean)
              ? "No se encontraron clientes con esos filtros."
              : "Aún no tienes clientes. ¡Agrega el primero!"}
          </p>
          {!busqueda && !Object.values(filtros).some(Boolean) && (
            <Button icono={<Plus size={16} />} onClick={handleNuevo}>
              Nuevo Cliente
            </Button>
          )}
        </Card>
      ) : vista === "tarjetas" ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {datos.clientes.map((c) => (
            <ClienteCard
              key={c.id}
              cliente={c}
              onEditar={handleEditar}
              onEliminar={(cl) => setClienteEliminar(cl)}
            />
          ))}
        </div>
      ) : (
        /* Lista view */
        <Card padding="none">
          <div className="divide-y divide-gray-50 dark:divide-gray-800">
            {datos.clientes.map((c) => {
              const dias = diasSinContacto(c.ultimoContacto)
              const tel = c.whatsapp ?? c.telefono ?? ""
              return (
                <div
                  key={c.id}
                  className="flex items-center gap-4 px-6 py-4 hover:bg-gray-50 dark:hover:bg-white/5 transition"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 dark:text-white truncate">{c.nombre}</p>
                    <p className="text-xs text-gray-500 truncate">
                      {c.empresaNombre ?? c.correo ?? c.telefono ?? "—"}
                    </p>
                  </div>
                  <div className="hidden md:flex gap-1.5">
                    <Badge variante={temperaturaVariante(c.temperatura)}>
                      {temperaturaLabel(c.temperatura)}
                    </Badge>
                    <Badge variante={etapaVariante(c.etapa)}>{etapaLabel(c.etapa)}</Badge>
                  </div>
                  <span className="hidden lg:block text-xs text-gray-400 w-24 text-right shrink-0">
                    {dias < 999 ? `${dias}d sin contacto` : "—"}
                  </span>
                  {c.valorEstimado ? (
                    <span className="hidden lg:block text-sm font-medium text-gray-600 dark:text-gray-300 w-28 text-right shrink-0">
                      {formatMoney(c.valorEstimado)}
                    </span>
                  ) : (
                    <span className="hidden lg:block w-28" />
                  )}
                  <div className="flex gap-1 shrink-0">
                    {tel && (
                      <a
                        href={encodeWhatsApp(tel, `Hola ${c.nombre}`)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1.5 rounded-lg text-green-500 hover:bg-green-50 dark:hover:bg-green-900/20 transition"
                        title="WhatsApp"
                      >
                        <MessageCircle size={15} />
                      </a>
                    )}
                    <button
                      onClick={() => handleEditar(c)}
                      className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-white/10 transition"
                      title="Editar"
                    >
                      <Pencil size={15} />
                    </button>
                    <button
                      onClick={() => setClienteEliminar(c)}
                      className="p-1.5 rounded-lg text-gray-400 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-500 transition"
                      title="Eliminar"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </Card>
      )}

      {/* Pagination */}
      {datos.paginas > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">
            Mostrando {(pagina - 1) * 20 + 1}–{Math.min(pagina * 20, datos.total)} de {datos.total}
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

      {/* Modals */}
      <ModalCliente
        abierto={modalAbierto}
        onCerrar={() => {
          setModalAbierto(false)
          setClienteEditar(null)
        }}
        onGuardado={() => cargar(busqueda, filtros, pagina)}
        cliente={clienteEditar}
      />

      <ConfirmModal
        abierto={!!clienteEliminar}
        onCerrar={() => setClienteEliminar(null)}
        onConfirmar={handleEliminarConfirmar}
        titulo="Eliminar cliente"
        mensaje={`¿Seguro que deseas eliminar a "${clienteEliminar?.nombre}"? Esta acción no se puede deshacer.`}
        textoConfirmar="Eliminar"
        peligroso
      />
    </div>
  )
}
