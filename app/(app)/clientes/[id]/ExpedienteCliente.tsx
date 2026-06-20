"use client"

import { useState, useTransition, useRef, useCallback } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import {
  ArrowLeft,
  Trophy,
  XCircle,
  Archive,
  MessageCircle,
  Mail,
  Edit3,
  Save,
  X,
  Plus,
  Download,
  Trash2,
  Phone,
  Globe,
  MapPin,
  Building2,
  FileText,
  CreditCard,
  Clock,
  Flame,
  Snowflake,
  Thermometer,
  AlertCircle,
  CheckCircle,
  Bot,
  Loader2,
  Upload,
  Receipt,
} from "lucide-react"
import { Badge } from "@/app/components/ui/Badge"
import { Button } from "@/app/components/ui/Button"
import { Modal } from "@/app/components/ui/Modal"
import { Card } from "@/app/components/ui/Card"
import { formatMoney, formatFecha, encodeWhatsApp } from "@/app/lib/utils"
import {
  actualizarExpediente,
  agregarNota,
  agregarPago,
  subirArchivo,
  eliminarArchivo,
  marcarGanadoCliente,
  marcarPerdidoCliente,
  archivarCliente,
  type ActualizarClienteData,
} from "@/app/actions/clientes"

// ─── Types ─────────────────────────────────────────────────────────────────────

interface NotaItem {
  id: string
  contenido: string
  tipo: string
  fecha: Date
  creadoEn: Date
  usuario: { nombre: string }
}

interface PagoItem {
  id: string
  monto: number
  metodo: string
  estatus: string
  fechaPago: Date | null
  concepto: string | null
  creadoEn: Date
}

interface ArchivoItem {
  id: string
  nombre: string
  etiqueta: string
  tipo: string
  tamano: number
  fechaSubida: Date
  usuario: { nombre: string }
  datos: Uint8Array | null
  url: string | null
}

interface EtiquetaItem {
  id: string
  etiqueta: { nombre: string; color: string }
}

interface ClienteCompleto {
  id: string
  nombre: string
  telefono: string | null
  whatsapp: string | null
  correo: string | null
  origen: string | null
  etapa: string
  estadoCartera: string
  temperatura: string
  objecionPrincipal: string | null
  retoPrincipal: string | null
  numVendedores: number | null
  notas: string | null
  proximaAccion: string | null
  fechaProximaAccion: Date | null
  ultimoContacto: Date | null
  valorEstimado: number | null
  empresaNombre: string | null
  empresaGiro: string | null
  empresaPuesto: string | null
  empresaRfc: string | null
  empresaSitio: string | null
  empresaDireccion: string | null
  empresaTamano: string | null
  empresaNotas: string | null
  motivoPerdida: string | null
  vendedor: { id: string; nombre: string; correo: string }
  etiquetas: EtiquetaItem[]
  notasHistorial: NotaItem[]
  pagos: PagoItem[]
  archivosSubidos: ArchivoItem[]
  creadoEn: Date
  actualizadoEn: Date
}

// ─── Constants ─────────────────────────────────────────────────────────────────

const MOTIVOS_PERDIDA = [
  "Está caro",
  "Lo voy a pensar",
  "Tengo que consultarlo",
  "Se fue con la competencia",
  "No contestó",
  "No era buen momento",
  "No calificaba",
]

const TIPOS_NOTA = ["NOTA", "LLAMADA", "MENSAJE", "CITA", "PAGO", "CAMBIO_ETAPA"]
const TABS = ["Datos", "Empresa", "Historial", "Pagos", "Archivos", "Asistente IA"] as const
type Tab = (typeof TABS)[number]

// ─── Helpers ──────────────────────────────────────────────────────────────────

function diasDesde(fecha: Date | null | undefined): number {
  if (!fecha) return 999
  return Math.floor((Date.now() - new Date(fecha).getTime()) / 86400000)
}

function formatFechaHistorial(fecha: Date): string {
  const d = new Date(fecha)
  const ahora = new Date()
  const diff = Math.floor((ahora.getTime() - d.getTime()) / 86400000)
  if (diff === 0)
    return `Hoy ${d.toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" })}`
  if (diff === 1) return "Ayer"
  return d.toLocaleDateString("es-MX", { weekday: "short", day: "numeric", month: "short" })
}

function etiquetaEstado(estado: string) {
  const map: Record<string, { label: string; variante: "activo" | "ganado" | "perdido" | "archivado" | "default" }> = {
    ACTIVO: { label: "Activo", variante: "activo" },
    GANADO: { label: "Ganado", variante: "ganado" },
    PERDIDO: { label: "Perdido", variante: "perdido" },
    ARCHIVADO: { label: "Archivado", variante: "archivado" },
  }
  return map[estado] ?? { label: estado, variante: "default" as const }
}

function temperaturaInfo(t: string) {
  if (t === "CALIENTE") return { emoji: "🔥", label: "Caliente", variante: "caliente" as const }
  if (t === "FRIO") return { emoji: "🔵", label: "Frío", variante: "frio" as const }
  return { emoji: "🟡", label: "Tibio", variante: "tibio" as const }
}

function etapaLabel(e: string) {
  const map: Record<string, string> = {
    NUEVO: "Nuevo",
    CONTACTADO: "Contactado",
    CITA_AGENDADA: "Cita Agendada",
    PROPUESTA_ENVIADA: "Propuesta Enviada",
    GANADO: "Ganado",
    PERDIDO: "Perdido",
  }
  return map[e] ?? e
}

function tipoNotaIcon(tipo: string) {
  const map: Record<string, string> = {
    LLAMADA: "📞",
    MENSAJE: "💬",
    CITA: "📅",
    PAGO: "💰",
    NOTA: "📝",
    CAMBIO_ETAPA: "🔄",
  }
  return map[tipo] ?? "📝"
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

// ─── Subcomponents ────────────────────────────────────────────────────────────

function Campo({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1 font-medium uppercase tracking-wide">
        {label}
      </p>
      <div className="text-sm text-gray-900 dark:text-white">{children}</div>
    </div>
  )
}

function CampoEditable({
  label,
  value,
  name,
  type = "text",
  editing,
}: {
  label: string
  value: string | number | null | undefined
  name: string
  type?: string
  editing: boolean
}) {
  const displayVal = value ?? "—"
  return (
    <div>
      <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 font-medium uppercase tracking-wide block">
        {label}
      </label>
      {editing ? (
        <input
          name={name}
          type={type}
          defaultValue={value?.toString() ?? ""}
          className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#2a2a2a] text-sm focus:outline-none focus:ring-2 focus:ring-brand/50"
        />
      ) : (
        <p className="text-sm text-gray-900 dark:text-white">
          {displayVal === "" ? "—" : displayVal}
        </p>
      )}
    </div>
  )
}

// ─── Sección Datos ─────────────────────────────────────────────────────────────

function SeccionDatos({
  cliente,
  onUpdate,
}: {
  cliente: ClienteCompleto
  onUpdate: (data: ActualizarClienteData) => Promise<void>
}) {
  const [editing, setEditing] = useState(false)
  const [cargando, setCargando] = useState(false)
  const formRef = useRef<HTMLFormElement>(null)

  async function handleSave() {
    if (!formRef.current) return
    setCargando(true)
    const fd = new FormData(formRef.current)
    const data: ActualizarClienteData = {
      nombre: (fd.get("nombre") as string) || undefined,
      telefono: (fd.get("telefono") as string) || null,
      whatsapp: (fd.get("whatsapp") as string) || null,
      correo: (fd.get("correo") as string) || null,
      origen: (fd.get("origen") as string) || null,
      temperatura: (fd.get("temperatura") as string) || undefined,
      valorEstimado: fd.get("valorEstimado") ? Number(fd.get("valorEstimado")) : null,
      objecionPrincipal: (fd.get("objecionPrincipal") as string) || null,
      retoPrincipal: (fd.get("retoPrincipal") as string) || null,
      numVendedores: fd.get("numVendedores") ? Number(fd.get("numVendedores")) : null,
      notas: (fd.get("notas") as string) || null,
      proximaAccion: (fd.get("proximaAccion") as string) || null,
      fechaProximaAccion: fd.get("fechaProximaAccion")
        ? new Date(fd.get("fechaProximaAccion") as string)
        : null,
    }
    await onUpdate(data)
    setCargando(false)
    setEditing(false)
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-gray-900 dark:text-white">Información de contacto</h3>
        {editing ? (
          <div className="flex gap-2">
            <Button tamaño="sm" variante="fantasma" onClick={() => setEditing(false)} icono={<X className="w-4 h-4" />}>
              Cancelar
            </Button>
            <Button tamaño="sm" variante="primario" cargando={cargando} onClick={handleSave} icono={<Save className="w-4 h-4" />}>
              Guardar
            </Button>
          </div>
        ) : (
          <Button tamaño="sm" variante="secundario" onClick={() => setEditing(true)} icono={<Edit3 className="w-4 h-4" />}>
            Editar
          </Button>
        )}
      </div>
      <form ref={formRef}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <CampoEditable label="Nombre" value={cliente.nombre} name="nombre" editing={editing} />
          <CampoEditable label="Teléfono" value={cliente.telefono} name="telefono" editing={editing} />
          <CampoEditable label="WhatsApp" value={cliente.whatsapp} name="whatsapp" editing={editing} />
          <CampoEditable label="Correo" value={cliente.correo} name="correo" type="email" editing={editing} />
          <CampoEditable label="Origen" value={cliente.origen} name="origen" editing={editing} />
          {editing ? (
            <div>
              <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 font-medium uppercase tracking-wide block">Temperatura</label>
              <select
                name="temperatura"
                defaultValue={cliente.temperatura}
                className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#2a2a2a] text-sm"
              >
                <option value="CALIENTE">🔥 Caliente</option>
                <option value="TIBIO">🟡 Tibio</option>
                <option value="FRIO">🔵 Frío</option>
              </select>
            </div>
          ) : (
            <Campo label="Temperatura">{temperaturaInfo(cliente.temperatura).emoji} {temperaturaInfo(cliente.temperatura).label}</Campo>
          )}
          <CampoEditable label="Valor estimado" value={cliente.valorEstimado} name="valorEstimado" type="number" editing={editing} />
          <CampoEditable label="Número de vendedores" value={cliente.numVendedores} name="numVendedores" type="number" editing={editing} />
          <div className="sm:col-span-2">
            <CampoEditable label="Objeción principal" value={cliente.objecionPrincipal} name="objecionPrincipal" editing={editing} />
          </div>
          <div className="sm:col-span-2">
            <CampoEditable label="Reto principal" value={cliente.retoPrincipal} name="retoPrincipal" editing={editing} />
          </div>
          <CampoEditable label="Próxima acción" value={cliente.proximaAccion} name="proximaAccion" editing={editing} />
          <CampoEditable
            label="Fecha próxima acción"
            value={cliente.fechaProximaAccion ? new Date(cliente.fechaProximaAccion).toISOString().slice(0, 10) : ""}
            name="fechaProximaAccion"
            type="date"
            editing={editing}
          />
          <div className="sm:col-span-2">
            {editing ? (
              <div>
                <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 font-medium uppercase tracking-wide block">Notas</label>
                <textarea
                  name="notas"
                  defaultValue={cliente.notas ?? ""}
                  rows={4}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#2a2a2a] text-sm resize-none focus:outline-none focus:ring-2 focus:ring-brand/50"
                />
              </div>
            ) : (
              <Campo label="Notas">{cliente.notas ?? "—"}</Campo>
            )}
          </div>
        </div>
      </form>
    </div>
  )
}

// ─── Sección Empresa ──────────────────────────────────────────────────────────

function SeccionEmpresa({
  cliente,
  onUpdate,
}: {
  cliente: ClienteCompleto
  onUpdate: (data: ActualizarClienteData) => Promise<void>
}) {
  const [editing, setEditing] = useState(false)
  const [cargando, setCargando] = useState(false)
  const formRef = useRef<HTMLFormElement>(null)

  async function handleSave() {
    if (!formRef.current) return
    setCargando(true)
    const fd = new FormData(formRef.current)
    await onUpdate({
      empresaNombre: (fd.get("empresaNombre") as string) || null,
      empresaGiro: (fd.get("empresaGiro") as string) || null,
      empresaPuesto: (fd.get("empresaPuesto") as string) || null,
      empresaRfc: (fd.get("empresaRfc") as string) || null,
      empresaSitio: (fd.get("empresaSitio") as string) || null,
      empresaDireccion: (fd.get("empresaDireccion") as string) || null,
      empresaTamano: (fd.get("empresaTamano") as string) || null,
      empresaNotas: (fd.get("empresaNotas") as string) || null,
    })
    setCargando(false)
    setEditing(false)
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-gray-900 dark:text-white">Datos de empresa</h3>
        {editing ? (
          <div className="flex gap-2">
            <Button tamaño="sm" variante="fantasma" onClick={() => setEditing(false)} icono={<X className="w-4 h-4" />}>Cancelar</Button>
            <Button tamaño="sm" variante="primario" cargando={cargando} onClick={handleSave} icono={<Save className="w-4 h-4" />}>Guardar</Button>
          </div>
        ) : (
          <Button tamaño="sm" variante="secundario" onClick={() => setEditing(true)} icono={<Edit3 className="w-4 h-4" />}>Editar</Button>
        )}
      </div>
      <form ref={formRef}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <CampoEditable label="Nombre empresa" value={cliente.empresaNombre} name="empresaNombre" editing={editing} />
          <CampoEditable label="Giro" value={cliente.empresaGiro} name="empresaGiro" editing={editing} />
          <CampoEditable label="Puesto del contacto" value={cliente.empresaPuesto} name="empresaPuesto" editing={editing} />
          <CampoEditable label="RFC" value={cliente.empresaRfc} name="empresaRfc" editing={editing} />
          <CampoEditable label="Sitio web" value={cliente.empresaSitio} name="empresaSitio" editing={editing} />
          <CampoEditable label="Dirección" value={cliente.empresaDireccion} name="empresaDireccion" editing={editing} />
          <CampoEditable label="Tamaño" value={cliente.empresaTamano} name="empresaTamano" editing={editing} />
          <div className="sm:col-span-2">
            {editing ? (
              <div>
                <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 font-medium uppercase tracking-wide block">Notas de empresa</label>
                <textarea
                  name="empresaNotas"
                  defaultValue={cliente.empresaNotas ?? ""}
                  rows={3}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#2a2a2a] text-sm resize-none focus:outline-none focus:ring-2 focus:ring-brand/50"
                />
              </div>
            ) : (
              <Campo label="Notas de empresa">{cliente.empresaNotas ?? "—"}</Campo>
            )}
          </div>
        </div>
      </form>
    </div>
  )
}

// ─── Sección Historial ────────────────────────────────────────────────────────

function SeccionHistorial({
  clienteId,
  notas: notasIniciales,
}: {
  clienteId: string
  notas: NotaItem[]
}) {
  const [notas, setNotas] = useState<NotaItem[]>(notasIniciales)
  const [contenido, setContenido] = useState("")
  const [tipo, setTipo] = useState("NOTA")
  const [fecha, setFecha] = useState("")
  const [cargando, setCargando] = useState(false)

  async function handleAgregar() {
    if (!contenido.trim()) return
    setCargando(true)
    const res = await agregarNota(clienteId, contenido, tipo, fecha ? new Date(fecha) : undefined)
    if (res.ok) {
      const nuevaNota = res.nota as NotaItem
      setNotas([nuevaNota, ...notas])
      setContenido("")
      setFecha("")
      setTipo("NOTA")
    }
    setCargando(false)
  }

  return (
    <div>
      {/* Formulario nueva nota */}
      <Card padding="sm" className="mb-6">
        <h4 className="text-sm font-semibold text-gray-800 dark:text-white mb-3">Agregar nota</h4>
        <div className="flex gap-2 mb-3 flex-wrap">
          {TIPOS_NOTA.map((t) => (
            <button
              key={t}
              onClick={() => setTipo(t)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition border ${
                tipo === t
                  ? "border-brand bg-brand/10 text-brand"
                  : "border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-white/5"
              }`}
            >
              {tipoNotaIcon(t)} {t}
            </button>
          ))}
        </div>
        <textarea
          value={contenido}
          onChange={(e) => setContenido(e.target.value)}
          placeholder="Escribe una nota sobre esta interacción..."
          rows={3}
          className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#2a2a2a] text-sm resize-none focus:outline-none focus:ring-2 focus:ring-brand/50 mb-3"
        />
        <div className="flex items-center gap-3">
          <div className="flex-1">
            <label className="text-xs text-gray-500 mb-1 block">Fecha (opcional)</label>
            <input
              type="datetime-local"
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
              className="px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#2a2a2a] text-sm focus:outline-none focus:ring-2 focus:ring-brand/50 w-full"
            />
          </div>
          <Button
            tamaño="sm"
            variante="primario"
            cargando={cargando}
            onClick={handleAgregar}
            disabled={!contenido.trim()}
            icono={<Plus className="w-4 h-4" />}
            className="mt-5 shrink-0"
          >
            Agregar
          </Button>
        </div>
      </Card>

      {/* Línea de tiempo */}
      <div className="space-y-3">
        {notas.length === 0 && (
          <p className="text-sm text-gray-500 text-center py-8">Sin notas aún</p>
        )}
        <AnimatePresence initial={false}>
          {notas.map((nota) => (
            <motion.div
              key={nota.id}
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex gap-3"
            >
              <div className="mt-1 text-xl leading-none shrink-0">{tipoNotaIcon(nota.tipo)}</div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                    {nota.usuario.nombre}
                  </span>
                  <span className="text-xs text-gray-400">{formatFechaHistorial(nota.fecha)}</span>
                  <span className="text-xs px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-gray-500">
                    {nota.tipo}
                  </span>
                </div>
                <p className="text-sm text-gray-800 dark:text-gray-200 whitespace-pre-line">
                  {nota.contenido}
                </p>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  )
}

// ─── Sección Pagos ────────────────────────────────────────────────────────────

function SeccionPagos({
  clienteId,
  pagos: pagosIniciales,
  valorEstimado,
}: {
  clienteId: string
  pagos: PagoItem[]
  valorEstimado: number | null
}) {
  const [pagos, setPagos] = useState<PagoItem[]>(pagosIniciales)
  const [modal, setModal] = useState(false)
  const [cargando, setCargando] = useState(false)
  const [form, setForm] = useState({ monto: "", metodo: "Transferencia", estatus: "PENDIENTE", fechaPago: "", concepto: "" })

  const totalPagado = pagos.filter((p) => p.estatus === "PAGADO").reduce((s, p) => s + p.monto, 0)
  const pct = valorEstimado ? Math.min(100, (totalPagado / valorEstimado) * 100) : 0

  async function handleAgregar() {
    if (!form.monto) return
    setCargando(true)
    const res = await agregarPago(clienteId, {
      monto: Number(form.monto),
      metodo: form.metodo,
      estatus: form.estatus,
      fechaPago: form.fechaPago ? new Date(form.fechaPago) : null,
      concepto: form.concepto || null,
    })
    if (res.ok) {
      setPagos([res.pago as PagoItem, ...pagos])
      setModal(false)
      setForm({ monto: "", metodo: "Transferencia", estatus: "PENDIENTE", fechaPago: "", concepto: "" })
    }
    setCargando(false)
  }

  function imprimirRecibo(pago: PagoItem) {
    const win = window.open("", "_blank")
    if (!win) return
    win.document.write(`
      <html><head><title>Recibo de Pago</title>
      <style>body{font-family:sans-serif;padding:40px;max-width:600px;margin:0 auto}</style>
      </head><body>
      <h1>Recibo de Pago</h1>
      <p><strong>Concepto:</strong> ${pago.concepto ?? "N/A"}</p>
      <p><strong>Monto:</strong> ${formatMoney(pago.monto)}</p>
      <p><strong>Método:</strong> ${pago.metodo}</p>
      <p><strong>Estatus:</strong> ${pago.estatus}</p>
      <p><strong>Fecha:</strong> ${pago.fechaPago ? new Date(pago.fechaPago).toLocaleDateString("es-MX") : "—"}</p>
      <script>window.print();window.close()</script>
      </body></html>
    `)
    win.document.close()
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-gray-900 dark:text-white">Pagos</h3>
        <Button tamaño="sm" variante="primario" onClick={() => setModal(true)} icono={<Plus className="w-4 h-4" />}>
          Agregar pago
        </Button>
      </div>

      {/* Barra de progreso */}
      {valorEstimado && (
        <Card padding="sm" className="mb-4">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm text-gray-600 dark:text-gray-400">Pagado</span>
            <span className="text-sm font-semibold text-gray-900 dark:text-white">
              {formatMoney(totalPagado)} de {formatMoney(valorEstimado)}
            </span>
          </div>
          <div className="h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-green-500 rounded-full transition-all duration-500"
              style={{ width: `${pct}%` }}
            />
          </div>
          <p className="text-xs text-gray-500 mt-1 text-right">{pct.toFixed(0)}% cobrado</p>
        </Card>
      )}

      <div className="space-y-2">
        {pagos.length === 0 && (
          <p className="text-sm text-gray-500 text-center py-8">Sin pagos registrados</p>
        )}
        {pagos.map((pago) => (
          <Card key={pago.id} padding="sm" className="flex items-center justify-between gap-4">
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-gray-900 dark:text-white">{formatMoney(pago.monto)}</p>
              <p className="text-xs text-gray-500">
                {pago.concepto ?? pago.metodo} · {pago.fechaPago ? new Date(pago.fechaPago).toLocaleDateString("es-MX") : "Sin fecha"}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Badge
                variante={
                  pago.estatus === "PAGADO"
                    ? "pagado"
                    : pago.estatus === "VENCIDO"
                    ? "vencido"
                    : "pendiente"
                }
              >
                {pago.estatus}
              </Badge>
              <button
                onClick={() => imprimirRecibo(pago)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg transition min-w-[44px] min-h-[44px] flex items-center justify-center"
                title="Generar recibo"
              >
                <Receipt className="w-4 h-4 text-gray-500" />
              </button>
            </div>
          </Card>
        ))}
      </div>

      <Modal abierto={modal} onCerrar={() => setModal(false)} titulo="Agregar pago" tamaño="sm">
        <div className="space-y-4">
          <div>
            <label className="text-xs text-gray-500 font-medium uppercase block mb-1">Monto *</label>
            <input
              type="number"
              placeholder="0"
              value={form.monto}
              onChange={(e) => setForm({ ...form, monto: e.target.value })}
              className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#2a2a2a] text-sm"
            />
          </div>
          <div>
            <label className="text-xs text-gray-500 font-medium uppercase block mb-1">Método</label>
            <select
              value={form.metodo}
              onChange={(e) => setForm({ ...form, metodo: e.target.value })}
              className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#2a2a2a] text-sm"
            >
              {["Transferencia", "Tarjeta", "Efectivo", "Liga de pago"].map((m) => (
                <option key={m}>{m}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-500 font-medium uppercase block mb-1">Estatus</label>
            <select
              value={form.estatus}
              onChange={(e) => setForm({ ...form, estatus: e.target.value })}
              className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#2a2a2a] text-sm"
            >
              {["PENDIENTE", "PAGADO", "VENCIDO"].map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-500 font-medium uppercase block mb-1">Fecha de pago</label>
            <input
              type="date"
              value={form.fechaPago}
              onChange={(e) => setForm({ ...form, fechaPago: e.target.value })}
              className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#2a2a2a] text-sm"
            />
          </div>
          <div>
            <label className="text-xs text-gray-500 font-medium uppercase block mb-1">Concepto</label>
            <input
              type="text"
              value={form.concepto}
              onChange={(e) => setForm({ ...form, concepto: e.target.value })}
              className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#2a2a2a] text-sm"
            />
          </div>
          <div className="flex gap-3 justify-end pt-2">
            <button onClick={() => setModal(false)} className="px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-sm">Cancelar</button>
            <Button variante="primario" cargando={cargando} onClick={handleAgregar} disabled={!form.monto}>
              Guardar pago
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

// ─── Sección Archivos ─────────────────────────────────────────────────────────

function SeccionArchivos({
  clienteId,
  archivos: archivosIniciales,
  onRefresh,
}: {
  clienteId: string
  archivos: ArchivoItem[]
  onRefresh: () => void
}) {
  const [archivos, setArchivos] = useState<ArchivoItem[]>(archivosIniciales)
  const [subiendo, setSubiendo] = useState(false)
  const [error, setError] = useState("")
  const inputRef = useRef<HTMLInputElement>(null)

  async function handleSubir(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (!["application/pdf", "image/jpeg", "image/png"].includes(file.type)) {
      setError("Solo se permiten archivos PDF, JPG o PNG")
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      setError("El archivo no debe pesar más de 5 MB")
      return
    }
    setError("")
    setSubiendo(true)
    const arrayBuf = await file.arrayBuffer()
    const buf = new Uint8Array(arrayBuf)
    const res = await subirArchivo(clienteId, {
      nombre: file.name,
      etiqueta: "OTRO",
      tipo: file.type,
      tamano: file.size,
      datos: buf,
    })
    if (res.ok) {
      onRefresh()
    }
    setSubiendo(false)
    if (inputRef.current) inputRef.current.value = ""
  }

  async function handleEliminar(archivoId: string) {
    await eliminarArchivo(archivoId)
    setArchivos(archivos.filter((a) => a.id !== archivoId))
  }

  function handleDescargar(archivo: ArchivoItem) {
    if (archivo.datos) {
      const blob = new Blob([archivo.datos.buffer as ArrayBuffer], { type: archivo.tipo })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = archivo.nombre
      a.click()
      URL.revokeObjectURL(url)
    } else if (archivo.url) {
      window.open(archivo.url, "_blank")
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-gray-900 dark:text-white">Archivos</h3>
        <div>
          <input
            ref={inputRef}
            type="file"
            accept=".pdf,.jpg,.jpeg,.png"
            className="hidden"
            onChange={handleSubir}
          />
          <Button
            tamaño="sm"
            variante="primario"
            cargando={subiendo}
            onClick={() => inputRef.current?.click()}
            icono={<Upload className="w-4 h-4" />}
          >
            Subir archivo
          </Button>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 text-sm">
          {error}
        </div>
      )}

      <div className="space-y-2">
        {archivos.length === 0 && (
          <p className="text-sm text-gray-500 text-center py-8">Sin archivos subidos</p>
        )}
        {archivos.map((archivo) => (
          <Card key={archivo.id} padding="sm" className="flex items-center gap-3">
            <FileText className="w-8 h-8 text-brand shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                {archivo.nombre}
              </p>
              <p className="text-xs text-gray-500">
                {archivo.etiqueta} · {formatBytes(archivo.tamano)} · {archivo.usuario.nombre} · {new Date(archivo.fechaSubida).toLocaleDateString("es-MX")}
              </p>
            </div>
            <div className="flex gap-1 shrink-0">
              <button
                onClick={() => handleDescargar(archivo)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg transition min-w-[44px] min-h-[44px] flex items-center justify-center"
                title="Descargar"
              >
                <Download className="w-4 h-4 text-gray-500" />
              </button>
              <button
                onClick={() => handleEliminar(archivo.id)}
                className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition min-w-[44px] min-h-[44px] flex items-center justify-center"
                title="Eliminar"
              >
                <Trash2 className="w-4 h-4 text-red-500" />
              </button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}

// ─── Sección Asistente IA ─────────────────────────────────────────────────────

function SeccionAsistente({ cliente }: { cliente: ClienteCompleto }) {
  const [resultado, setResultado] = useState("")
  const [generando, setGenerando] = useState(false)
  const [accion, setAccion] = useState("")

  const plantillas: Record<string, (c: ClienteCompleto) => string> = {
    mensaje: (c) =>
      `Hola ${c.nombre}, espero que estés muy bien. Quería retomar nuestra conversación sobre ${c.retoPrincipal ?? "tu negocio"}. ¿Tienes unos minutos esta semana para que podamos avanzar? 😊`,
    temperatura: (c) => {
      const temp = c.temperatura === "CALIENTE" ? "alta" : c.temperatura === "TIBIO" ? "media" : "baja"
      return `Este cliente tiene temperatura ${temp}. ${
        c.ultimoContacto
          ? `Último contacto hace ${Math.floor((Date.now() - new Date(c.ultimoContacto).getTime()) / 86400000)} días.`
          : "Sin registro de último contacto."
      } ${c.objecionPrincipal ? `Objeción principal: "${c.objecionPrincipal}".` : ""} Recomendación: ${
        c.temperatura === "CALIENTE"
          ? "¡Actúa ya! Este prospecto está listo para cerrar."
          : c.temperatura === "TIBIO"
          ? "Mantén el contacto regular y trabaja sus dudas."
          : "Reactiva con contenido de valor antes de vender."
      }`
    },
    accion: (c) =>
      `Próxima acción sugerida para ${c.nombre}: ${
        c.etapa === "NUEVO"
          ? "Realizar primer contacto por WhatsApp presentándote."
          : c.etapa === "CONTACTADO"
          ? "Agendar una cita de diagnóstico para entender sus necesidades."
          : c.etapa === "CITA_AGENDADA"
          ? "Preparar presentación personalizada con soluciones a su reto: " + (c.retoPrincipal ?? "general")
          : c.etapa === "PROPUESTA_ENVIADA"
          ? "Hacer seguimiento y manejar objeción: " + (c.objecionPrincipal ?? "ninguna conocida")
          : "Mantener relación post-venta y buscar referidos."
      }`,
    resumen: (c) =>
      `📋 Resumen de ${c.nombre}:\n` +
      `• Empresa: ${c.empresaNombre ?? "N/A"} (${c.empresaGiro ?? "sin giro"})\n` +
      `• Etapa: ${etapaLabel(c.etapa)} | Temperatura: ${c.temperatura}\n` +
      `• Valor estimado: ${c.valorEstimado ? formatMoney(c.valorEstimado) : "No definido"}\n` +
      `• Reto principal: ${c.retoPrincipal ?? "No registrado"}\n` +
      `• Objeción: ${c.objecionPrincipal ?? "Ninguna"}\n` +
      `• Notas: ${c.notas ?? "Sin notas"}\n` +
      `• En etapa desde: ${formatFechaHistorial(c.actualizadoEn)}`,
    objecion: (c) =>
      c.objecionPrincipal
        ? `Para manejar "${c.objecionPrincipal}" con ${c.nombre}:\n\n${
            c.objecionPrincipal.includes("caro")
              ? "• Enfócate en el ROI: ¿cuánto le cuesta NO resolver esto?\n• Ofrece un pago en parcialidades.\n• Compara con el costo de contratar a alguien interno."
              : c.objecionPrincipal.includes("pensar") || c.objecionPrincipal.includes("consultar")
              ? "• Pregunta: ¿Qué información te falta para decidir?\n• Pon una fecha límite: 'La oferta es válida hasta el [fecha]'.\n• Ofrece hablar con quien toma la decisión."
              : c.objecionPrincipal.includes("competencia")
              ? "• Pregunta qué valora de ellos.\n• Resalta tu diferenciador único.\n• Ofrece una garantía o prueba piloto."
              : "• Mantén el contacto sin presionar.\n• Comparte casos de éxito similares.\n• Pregunta en qué momento sería el ideal."
          }`
        : `${c.nombre} no tiene una objeción registrada. Considera preguntar directamente: "¿Qué es lo que te frena para dar el siguiente paso?"`,
  }

  async function generarConIA(tipo: string) {
    setAccion(tipo)
    setGenerando(true)
    // Simulate async (hook listo para API Anthropic)
    await new Promise((r) => setTimeout(r, 600))
    setResultado(plantillas[tipo]?.(cliente) ?? "")
    setGenerando(false)
  }

  const botones = [
    { id: "mensaje", label: "Redactar mensaje", icon: "💬" },
    { id: "temperatura", label: "Clasificar temperatura", icon: "🌡️" },
    { id: "accion", label: "Sugerir próxima acción", icon: "🎯" },
    { id: "resumen", label: "Resumir expediente", icon: "📋" },
    { id: "objecion", label: "Manejar objeción", icon: "🛡️" },
  ]

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <Bot className="w-5 h-5 text-brand" />
        <h3 className="font-semibold text-gray-900 dark:text-white">Asistente IA</h3>
        <span className="text-xs bg-brand/10 text-brand px-2 py-0.5 rounded-full font-medium">
          Beta
        </span>
      </div>
      <div className="flex flex-wrap gap-2 mb-6">
        {botones.map((b) => (
          <button
            key={b.id}
            onClick={() => generarConIA(b.id)}
            disabled={generando}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-medium transition min-h-[44px] ${
              accion === b.id && resultado
                ? "border-brand bg-brand/10 text-brand"
                : "border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-white/5"
            }`}
          >
            {generando && accion === b.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <span>{b.icon}</span>}
            {b.label}
          </button>
        ))}
      </div>

      <AnimatePresence>
        {resultado && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
          >
            <Card padding="md" className="border-brand/30">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-medium text-brand uppercase tracking-wide">
                  {botones.find((b) => b.id === accion)?.label}
                </span>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(resultado)
                  }}
                  className="text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition"
                >
                  Copiar
                </button>
              </div>
              <p className="text-sm text-gray-800 dark:text-gray-200 whitespace-pre-line">
                {resultado}
              </p>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ─── Modal Perdido ────────────────────────────────────────────────────────────

function ModalPerdidoCliente({
  abierto,
  onCerrar,
  onConfirmar,
}: {
  abierto: boolean
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
    <Modal abierto={abierto} onCerrar={onCerrar} titulo="Motivo de pérdida" tamaño="sm">
      <div className="space-y-2 mb-6">
        {MOTIVOS_PERDIDA.map((m) => (
          <button
            key={m}
            onClick={() => setMotivo(m)}
            className={`w-full text-left px-4 py-2.5 rounded-xl text-sm transition border ${
              motivo === m
                ? "border-red-500 bg-red-50 dark:bg-red-900/20 text-red-700 font-medium"
                : "border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-white/5"
            }`}
          >
            {m}
          </button>
        ))}
      </div>
      <div className="flex gap-3 justify-end">
        <button onClick={onCerrar} className="px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-sm">Cancelar</button>
        <Button variante="peligro" cargando={cargando} onClick={handleConfirmar} disabled={!motivo}>
          Marcar como perdido
        </Button>
      </div>
    </Modal>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function ExpedienteCliente({ cliente: clienteInicial }: { cliente: ClienteCompleto }) {
  const router = useRouter()
  const [cliente, setCliente] = useState<ClienteCompleto>(clienteInicial)
  const [tab, setTab] = useState<Tab>("Datos")
  const [modalPerdido, setModalPerdido] = useState(false)
  const [modalGanado, setModalGanado] = useState(false)
  const [cargando, startTransition] = useTransition()

  const temp = temperaturaInfo(cliente.temperatura)
  const estado = etiquetaEstado(cliente.estadoCartera)
  const diasUltimoContacto = diasDesde(cliente.ultimoContacto)
  const accionVencida = cliente.fechaProximaAccion
    ? new Date(cliente.fechaProximaAccion) < new Date()
    : false

  const mensajeWA = `Hola ${cliente.nombre}, te contacto de parte de nuestro equipo. ¿Tienes un momento para platicar?`
  const waUrl = (cliente.whatsapp ?? cliente.telefono)
    ? encodeWhatsApp(cliente.whatsapp ?? cliente.telefono ?? "", mensajeWA)
    : null

  async function handleUpdate(data: ActualizarClienteData) {
    const res = await actualizarExpediente(cliente.id, data)
    if (res.ok) {
      setCliente({ ...cliente, ...res.cliente })
    }
  }

  async function handleGanado() {
    await marcarGanadoCliente(cliente.id)
    setCliente({ ...cliente, estadoCartera: "GANADO", etapa: "GANADO" })
    setModalGanado(false)
  }

  async function handlePerdido(motivo: string) {
    await marcarPerdidoCliente(cliente.id, motivo)
    setCliente({ ...cliente, estadoCartera: "PERDIDO", motivoPerdida: motivo })
    setModalPerdido(false)
  }

  async function handleArchivar() {
    if (!confirm("¿Archivar este cliente?")) return
    await archivarCliente(cliente.id)
    setCliente({ ...cliente, estadoCartera: "ARCHIVADO" })
  }

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <Link
          href="/clientes"
          className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 dark:hover:text-white transition mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Volver a Clientes
        </Link>

        <div className="flex flex-wrap items-start gap-4">
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white truncate">
              {cliente.nombre}
            </h1>
            {cliente.empresaNombre && (
              <p className="text-gray-500 text-sm mt-1">
                {cliente.empresaPuesto ? `${cliente.empresaPuesto} en ` : ""}
                {cliente.empresaNombre}
              </p>
            )}

            {/* Badges */}
            <div className="flex flex-wrap items-center gap-2 mt-3">
              <Badge variante={estado.variante}>{estado.label}</Badge>
              <Badge variante={temp.variante}>{temp.emoji} {temp.label}</Badge>
              <span className="text-xs bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 px-2.5 py-1 rounded-full border border-gray-200 dark:border-gray-700">
                {etapaLabel(cliente.etapa)}
              </span>
              {diasUltimoContacto < 999 && (
                <span
                  className={`text-xs px-2.5 py-1 rounded-full border ${
                    diasUltimoContacto > 7
                      ? "bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800"
                      : "bg-gray-100 text-gray-600 border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700"
                  }`}
                >
                  <Clock className="w-3 h-3 inline mr-1" />
                  Último contacto hace {diasUltimoContacto}d
                </span>
              )}
              {cliente.proximaAccion && (
                <span
                  className={`text-xs px-2.5 py-1 rounded-full border ${
                    accionVencida
                      ? "bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400"
                      : "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400"
                  }`}
                >
                  <AlertCircle className="w-3 h-3 inline mr-1" />
                  {cliente.proximaAccion}
                  {cliente.fechaProximaAccion && ` · ${new Date(cliente.fechaProximaAccion).toLocaleDateString("es-MX")}`}
                </span>
              )}
            </div>
          </div>

          {/* Botones de acción */}
          <div className="flex flex-wrap gap-2 shrink-0">
            {waUrl && (
              <a
                href={waUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-green-500 hover:bg-green-600 text-white text-sm font-medium transition min-h-[44px]"
              >
                <MessageCircle className="w-4 h-4" />
                WhatsApp
              </a>
            )}
            {cliente.correo && (
              <a
                href={`mailto:${cliente.correo}?subject=Seguimiento&body=Hola ${encodeURIComponent(cliente.nombre)},`}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-white/5 text-sm font-medium transition min-h-[44px]"
              >
                <Mail className="w-4 h-4" />
                Email
              </a>
            )}
          </div>
        </div>

        {/* Botones de estado */}
        {cliente.estadoCartera === "ACTIVO" && (
          <div className="flex flex-wrap gap-2 mt-4">
            <Button variante="exito" tamaño="sm" onClick={() => setModalGanado(true)} icono={<Trophy className="w-4 h-4" />}>
              Marcar Ganado 🎉
            </Button>
            <Button variante="peligro" tamaño="sm" onClick={() => setModalPerdido(true)} icono={<XCircle className="w-4 h-4" />}>
              Marcar Perdido
            </Button>
            <Button variante="fantasma" tamaño="sm" onClick={handleArchivar} icono={<Archive className="w-4 h-4" />}>
              Archivar
            </Button>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-800 overflow-x-auto">
        <div className="flex gap-1 min-w-max">
          {TABS.map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition whitespace-nowrap min-h-[44px] ${
                tab === t
                  ? "border-brand text-brand"
                  : "border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      <Card padding="md">
        <AnimatePresence mode="wait">
          <motion.div
            key={tab}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.15 }}
          >
            {tab === "Datos" && <SeccionDatos cliente={cliente} onUpdate={handleUpdate} />}
            {tab === "Empresa" && <SeccionEmpresa cliente={cliente} onUpdate={handleUpdate} />}
            {tab === "Historial" && (
              <SeccionHistorial clienteId={cliente.id} notas={cliente.notasHistorial} />
            )}
            {tab === "Pagos" && (
              <SeccionPagos
                clienteId={cliente.id}
                pagos={cliente.pagos}
                valorEstimado={cliente.valorEstimado}
              />
            )}
            {tab === "Archivos" && (
              <SeccionArchivos clienteId={cliente.id} archivos={cliente.archivosSubidos} onRefresh={() => router.refresh()} />
            )}
            {tab === "Asistente IA" && <SeccionAsistente cliente={cliente} />}
          </motion.div>
        </AnimatePresence>
      </Card>

      {/* Modal Ganado */}
      <Modal abierto={modalGanado} onCerrar={() => setModalGanado(false)} titulo="¿Marcar como GANADO? 🎉" tamaño="sm">
        <p className="text-gray-600 dark:text-gray-400 text-sm mb-6">
          <strong>{cliente.nombre}</strong> pasará a Completados. Esta acción quedará en el historial.
        </p>
        <div className="flex gap-3 justify-end">
          <button onClick={() => setModalGanado(false)} className="px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-sm">Cancelar</button>
          <Button variante="exito" onClick={handleGanado}>Sí, marcar GANADO 🎉</Button>
        </div>
      </Modal>

      {/* Modal Perdido */}
      <ModalPerdidoCliente
        abierto={modalPerdido}
        onCerrar={() => setModalPerdido(false)}
        onConfirmar={handlePerdido}
      />
    </div>
  )
}
