"use client"

import { useState, useTransition } from "react"
import Link from "next/link"
import {
  Bell,
  MessageCircle,
  Mail,
  AlertCircle,
  CheckCircle2,
  Clock,
  Flame,
  Plus,
  X,
} from "lucide-react"
import { Card } from "@/app/components/ui/Card"
import { Button } from "@/app/components/ui/Button"
import { Badge } from "@/app/components/ui/Badge"
import { Input, Textarea, Select } from "@/app/components/ui/Input"
import { Modal } from "@/app/components/ui/Modal"
import { agregarNota, actualizarCliente } from "@/app/actions/clientes"
import { completarRecordatorio, eliminarRecordatorio } from "@/app/actions/seguimiento"
import {
  formatFecha,
  formatMoney,
  getTemperaturaEmoji,
  getDiasDesde,
} from "@/app/lib/utils"

// ─── Types ────────────────────────────────────────────────────────────────

type ClienteSeguimiento = {
  id: string
  nombre: string
  telefono: string | null
  whatsapp: string | null
  correo: string | null
  temperatura: string
  etapa: string
  valorEstimado: number | null
  proximaAccion: string | null
  fechaProximaAccion: Date | null
  ultimoContacto: Date | null
  empresaNombre: string | null
  creadoEn?: Date
}

type Recordatorio = {
  id: string
  titulo: string
  fecha: Date
  hora: string | null
  completado: boolean
  cliente: { id: string; nombre: string } | null
}

type Props = {
  accionesHoy: ClienteSeguimiento[]
  accionesVencidas: ClienteSeguimiento[]
  leadsNuevosFrios: ClienteSeguimiento[]
  clientesEnRiesgo: number
  recordatoriosHoy: Recordatorio[]
}

// ─── Tarjeta de cliente en seguimiento ────────────────────────────────────

function TarjetaSeguimiento({
  cliente,
  vencida,
  esLeadFrio,
  onContactar,
}: {
  cliente: ClienteSeguimiento
  vencida?: boolean
  esLeadFrio?: boolean
  onContactar: (c: ClienteSeguimiento) => void
}) {
  const tel = cliente.whatsapp ?? cliente.telefono ?? ""
  const diasSin = getDiasDesde(cliente.ultimoContacto)

  return (
    <div className={`bg-white dark:bg-[#1f1f1f] rounded-2xl border p-4 space-y-3 ${vencida ? "border-red-200 dark:border-red-800" : "border-gray-100 dark:border-gray-800"}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <Link
              href={`/clientes/${cliente.id}`}
              className="font-semibold text-gray-900 dark:text-white hover:text-[#e8b763] transition"
            >
              {cliente.nombre}
            </Link>
            <span>{getTemperaturaEmoji(cliente.temperatura)}</span>
            {esLeadFrio && (
              <Badge variante="vencido">⚠️ Lead frío</Badge>
            )}
            {vencida && cliente.fechaProximaAccion && (
              <Badge variante="vencido">
                <AlertCircle size={10} /> Vencida {formatFecha(cliente.fechaProximaAccion)}
              </Badge>
            )}
          </div>
          {cliente.empresaNombre && (
            <p className="text-xs text-gray-400 mt-0.5">{cliente.empresaNombre}</p>
          )}
        </div>
        {cliente.valorEstimado && (
          <span className="text-sm font-bold text-gray-700 dark:text-gray-300 shrink-0">
            {formatMoney(cliente.valorEstimado)}
          </span>
        )}
      </div>

      {cliente.proximaAccion && (
        <div className={`text-xs px-2 py-1.5 rounded-lg ${vencida ? "bg-red-50 dark:bg-red-900/20 text-red-600" : "bg-gray-50 dark:bg-gray-800 text-gray-500"}`}>
          <Clock size={10} className="inline mr-1" />
          {cliente.proximaAccion}
        </div>
      )}

      <div className="flex items-center justify-between gap-2">
        <span className={`text-xs ${diasSin > 7 ? "text-red-500" : "text-gray-400"}`}>
          {diasSin < 999 ? `${diasSin}d sin contacto` : "Nunca contactado"}
        </span>
        <div className="flex gap-1.5">
          {tel && (
            <a
              href={`https://wa.me/${tel.replace(/\D/g, "").replace(/^(?!52)/, "52")}?text=${encodeURIComponent(`Hola ${cliente.nombre}`)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 rounded-xl bg-green-50 dark:bg-green-900/20 text-green-600 hover:bg-green-100 transition"
              title="WhatsApp"
            >
              <MessageCircle size={15} />
            </a>
          )}
          {cliente.correo && (
            <a
              href={`mailto:${cliente.correo}?subject=Seguimiento&body=Hola ${cliente.nombre},%0D%0A%0D%0A`}
              className="p-2 rounded-xl bg-blue-50 dark:bg-blue-900/20 text-blue-600 hover:bg-blue-100 transition"
              title="Email"
            >
              <Mail size={15} />
            </a>
          )}
          <Button
            tamaño="sm"
            variante="secundario"
            icono={<Plus size={14} />}
            onClick={() => onContactar(cliente)}
          >
            Registrar
          </Button>
        </div>
      </div>
    </div>
  )
}

// ─── Modal registrar contacto ──────────────────────────────────────────────

const TIPO_NOTA_OPCIONES = [
  { valor: "LLAMADA", label: "📞 Llamada" },
  { valor: "WHATSAPP", label: "💬 WhatsApp" },
  { valor: "CORREO", label: "📧 Correo" },
  { valor: "CITA", label: "📅 Cita" },
  { valor: "NOTA", label: "📝 Nota" },
]

const ETAPAS_OPCIONES = [
  { valor: "", label: "Sin cambio" },
  { valor: "NUEVO", label: "Nuevo" },
  { valor: "CONTACTADO", label: "Contactado" },
  { valor: "CITA_AGENDADA", label: "Cita agendada" },
  { valor: "PROPUESTA_ENVIADA", label: "Propuesta enviada" },
  { valor: "NEGOCIACION", label: "Negociación" },
]

function ModalRegistrarContacto({
  cliente,
  onCerrar,
  onGuardado,
}: {
  cliente: ClienteSeguimiento | null
  onCerrar: () => void
  onGuardado: () => void
}) {
  const [tipo, setTipo] = useState("LLAMADA")
  const [nota, setNota] = useState("")
  const [proximaAccion, setProximaAccion] = useState("")
  const [fechaProxima, setFechaProxima] = useState("")
  const [nuevaEtapa, setNuevaEtapa] = useState("")
  const [pending, start] = useTransition()

  if (!cliente) return null

  function handleGuardar() {
    if (!nota.trim()) return
    start(async () => {
      await agregarNota(cliente!.id, nota, tipo)
      if (proximaAccion || fechaProxima || nuevaEtapa) {
        await actualizarCliente(cliente!.id, {
          nombre: cliente!.nombre,
          ...(proximaAccion && { proximaAccion }),
          ...(fechaProxima && { fechaProximaAccion: fechaProxima }),
          ...(nuevaEtapa && { etapa: nuevaEtapa }),
        })
      }
      onGuardado()
      onCerrar()
    })
  }

  return (
    <Modal abierto={!!cliente} onCerrar={onCerrar} titulo={`Registrar contacto · ${cliente.nombre}`} tamaño="lg">
      <div className="space-y-4">
        {/* Tipo */}
        <div>
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Tipo de contacto</p>
          <div className="flex gap-2 flex-wrap">
            {TIPO_NOTA_OPCIONES.map((t) => (
              <button
                key={t.valor}
                onClick={() => setTipo(t.valor)}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium transition ${tipo === t.valor ? "bg-[#e8b763] text-white" : "bg-gray-100 dark:bg-gray-800 text-gray-600 hover:bg-gray-200 dark:hover:bg-gray-700"}`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Nota */}
        <Textarea
          label="Resumen del contacto *"
          value={nota}
          onChange={(e) => setNota(e.target.value)}
          placeholder="¿Qué se habló? ¿Qué acordaron?..."
          rows={3}
        />

        <div className="border-t border-gray-100 dark:border-gray-800 pt-4 space-y-3">
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Próximos pasos</p>
          <Input
            label="Próxima acción"
            value={proximaAccion}
            onChange={(e) => setProximaAccion(e.target.value)}
            placeholder="Ej. Enviar propuesta, Agendar llamada..."
          />
          <Input
            label="Fecha próxima acción"
            type="date"
            value={fechaProxima}
            onChange={(e) => setFechaProxima(e.target.value)}
          />
          <Select
            label="Cambiar etapa a"
            value={nuevaEtapa}
            onChange={(e) => setNuevaEtapa(e.target.value)}
            opciones={ETAPAS_OPCIONES}
          />
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <Button variante="fantasma" onClick={onCerrar}>Cancelar</Button>
          <Button cargando={pending} onClick={handleGuardar} disabled={!nota.trim()}>
            Registrar contacto
          </Button>
        </div>
      </div>
    </Modal>
  )
}

// ─── Componente principal ─────────────────────────────────────────────────

export function SeguimientoCliente({
  accionesHoy,
  accionesVencidas,
  leadsNuevosFrios,
  clientesEnRiesgo,
  recordatoriosHoy,
}: Props) {
  const [clienteContactar, setClienteContactar] = useState<ClienteSeguimiento | null>(null)
  const [recordatorios, setRecordatorios] = useState(recordatoriosHoy)
  const [, start] = useTransition()

  function handleCompletarRecordatorio(id: string) {
    start(async () => {
      await completarRecordatorio(id)
      setRecordatorios((prev) => prev.filter((r) => r.id !== id))
    })
  }

  function handleEliminarRecordatorio(id: string) {
    start(async () => {
      await eliminarRecordatorio(id)
      setRecordatorios((prev) => prev.filter((r) => r.id !== id))
    })
  }

  const totalHoy = accionesHoy.length + accionesVencidas.length + leadsNuevosFrios.length

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-orange-100 dark:bg-orange-900/30">
            <Flame className="w-5 h-5 text-orange-500" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Hoy te toca</h1>
            <p className="text-sm text-gray-500">
              {totalHoy > 0 ? `${totalHoy} clientes para contactar` : "¡Todo al día! 🎉"}
            </p>
          </div>
        </div>
        {clientesEnRiesgo > 0 && (
          <div className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-400 text-sm font-medium">
            <AlertCircle size={15} />
            {clientesEnRiesgo} clientes en riesgo de enfriarse
          </div>
        )}
      </div>

      {/* Acciones vencidas */}
      {accionesVencidas.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-3">
            <AlertCircle size={16} className="text-red-500" />
            <h2 className="font-semibold text-red-600 dark:text-red-400">
              Acciones vencidas ({accionesVencidas.length})
            </h2>
          </div>
          <div className="space-y-3">
            {accionesVencidas.map((c) => (
              <TarjetaSeguimiento
                key={c.id}
                cliente={c}
                vencida
                onContactar={setClienteContactar}
              />
            ))}
          </div>
        </section>
      )}

      {/* Acciones de hoy */}
      {accionesHoy.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-3">
            <Clock size={16} className="text-[#e8b763]" />
            <h2 className="font-semibold text-gray-800 dark:text-gray-200">
              Para hoy ({accionesHoy.length})
            </h2>
          </div>
          <div className="space-y-3">
            {accionesHoy.map((c) => (
              <TarjetaSeguimiento key={c.id} cliente={c} onContactar={setClienteContactar} />
            ))}
          </div>
        </section>
      )}

      {/* Leads nuevos fríos */}
      {leadsNuevosFrios.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-3">
            <AlertCircle size={16} className="text-orange-500" />
            <h2 className="font-semibold text-orange-600 dark:text-orange-400">
              Leads nuevos sin contactar ({leadsNuevosFrios.length})
            </h2>
          </div>
          <div className="space-y-3">
            {leadsNuevosFrios.map((c) => (
              <TarjetaSeguimiento
                key={c.id}
                cliente={c}
                esLeadFrio
                onContactar={setClienteContactar}
              />
            ))}
          </div>
        </section>
      )}

      {/* Recordatorios del día */}
      {recordatorios.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-3">
            <Bell size={16} className="text-purple-500" />
            <h2 className="font-semibold text-gray-800 dark:text-gray-200">
              Recordatorios de hoy ({recordatorios.length})
            </h2>
          </div>
          <Card padding="none">
            <div className="divide-y divide-gray-50 dark:divide-gray-800">
              {recordatorios.map((r) => (
                <div key={r.id} className="flex items-center gap-3 px-5 py-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{r.titulo}</p>
                    {r.cliente && (
                      <p className="text-xs text-gray-400">
                        <Link href={`/clientes/${r.cliente.id}`} className="hover:text-[#e8b763]">
                          {r.cliente.nombre}
                        </Link>
                      </p>
                    )}
                  </div>
                  {r.hora && <span className="text-xs text-gray-400 shrink-0">{r.hora}</span>}
                  <div className="flex gap-1 shrink-0">
                    <button
                      onClick={() => handleCompletarRecordatorio(r.id)}
                      className="p-1.5 rounded-lg text-green-500 hover:bg-green-50 dark:hover:bg-green-900/20 transition"
                      title="Marcar como hecho"
                    >
                      <CheckCircle2 size={16} />
                    </button>
                    <button
                      onClick={() => handleEliminarRecordatorio(r.id)}
                      className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-white/10 transition"
                      title="Eliminar"
                    >
                      <X size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </section>
      )}

      {/* Estado vacío total */}
      {totalHoy === 0 && recordatorios.length === 0 && (
        <Card className="text-center py-16">
          <div className="text-5xl mb-4">🎉</div>
          <p className="text-xl font-semibold text-gray-700 dark:text-gray-300 mb-2">
            ¡Todo al día!
          </p>
          <p className="text-gray-400 mb-4">
            No tienes pendientes por hoy. ¡Buen trabajo!
          </p>
          <Link href="/clientes">
            <Button variante="secundario">Ver todos los clientes</Button>
          </Link>
        </Card>
      )}

      {/* Modal registrar contacto */}
      <ModalRegistrarContacto
        cliente={clienteContactar}
        onCerrar={() => setClienteContactar(null)}
        onGuardado={() => {
          // La página se recargará con los nuevos datos en la próxima visita
          setClienteContactar(null)
        }}
      />
    </div>
  )
}
