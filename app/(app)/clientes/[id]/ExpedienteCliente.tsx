"use client"

import { useState, useTransition, useRef } from "react"
import Link from "next/link"
import {
  ArrowLeft,
  MessageCircle,
  Mail,
  Trophy,
  XCircle,
  Archive,
  Star,
  AlertCircle,
  Clock,
  FileText,
  CreditCard,
  Paperclip,
  Building2,
  Plus,
  Check,
  Pencil,
  X,
  Sparkles,
  Thermometer,
  CalendarCheck,
  BookOpen,
  ShieldCheck,
} from "lucide-react"
import { Badge } from "@/app/components/ui/Badge"
import { Button } from "@/app/components/ui/Button"
import { Card } from "@/app/components/ui/Card"
import { Input, Textarea, Select } from "@/app/components/ui/Input"
import { ConfirmModal } from "@/app/components/ui/Modal"
import {
  actualizarCliente,
  cambiarEstadoCartera,
  toggleFavorito,
  agregarNota,
} from "@/app/actions/clientes"
import {
  redactarMensajeIA,
  clasificarTemperaturaIA,
  sugerirProximaAccionIA,
  resumirExpedienteIA,
  manejarObjecionIA,
} from "@/app/actions/ia"
import {
  formatMoney,
  formatFecha,
  formatFechaCorta,
  getTemperaturaEmoji,
  getTemperaturaLabel,
  getDiasDesde,
  etapaLabel,
} from "@/app/lib/utils"

// ─── Types ────────────────────────────────────────────────────────────────

type Nota = {
  id: string
  contenido: string
  tipo: string
  fecha: Date
  usuario: { nombre: string; avatar: string | null }
}

type Pago = {
  id: string
  monto: number
  metodo: string
  estatus: string
  fechaPago: Date | null
  fechaVencimiento: Date | null
  concepto: string | null
  folio: number | null
}

type Archivo = {
  id: string
  nombre: string
  tipo: string
  tamano: number
  etiqueta: string
  url: string | null
  fechaSubida: Date
  usuarioId: string
}

type ClienteCompleto = {
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
  proximaAccion: string | null
  fechaProximaAccion: Date | null
  ultimoContacto: Date | null
  valorEstimado: number | null
  retoPrincipal: string | null
  numVendedores: number | null
  empresaNombre: string | null
  empresaGiro: string | null
  empresaPuesto: string | null
  empresaRfc: string | null
  empresaSitio: string | null
  empresaDireccion: string | null
  empresaTamano: string | null
  empresaNotas: string | null
  utmSource: string | null
  notas: string | null
  motivoPerdida: string | null
  creadoEn: Date
  esFavorito: boolean
  vendedor: { nombre: string }
  notasHistorial: Nota[]
  pagos: Pago[]
  archivosSubidos: Archivo[]
}

// ─── Helpers ──────────────────────────────────────────────────────────────

const TIPO_NOTA_ICONS: Record<string, string> = {
  NOTA: "📝",
  LLAMADA: "📞",
  WHATSAPP: "💬",
  CORREO: "📧",
  CITA: "📅",
  PAGO: "💰",
  SISTEMA: "⚙️",
}

const TIPO_NOTA_OPCIONES = [
  { valor: "NOTA", label: "📝 Nota" },
  { valor: "LLAMADA", label: "📞 Llamada" },
  { valor: "WHATSAPP", label: "💬 WhatsApp" },
  { valor: "CORREO", label: "📧 Correo" },
  { valor: "CITA", label: "📅 Cita" },
]

const ETAPAS_OPCIONES = [
  { valor: "NUEVO", label: "Nuevo" },
  { valor: "CONTACTADO", label: "Contactado" },
  { valor: "CITA_AGENDADA", label: "Cita agendada" },
  { valor: "PROPUESTA_ENVIADA", label: "Propuesta enviada" },
  { valor: "NEGOCIACION", label: "Negociación" },
]

const TEMP_OPCIONES = [
  { valor: "CALIENTE", label: "🔥 Caliente" },
  { valor: "TIBIO", label: "🟡 Tibio" },
  { valor: "FRIO", label: "🔵 Frío" },
]

type BadgeVariante = "caliente" | "tibio" | "frio" | "activo" | "ganado" | "perdido" | "archivado" | "default"

function temperaturaVariante(t: string): BadgeVariante {
  if (t === "CALIENTE") return "caliente"
  if (t === "FRIO") return "frio"
  return "tibio"
}

function estadoVariante(e: string): BadgeVariante {
  if (e === "GANADO") return "ganado"
  if (e === "PERDIDO") return "perdido"
  if (e === "ARCHIVADO") return "archivado"
  return "activo"
}

function formatBytes(b: number): string {
  if (b < 1024) return `${b} B`
  if (b < 1048576) return `${(b / 1024).toFixed(1)} KB`
  return `${(b / 1048576).toFixed(1)} MB`
}

// ─── Campo editable inline ─────────────────────────────────────────────────

function CampoEditable({
  label,
  valor,
  onGuardar,
  tipo = "text",
  placeholder,
}: {
  label: string
  valor: string | null | undefined
  onGuardar: (v: string) => void
  tipo?: string
  placeholder?: string
}) {
  const [editando, setEditando] = useState(false)
  const [val, setVal] = useState(valor ?? "")
  const inputRef = useRef<HTMLInputElement>(null)

  function iniciarEdicion() {
    setVal(valor ?? "")
    setEditando(true)
    setTimeout(() => inputRef.current?.focus(), 50)
  }

  function guardar() {
    onGuardar(val)
    setEditando(false)
  }

  return (
    <div>
      <p className="text-xs text-gray-500 mb-0.5">{label}</p>
      {editando ? (
        <div className="flex gap-1">
          <input
            ref={inputRef}
            type={tipo}
            value={val}
            onChange={(e) => setVal(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") guardar(); if (e.key === "Escape") setEditando(false) }}
            placeholder={placeholder}
            className="flex-1 px-2 py-1 text-sm rounded-lg border border-[#e8b763] bg-white dark:bg-[#1a1a1a] text-gray-900 dark:text-white outline-none"
          />
          <button onClick={guardar} className="p-1 text-green-500 hover:bg-green-50 rounded"><Check size={14} /></button>
          <button onClick={() => setEditando(false)} className="p-1 text-gray-400 hover:bg-gray-100 dark:hover:bg-white/10 rounded"><X size={14} /></button>
        </div>
      ) : (
        <button
          onClick={iniciarEdicion}
          className="group flex items-center gap-1 text-sm text-gray-800 dark:text-gray-200 hover:text-[#e8b763] transition w-full text-left"
        >
          <span className="flex-1">{valor || <span className="text-gray-400 italic">Sin datos</span>}</span>
          <Pencil size={11} className="opacity-0 group-hover:opacity-100 transition shrink-0" />
        </button>
      )}
    </div>
  )
}

// ─── Tabs ─────────────────────────────────────────────────────────────────

type Tab = "info" | "historial" | "pagos" | "archivos" | "empresa"

const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: "info", label: "Información", icon: <FileText size={15} /> },
  { id: "historial", label: "Historial", icon: <Clock size={15} /> },
  { id: "pagos", label: "Pagos", icon: <CreditCard size={15} /> },
  { id: "archivos", label: "Archivos", icon: <Paperclip size={15} /> },
  { id: "empresa", label: "Empresa", icon: <Building2 size={15} /> },
]

// ─── Componente principal ─────────────────────────────────────────────────

export function ExpedienteCliente({ cliente: clienteInicial }: { cliente: ClienteCompleto }) {
  const [cliente, setCliente] = useState(clienteInicial)
  const [tab, setTab] = useState<Tab>("info")
  const [pending, start] = useTransition()
  const [modalPerdido, setModalPerdido] = useState(false)
  const [motivoPerdida, setMotivoPerdida] = useState("")
  const [notaContenido, setNotaContenido] = useState("")
  const [notaTipo, setNotaTipo] = useState("NOTA")
  const [guardandoNota, startNota] = useTransition()
  const [iaTexto, setIaTexto] = useState<string | null>(null)
  const [iaEtiqueta, setIaEtiqueta] = useState("")
  const [iaFuente, setIaFuente] = useState(false)
  const [cargandoIA, startIA] = useTransition()

  const tel = cliente.whatsapp ?? cliente.telefono ?? ""
  const diasSinContacto = getDiasDesde(cliente.ultimoContacto)
  const accionVencida = cliente.fechaProximaAccion && new Date(cliente.fechaProximaAccion) < new Date()

  function actualizar(campo: string, valor: string | number | null) {
    start(async () => {
      const actualizado = await actualizarCliente(cliente.id, { [campo]: valor } as Parameters<typeof actualizarCliente>[1])
      if (actualizado.ok) setCliente((prev) => ({ ...prev, [campo]: valor }))
    })
  }

  async function handleFavorito() {
    const r = await toggleFavorito(cliente.id)
    setCliente((prev) => ({ ...prev, esFavorito: r.favorito }))
  }

  async function handleGanado() {
    start(async () => {
      await cambiarEstadoCartera(cliente.id, "GANADO")
      setCliente((prev) => ({ ...prev, estadoCartera: "GANADO", etapa: "GANADO" }))
    })
  }

  async function handlePerdido() {
    await cambiarEstadoCartera(cliente.id, "PERDIDO", motivoPerdida)
    setCliente((prev) => ({ ...prev, estadoCartera: "PERDIDO", etapa: "PERDIDO" }))
    setModalPerdido(false)
  }

  async function handleArchivar() {
    start(async () => {
      await cambiarEstadoCartera(cliente.id, "ARCHIVADO")
      setCliente((prev) => ({ ...prev, estadoCartera: "ARCHIVADO" }))
    })
  }

  function handleAgregarNota() {
    if (!notaContenido.trim()) return
    startNota(async () => {
      const r = await agregarNota(cliente.id, notaContenido, notaTipo)
      if (r.ok && r.nota) {
        setCliente((prev) => ({
          ...prev,
          notasHistorial: [
            {
              ...r.nota!,
              usuario: { nombre: prev.vendedor.nombre, avatar: null },
            } as Nota,
            ...prev.notasHistorial,
          ],
        }))
        setNotaContenido("")
      }
    })
  }

  function usarIA(fn: () => Promise<{ ok: boolean; mensaje?: string; temperatura?: string; razon?: string; accion?: string; resumen?: string; respuesta?: string; fuenteIA: boolean }>, etiqueta: string) {
    startIA(async () => {
      const r = await fn()
      const texto = r.mensaje ?? r.resumen ?? r.respuesta ?? (r.temperatura ? `${r.temperatura} — ${r.razon}` : null) ?? (r.accion ? `📅 ${r.accion}` : null)
      setIaTexto(texto ?? "Sin respuesta")
      setIaEtiqueta(etiqueta)
      setIaFuente(r.fuenteIA)
    })
  }

  const totalPagado = cliente.pagos
    .filter((p) => p.estatus === "PAGADO")
    .reduce((s, p) => s + p.monto, 0)
  const totalPendiente = cliente.pagos
    .filter((p) => p.estatus === "PENDIENTE")
    .reduce((s, p) => s + p.monto, 0)
  const totalPagos = totalPagado + totalPendiente

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-6">
      {/* Volver */}
      <Link
        href="/clientes"
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-[#e8b763] transition"
      >
        <ArrowLeft size={16} /> Volver a clientes
      </Link>

      {/* Header */}
      <Card padding="md">
        <div className="flex flex-col md:flex-row md:items-start gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-2">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{cliente.nombre}</h1>
              <button onClick={handleFavorito} className="text-gray-300 hover:text-[#e8b763] transition">
                <Star size={18} className={cliente.esFavorito ? "fill-[#e8b763] text-[#e8b763]" : ""} />
              </button>
            </div>

            <div className="flex flex-wrap gap-2 mb-3">
              <Badge variante={estadoVariante(cliente.estadoCartera)}>{cliente.estadoCartera}</Badge>
              <Badge variante={temperaturaVariante(cliente.temperatura)}>
                {getTemperaturaEmoji(cliente.temperatura)} {getTemperaturaLabel(cliente.temperatura)}
              </Badge>
              <Badge variante="default">{etapaLabel(cliente.etapa)}</Badge>
              {diasSinContacto > 7 && (
                <Badge variante="vencido">
                  <AlertCircle size={10} /> {diasSinContacto}d sin contacto
                </Badge>
              )}
            </div>

            {/* Próxima acción */}
            {cliente.proximaAccion && (
              <div
                className={`inline-flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-xl mb-3 ${accionVencida ? "bg-red-50 text-red-600 dark:bg-red-900/20" : "bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-300"}`}
              >
                {accionVencida && <AlertCircle size={13} />}
                <Clock size={13} />
                {cliente.proximaAccion}
                {cliente.fechaProximaAccion && (
                  <span className="opacity-70">· {formatFecha(cliente.fechaProximaAccion)}</span>
                )}
              </div>
            )}

            {/* Objeción */}
            {cliente.objecionPrincipal && (
              <p className="text-sm text-orange-600 dark:text-orange-400 mb-3">
                ⚠️ Objeción: {cliente.objecionPrincipal}
              </p>
            )}

            {cliente.valorEstimado && (
              <p className="text-xl font-bold text-gray-900 dark:text-white">
                {formatMoney(cliente.valorEstimado)}
              </p>
            )}
          </div>

          {/* Botones de acción */}
          <div className="flex flex-col gap-2 shrink-0">
            {tel && (
              <a
                href={`https://wa.me/${tel.replace(/\D/g, "").replace(/^(?!52)/, "52")}?text=${encodeURIComponent(`Hola ${cliente.nombre}, te escribo para`)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-green-500 text-white text-sm font-medium hover:bg-green-600 transition"
              >
                <MessageCircle size={16} /> WhatsApp
              </a>
            )}
            {cliente.correo && (
              <a
                href={`mailto:${cliente.correo}?subject=Seguimiento&body=Hola ${cliente.nombre},%0D%0A%0D%0A`}
                className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-blue-500 text-white text-sm font-medium hover:bg-blue-600 transition"
              >
                <Mail size={16} /> Email
              </a>
            )}
            {cliente.estadoCartera === "ACTIVO" && (
              <>
                <Button
                  variante="exito"
                  tamaño="sm"
                  cargando={pending}
                  icono={<Trophy size={15} />}
                  onClick={handleGanado}
                >
                  Marcar ganado 🎉
                </Button>
                <Button
                  variante="fantasma"
                  tamaño="sm"
                  icono={<XCircle size={15} />}
                  onClick={() => setModalPerdido(true)}
                >
                  Marcar perdido
                </Button>
                <Button
                  variante="fantasma"
                  tamaño="sm"
                  icono={<Archive size={15} />}
                  onClick={handleArchivar}
                >
                  Archivar
                </Button>
              </>
            )}
          </div>
        </div>
      </Card>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200 dark:border-gray-800 overflow-x-auto">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition whitespace-nowrap ${
              tab === t.id
                ? "border-[#e8b763] text-[#e8b763]"
                : "border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
            }`}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* Tab: Información */}
      {tab === "info" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card padding="md">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Datos personales</h3>
            <div className="space-y-4">
              <CampoEditable
                label="Nombre"
                valor={cliente.nombre}
                onGuardar={(v) => actualizar("nombre", v)}
                placeholder="Nombre completo"
              />
              <CampoEditable
                label="Teléfono"
                valor={cliente.telefono}
                tipo="tel"
                onGuardar={(v) => actualizar("telefono", v)}
                placeholder="+52 33 1234 5678"
              />
              <CampoEditable
                label="WhatsApp"
                valor={cliente.whatsapp}
                tipo="tel"
                onGuardar={(v) => actualizar("whatsapp", v)}
                placeholder="+52 33 1234 5678"
              />
              <CampoEditable
                label="Correo"
                valor={cliente.correo}
                tipo="email"
                onGuardar={(v) => actualizar("correo", v)}
                placeholder="email@ejemplo.com"
              />
              <CampoEditable
                label="Origen"
                valor={cliente.origen}
                onGuardar={(v) => actualizar("origen", v)}
                placeholder="Ej. Referido, Instagram..."
              />
            </div>
          </Card>

          <Card padding="md">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Negocio</h3>
            <div className="space-y-4">
              <div>
                <p className="text-xs text-gray-500 mb-0.5">Etapa</p>
                <select
                  value={cliente.etapa}
                  onChange={(e) => actualizar("etapa", e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#1a1a1a] text-gray-900 dark:text-white outline-none focus:border-[#e8b763]"
                >
                  {ETAPAS_OPCIONES.map((o) => (
                    <option key={o.valor} value={o.valor}>{o.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-0.5">Temperatura</p>
                <select
                  value={cliente.temperatura}
                  onChange={(e) => actualizar("temperatura", e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#1a1a1a] text-gray-900 dark:text-white outline-none focus:border-[#e8b763]"
                >
                  {TEMP_OPCIONES.map((o) => (
                    <option key={o.valor} value={o.valor}>{o.label}</option>
                  ))}
                </select>
              </div>
              <CampoEditable
                label="Valor estimado (MXN)"
                valor={cliente.valorEstimado?.toString()}
                tipo="number"
                onGuardar={(v) => actualizar("valorEstimado", v ? Number(v) : null)}
                placeholder="0"
              />
              <CampoEditable
                label="Próxima acción"
                valor={cliente.proximaAccion}
                onGuardar={(v) => actualizar("proximaAccion", v)}
                placeholder="Ej. Enviar propuesta"
              />
              <CampoEditable
                label="Fecha próxima acción"
                valor={cliente.fechaProximaAccion ? new Date(cliente.fechaProximaAccion).toISOString().slice(0, 10) : ""}
                tipo="date"
                onGuardar={(v) => actualizar("fechaProximaAccion", v)}
              />
              <CampoEditable
                label="Objeción principal"
                valor={cliente.objecionPrincipal}
                onGuardar={(v) => actualizar("objecionPrincipal", v)}
                placeholder="Ej. Está muy caro"
              />
              <CampoEditable
                label="Reto principal"
                valor={cliente.retoPrincipal}
                onGuardar={(v) => actualizar("retoPrincipal", v)}
                placeholder="Ej. Aumentar ventas 30%"
              />
            </div>
          </Card>

          <Card padding="md" className="md:col-span-2">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Notas generales</h3>
            <CampoEditable
              label=""
              valor={cliente.notas}
              onGuardar={(v) => actualizar("notas", v)}
              placeholder="Notas adicionales..."
            />
            <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-800 grid grid-cols-2 md:grid-cols-3 gap-2 text-xs text-gray-400">
              <span>Creado: {formatFechaCorta(cliente.creadoEn)}</span>
              <span>Vendedor: {cliente.vendedor.nombre}</span>
              {cliente.utmSource && <span>Fuente: {cliente.utmSource}</span>}
            </div>
          </Card>
        </div>
      )}

      {/* Asistente IA — siempre visible */}
      <Card padding="md" className="border border-brand/20 bg-brand/5">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="w-4 h-4 text-brand" />
          <h3 className="font-semibold text-gray-900 dark:text-white text-sm">Asistente IA</h3>
          {!process.env.NEXT_PUBLIC_AI_ENABLED && (
            <span className="text-xs text-gray-400">(sin API key — modo plantilla)</span>
          )}
        </div>
        <div className="flex flex-wrap gap-2 mb-3">
          <Button variante="fantasma" tamaño="sm" icono={<MessageCircle className="w-3.5 h-3.5" />} cargando={cargandoIA}
            onClick={() => usarIA(() => redactarMensajeIA(cliente.id, "whatsapp"), "Mensaje WhatsApp")}>
            Redactar WA
          </Button>
          <Button variante="fantasma" tamaño="sm" icono={<Thermometer className="w-3.5 h-3.5" />} cargando={cargandoIA}
            onClick={() => usarIA(() => clasificarTemperaturaIA(cliente.id), "Temperatura")}>
            Temperatura
          </Button>
          <Button variante="fantasma" tamaño="sm" icono={<CalendarCheck className="w-3.5 h-3.5" />} cargando={cargandoIA}
            onClick={() => usarIA(() => sugerirProximaAccionIA(cliente.id), "Próxima acción")}>
            Próxima acción
          </Button>
          <Button variante="fantasma" tamaño="sm" icono={<BookOpen className="w-3.5 h-3.5" />} cargando={cargandoIA}
            onClick={() => usarIA(() => resumirExpedienteIA(cliente.id), "Resumen")}>
            Resumen
          </Button>
          <Button variante="fantasma" tamaño="sm" icono={<ShieldCheck className="w-3.5 h-3.5" />} cargando={cargandoIA}
            onClick={() => usarIA(() => manejarObjecionIA(cliente.id), "Manejo de objeción")}>
            Manejar objeción
          </Button>
        </div>
        {iaTexto && (
          <div className="bg-white dark:bg-gray-900 rounded-xl p-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-brand">{iaEtiqueta}</span>
              <div className="flex items-center gap-2">
                {iaFuente ? (
                  <span className="text-xs text-green-600">✨ IA</span>
                ) : (
                  <span className="text-xs text-gray-400">📋 Plantilla</span>
                )}
                <button onClick={() => { navigator.clipboard.writeText(iaTexto) }} className="text-xs text-gray-400 hover:text-brand">Copiar</button>
                <button onClick={() => setIaTexto(null)} className="text-gray-400 hover:text-gray-600"><X className="w-3.5 h-3.5" /></button>
              </div>
            </div>
            <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{iaTexto}</p>
            <Button tamaño="sm" variante="fantasma" onClick={() => { setNotaContenido(iaTexto); setTab("historial") }}>
              Usar como nota
            </Button>
          </div>
        )}
      </Card>

      {/* Tab: Historial */}
      {tab === "historial" && (
        <div className="space-y-4">
          {/* Agregar nota */}
          <Card padding="md">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-3">Registrar interacción</h3>
            <div className="flex gap-2 mb-3">
              {TIPO_NOTA_OPCIONES.map((t) => (
                <button
                  key={t.valor}
                  onClick={() => setNotaTipo(t.valor)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-medium transition ${notaTipo === t.valor ? "bg-[#e8b763] text-white" : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200"}`}
                >
                  {t.label}
                </button>
              ))}
            </div>
            <Textarea
              value={notaContenido}
              onChange={(e) => setNotaContenido(e.target.value)}
              placeholder="Describe la interacción, acuerdos, o notas importantes..."
              rows={3}
            />
            <div className="flex justify-end mt-2">
              <Button
                tamaño="sm"
                icono={<Plus size={14} />}
                cargando={guardandoNota}
                onClick={handleAgregarNota}
                disabled={!notaContenido.trim()}
              >
                Registrar
              </Button>
            </div>
          </Card>

          {/* Línea de tiempo */}
          <div className="relative">
            <div className="absolute left-5 top-0 bottom-0 w-0.5 bg-gray-100 dark:bg-gray-800" />
            <div className="space-y-4">
              {cliente.notasHistorial.length === 0 ? (
                <Card className="text-center py-10">
                  <p className="text-gray-400">Sin interacciones registradas</p>
                </Card>
              ) : (
                cliente.notasHistorial.map((n) => (
                  <div key={n.id} className="flex gap-4 relative">
                    <div className="w-10 h-10 rounded-full bg-white dark:bg-[#1f1f1f] border-2 border-gray-200 dark:border-gray-700 flex items-center justify-center text-sm shrink-0 z-10">
                      {TIPO_NOTA_ICONS[n.tipo] ?? "📝"}
                    </div>
                    <div className="flex-1 bg-white dark:bg-[#1f1f1f] rounded-2xl border border-gray-100 dark:border-gray-800 p-4">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="text-xs font-medium text-gray-500">{n.usuario.nombre}</span>
                        <span className="text-xs text-gray-400">{formatFecha(n.fecha)}</span>
                      </div>
                      <p className="text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap">{n.contenido}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Tab: Pagos */}
      {tab === "pagos" && (
        <div className="space-y-4">
          {/* Resumen */}
          {totalPagos > 0 && (
            <Card padding="md">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm text-gray-500">Progreso de pago</span>
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {formatMoney(totalPagado)} / {formatMoney(totalPagos)}
                </span>
              </div>
              <div className="h-3 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-green-500 rounded-full transition-all"
                  style={{ width: `${totalPagos ? (totalPagado / totalPagos) * 100 : 0}%` }}
                />
              </div>
              <div className="flex justify-between mt-2 text-xs text-gray-400">
                <span className="text-green-600">{formatMoney(totalPagado)} pagado</span>
                <span className="text-yellow-600">{formatMoney(totalPendiente)} pendiente</span>
              </div>
            </Card>
          )}

          {/* Lista de pagos */}
          {cliente.pagos.length === 0 ? (
            <Card className="text-center py-10">
              <p className="text-gray-400">Sin pagos registrados</p>
            </Card>
          ) : (
            <Card padding="none">
              <div className="divide-y divide-gray-50 dark:divide-gray-800">
                {cliente.pagos.map((p) => (
                  <div key={p.id} className="flex items-center gap-4 px-6 py-4">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 dark:text-white text-sm">
                        {p.concepto ?? "Pago"}
                        {p.folio && <span className="ml-2 text-xs text-gray-400">#{p.folio}</span>}
                      </p>
                      <p className="text-xs text-gray-400">{p.metodo} · {p.fechaPago ? formatFechaCorta(p.fechaPago) : formatFechaCorta(p.fechaVencimiento)}</p>
                    </div>
                    <Badge variante={p.estatus === "PAGADO" ? "pagado" : p.estatus === "VENCIDO" ? "vencido" : "pendiente"}>
                      {p.estatus}
                    </Badge>
                    <span className="font-bold text-gray-900 dark:text-white">{formatMoney(p.monto)}</span>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      )}

      {/* Tab: Archivos */}
      {tab === "archivos" && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-sm text-gray-500">{cliente.archivosSubidos.length} archivo(s)</p>
            <p className="text-xs text-gray-400">Máximo 10 MB por archivo</p>
          </div>
          {cliente.archivosSubidos.length === 0 ? (
            <Card className="text-center py-10">
              <Paperclip className="w-10 h-10 mx-auto mb-2 text-gray-300" />
              <p className="text-gray-400 text-sm">Sin archivos adjuntos</p>
            </Card>
          ) : (
            <Card padding="none">
              <div className="divide-y divide-gray-50 dark:divide-gray-800">
                {cliente.archivosSubidos.map((a) => (
                  <div key={a.id} className="flex items-center gap-4 px-6 py-4">
                    <Paperclip size={16} className="text-gray-400 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm text-gray-800 dark:text-gray-200 truncate">{a.nombre}</p>
                      <p className="text-xs text-gray-400">{a.tipo} · {formatBytes(a.tamano)} · {formatFechaCorta(a.fechaSubida)}</p>
                    </div>
                    <Badge variante="default">{a.etiqueta}</Badge>
                    {a.url && (
                      <a href={a.url} target="_blank" rel="noopener noreferrer" className="text-[#e8b763] hover:underline text-sm">
                        Ver
                      </a>
                    )}
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      )}

      {/* Tab: Empresa */}
      {tab === "empresa" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card padding="md">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Datos de la empresa</h3>
            <div className="space-y-4">
              <CampoEditable label="Nombre empresa" valor={cliente.empresaNombre} onGuardar={(v) => actualizar("empresaNombre", v)} placeholder="Empresa S.A." />
              <CampoEditable label="Giro" valor={cliente.empresaGiro} onGuardar={(v) => actualizar("empresaGiro", v)} placeholder="Consultoría, Tecnología..." />
              <CampoEditable label="Puesto del contacto" valor={cliente.empresaPuesto} onGuardar={(v) => actualizar("empresaPuesto", v)} placeholder="Director, Gerente..." />
              <CampoEditable label="RFC" valor={cliente.empresaRfc} onGuardar={(v) => actualizar("empresaRfc", v)} placeholder="ABC123456XYZ" />
              <CampoEditable label="Sitio web" valor={cliente.empresaSitio} onGuardar={(v) => actualizar("empresaSitio", v)} placeholder="https://empresa.com" />
            </div>
          </Card>
          <Card padding="md">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Más detalles</h3>
            <div className="space-y-4">
              <CampoEditable label="Dirección" valor={cliente.empresaDireccion} onGuardar={(v) => actualizar("empresaDireccion", v)} placeholder="Calle, Ciudad, Estado" />
              <CampoEditable label="Tamaño empresa" valor={cliente.empresaTamano} onGuardar={(v) => actualizar("empresaTamano", v)} placeholder="Ej. 1-10, 50-200..." />
              <CampoEditable label="# de vendedores" valor={cliente.numVendedores?.toString()} tipo="number" onGuardar={(v) => actualizar("numVendedores", v ? Number(v) : null)} placeholder="0" />
              <CampoEditable label="Notas empresa" valor={cliente.empresaNotas} onGuardar={(v) => actualizar("empresaNotas", v)} placeholder="Información adicional..." />
            </div>
          </Card>
        </div>
      )}

      {/* Modal Perdido */}
      {modalPerdido && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setModalPerdido(false)} />
          <div className="relative bg-white dark:bg-[#1f1f1f] rounded-2xl p-6 w-full max-w-sm shadow-2xl border border-gray-100 dark:border-gray-800 space-y-4">
            <h3 className="font-semibold text-gray-900 dark:text-white">Marcar como perdido</h3>
            <Input
              label="Motivo de pérdida (opcional)"
              value={motivoPerdida}
              onChange={(e) => setMotivoPerdida(e.target.value)}
              placeholder="Ej. Precio, Competencia, No respondió..."
            />
            <div className="flex justify-end gap-3">
              <Button variante="fantasma" onClick={() => setModalPerdido(false)}>Cancelar</Button>
              <Button variante="peligro" onClick={handlePerdido}>Confirmar</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
