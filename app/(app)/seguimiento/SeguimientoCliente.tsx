"use client"

import { useState, useTransition } from "react"
import Link from "next/link"
import { toast } from "sonner"
import { Bell, AlertTriangle, Check, Trash2, Plus, MessageCircle, Phone } from "lucide-react"
import { Badge } from "@/app/components/ui/Badge"
import { Button } from "@/app/components/ui/Button"
import { Modal } from "@/app/components/ui/Modal"
import { Input } from "@/app/components/ui/Input"
import { Card } from "@/app/components/ui/Card"
import { encodeWhatsApp } from "@/app/lib/utils"
import { completarRecordatorio, eliminarRecordatorio } from "@/app/actions/seguimiento"
import { actualizarExpediente } from "@/app/actions/clientes"
import { ModalRecordatorio } from "./ModalRecordatorio"

type ClienteContactar = {
  id: string
  nombre: string
  telefono: string | null
  whatsapp: string | null
  temperatura: string | null
  proximaAccion: string | null
  fechaProximaAccion: Date | null
  ultimoContacto: Date | null
  etapa: string
}

type ClienteSinAccion = {
  id: string
  nombre: string
  telefono: string | null
  whatsapp: string | null
  temperatura: string | null
  etapa: string
  ultimoContacto: Date | null
}

type ClienteEstancado = {
  id: string
  nombre: string
  telefono: string | null
  temperatura: string | null
  etapa: string
  actualizadoEn: Date
  ultimoContacto: Date | null
}

type Recordatorio = {
  id: string
  titulo: string
  fecha: Date
  hora: string | null
  completado: boolean
  cliente: { id: string; nombre: string; telefono: string | null; whatsapp: string | null } | null
}

type DatosRecordatorios = {
  todos: Recordatorio[]
  vencidos: Recordatorio[]
  hoy: Recordatorio[]
  proximos: Recordatorio[]
}

interface Props {
  datosIniciales: DatosRecordatorios
  clientesContactar: ClienteContactar[]
  clientesSinAccion: ClienteSinAccion[]
  clientesEstancados: ClienteEstancado[]
  clientes: { id: string; nombre: string }[]
}

function temperaturaBadge(t: string | null): "caliente" | "tibio" | "frio" | "default" {
  if (t === "CALIENTE") return "caliente"
  if (t === "TIBIO") return "tibio"
  if (t === "FRIO") return "frio"
  return "default"
}

function temperaturaEmoji(t: string | null) {
  if (t === "CALIENTE") return "🔥"
  if (t === "TIBIO") return "🟡"
  return "🔵"
}

function diasSinActualizar(fecha: Date) {
  return Math.floor((Date.now() - new Date(fecha).getTime()) / 86400000)
}

export function SeguimientoCliente({
  datosIniciales,
  clientesContactar,
  clientesSinAccion,
  clientesEstancados,
  clientes,
}: Props) {
  const [isPending, startTransition] = useTransition()
  const [recordatorios, setRecordatorios] = useState<DatosRecordatorios>(datosIniciales)
  const [modalRecordatorio, setModalRecordatorio] = useState(false)
  const [modalContactar, setModalContactar] = useState<ClienteContactar | null>(null)
  const [modalAsignar, setModalAsignar] = useState<ClienteSinAccion | null>(null)
  const [formContactar, setFormContactar] = useState({ accion: "", fecha: "" })
  const [formAsignar, setFormAsignar] = useState({ accion: "", fecha: "" })

  const hoy = new Date()
  const fechaLarga = hoy.toLocaleDateString("es-MX", { weekday: "long", year: "numeric", month: "long", day: "numeric" })
  const ayer = new Date(hoy)
  ayer.setDate(ayer.getDate() - 1)

  const atrasados = clientesContactar.filter(
    (c) => c.fechaProximaAccion && new Date(c.fechaProximaAccion) < ayer
  )

  async function handleCompletar(id: string) {
    startTransition(async () => {
      const res = await completarRecordatorio(id)
      if (!res.ok) { toast.error("Error"); return }
      toast.success("Recordatorio actualizado")
      // refresh local state
      const update = (list: Recordatorio[]) =>
        list.map((r) => r.id === id ? { ...r, completado: !r.completado } : r)
      setRecordatorios((prev) => ({
        todos: update(prev.todos),
        vencidos: update(prev.vencidos),
        hoy: update(prev.hoy),
        proximos: update(prev.proximos),
      }))
    })
  }

  async function handleEliminarRec(id: string) {
    startTransition(async () => {
      const res = await eliminarRecordatorio(id)
      if (!res.ok) { toast.error("Error"); return }
      toast.success("Eliminado")
      const filter = (list: Recordatorio[]) => list.filter((r) => r.id !== id)
      setRecordatorios((prev) => ({
        todos: filter(prev.todos),
        vencidos: filter(prev.vencidos),
        hoy: filter(prev.hoy),
        proximos: filter(prev.proximos),
      }))
    })
  }

  async function handleMarcarContactado(e: React.FormEvent) {
    e.preventDefault()
    if (!modalContactar) return
    startTransition(async () => {
      const res = await actualizarExpediente(modalContactar.id, {
        ultimoContacto: new Date(),
        proximaAccion: formContactar.accion || undefined,
        fechaProximaAccion: formContactar.fecha ? new Date(formContactar.fecha) : undefined,
      })
      if (!res.ok) { toast.error("Error al actualizar"); return }
      toast.success(`${modalContactar.nombre} actualizado`)
      setModalContactar(null)
      setFormContactar({ accion: "", fecha: "" })
    })
  }

  async function handleAsignarAccion(e: React.FormEvent) {
    e.preventDefault()
    if (!modalAsignar) return
    startTransition(async () => {
      const res = await actualizarExpediente(modalAsignar.id, {
        proximaAccion: formAsignar.accion || undefined,
        fechaProximaAccion: formAsignar.fecha ? new Date(formAsignar.fecha) : undefined,
      })
      if (!res.ok) { toast.error("Error"); return }
      toast.success("Acción asignada")
      setModalAsignar(null)
      setFormAsignar({ accion: "", fecha: "" })
    })
  }

  const recHoyYVencidos = [...recordatorios.vencidos, ...recordatorios.hoy]

  return (
    <div className="p-4 md:p-6 space-y-8 max-w-7xl mx-auto">
      {/* Mi Día */}
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-brand/10">
            <Bell className="w-5 h-5 text-brand" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Mi Día</h1>
            <p className="text-sm text-gray-500 capitalize">{fechaLarga}</p>
          </div>
          <Button onClick={() => setModalRecordatorio(true)} variante="secundario" tamaño="sm" className="ml-auto min-h-[44px]">
            <Plus className="w-4 h-4 mr-1" /> Nuevo recordatorio
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Card className="p-4">
            <p className="text-3xl font-bold text-brand">{clientesContactar.length}</p>
            <p className="text-sm text-gray-500 mt-1">clientes que contactar hoy</p>
          </Card>
          {atrasados.length > 0 && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-red-600 shrink-0" />
              <div>
                <p className="text-sm font-medium text-red-700 dark:text-red-400">{atrasados.length} acción(es) vencida(s)</p>
                <p className="text-xs text-red-500">Revísalos cuanto antes</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Hoy te toca */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Hoy te toca</h2>
        {clientesContactar.length === 0 ? (
          <p className="text-sm text-gray-500">No hay clientes pendientes — ¡buen trabajo!</p>
        ) : (
          <div className="space-y-3">
            {clientesContactar.map((c) => {
              const atrasado = c.fechaProximaAccion && new Date(c.fechaProximaAccion) < ayer
              return (
                <div
                  key={c.id}
                  className={`bg-white dark:bg-gray-900 border rounded-xl p-4 flex flex-wrap items-center gap-4 ${atrasado ? "border-red-300 dark:border-red-800" : "border-gray-200 dark:border-gray-700"}`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-base">{temperaturaEmoji(c.temperatura)}</span>
                      <Link href={`/clientes/${c.id}`} className="font-medium text-gray-900 dark:text-white hover:text-brand">
                        {c.nombre}
                      </Link>
                      <Badge variante={temperaturaBadge(c.temperatura)}>{c.temperatura ?? "FRIO"}</Badge>
                      {atrasado && <Badge variante="vencido">Atrasado</Badge>}
                    </div>
                    {c.proximaAccion && (
                      <p className="text-sm text-gray-500 mt-1">{c.proximaAccion}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {(c.whatsapp || c.telefono) && (
                      <a
                        href={encodeWhatsApp(c.whatsapp ?? c.telefono ?? "", `Hola ${c.nombre}, te contacto para dar seguimiento.`)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg bg-green-50 text-green-600 hover:bg-green-100 transition-colors"
                        title="WhatsApp"
                      >
                        <MessageCircle className="w-5 h-5" />
                      </a>
                    )}
                    {c.telefono && (
                      <a href={`tel:${c.telefono}`} className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg bg-gray-50 text-gray-600 hover:bg-gray-100 transition-colors">
                        <Phone className="w-5 h-5" />
                      </a>
                    )}
                    <Button
                      variante="secundario"
                      tamaño="sm"
                      onClick={() => { setModalContactar(c); setFormContactar({ accion: "", fecha: "" }) }}
                      className="min-h-[44px]"
                    >
                      Marcar contactado
                    </Button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Sin seguimiento */}
      {clientesSinAccion.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Sin próxima acción</h2>
          <div className="space-y-2">
            {clientesSinAccion.map((c) => (
              <div key={c.id} className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-4 flex items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <span>{temperaturaEmoji(c.temperatura)}</span>
                  <Link href={`/clientes/${c.id}`} className="font-medium text-gray-900 dark:text-white hover:text-brand">
                    {c.nombre}
                  </Link>
                  <Badge variante={temperaturaBadge(c.temperatura)}>{c.temperatura ?? "FRIO"}</Badge>
                </div>
                <Button
                  variante="secundario"
                  tamaño="sm"
                  onClick={() => { setModalAsignar(c); setFormAsignar({ accion: "", fecha: "" }) }}
                  className="min-h-[44px]"
                >
                  Asignar acción
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Leads fríos por demora */}
      {clientesEstancados.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Leads fríos por demora</h2>
          <div className="space-y-2">
            {clientesEstancados.map((c) => (
              <div key={c.id} className="bg-yellow-50 dark:bg-yellow-900/10 border border-yellow-200 dark:border-yellow-800 rounded-xl p-4 flex items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm">⚠️</span>
                    <Link href={`/clientes/${c.id}`} className="font-medium text-gray-900 dark:text-white hover:text-brand">
                      {c.nombre}
                    </Link>
                    <Badge variante="default">Lead frío</Badge>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Sin actividad hace {diasSinActualizar(c.actualizadoEn)} días</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recordatorios */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Recordatorios</h2>
        {recHoyYVencidos.length === 0 ? (
          <p className="text-sm text-gray-500">No hay recordatorios para hoy</p>
        ) : (
          <div className="space-y-2">
            {recHoyYVencidos.map((r) => {
              const esVencido = recordatorios.vencidos.some((v) => v.id === r.id)
              return (
                <div
                  key={r.id}
                  className={`bg-white dark:bg-gray-900 border rounded-xl p-4 flex items-center gap-4 ${
                    esVencido ? "border-red-300 dark:border-red-800" : "border-gray-200 dark:border-gray-700"
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <p className={`font-medium ${r.completado ? "line-through text-gray-400" : "text-gray-900 dark:text-white"}`}>
                      {r.titulo}
                    </p>
                    <div className="text-xs text-gray-500 mt-1 flex gap-2">
                      {r.hora && <span>{r.hora}</span>}
                      {r.cliente && (
                        <Link href={`/clientes/${r.cliente.id}`} className="hover:text-brand">
                          {r.cliente.nombre}
                        </Link>
                      )}
                      {esVencido && <span className="text-red-500 font-medium">Vencido</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleCompletar(r.id)}
                      disabled={isPending}
                      className={`min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg transition-colors ${
                        r.completado ? "bg-green-100 text-green-600" : "bg-gray-100 text-gray-500 hover:bg-green-50 hover:text-green-600"
                      }`}
                    >
                      <Check className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleEliminarRec(r.id)}
                      disabled={isPending}
                      className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg bg-gray-100 text-gray-500 hover:bg-red-50 hover:text-red-600 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Modal marcar contactado */}
      {modalContactar && (
        <Modal abierto={!!modalContactar} onCerrar={() => setModalContactar(null)} titulo={`¿Qué sigue con ${modalContactar.nombre}?`} tamaño="sm">
          <form onSubmit={handleMarcarContactado} className="space-y-4">
            <Input
              label="Próxima acción"
              placeholder="Ej: Enviar propuesta formal"
              value={formContactar.accion}
              onChange={(e) => setFormContactar((f) => ({ ...f, accion: e.target.value }))}
            />
            <Input
              label="Fecha para esa acción"
              type="date"
              value={formContactar.fecha}
              onChange={(e) => setFormContactar((f) => ({ ...f, fecha: e.target.value }))}
            />
            <div className="flex gap-3 justify-end pt-2">
              <Button type="button" variante="fantasma" onClick={() => setModalContactar(null)}>Cancelar</Button>
              <Button type="submit" cargando={isPending} className="min-h-[44px]">Guardar</Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Modal asignar acción */}
      {modalAsignar && (
        <Modal abierto={!!modalAsignar} onCerrar={() => setModalAsignar(null)} titulo={`Asignar acción a ${modalAsignar.nombre}`} tamaño="sm">
          <form onSubmit={handleAsignarAccion} className="space-y-4">
            <Input
              label="Próxima acción *"
              placeholder="Ej: Llamar para hacer seguimiento"
              value={formAsignar.accion}
              onChange={(e) => setFormAsignar((f) => ({ ...f, accion: e.target.value }))}
              required
            />
            <Input
              label="Fecha *"
              type="date"
              value={formAsignar.fecha}
              onChange={(e) => setFormAsignar((f) => ({ ...f, fecha: e.target.value }))}
              required
            />
            <div className="flex gap-3 justify-end pt-2">
              <Button type="button" variante="fantasma" onClick={() => setModalAsignar(null)}>Cancelar</Button>
              <Button type="submit" cargando={isPending} className="min-h-[44px]">Asignar</Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Modal recordatorio */}
      <ModalRecordatorio
        abierto={modalRecordatorio}
        onCerrar={() => setModalRecordatorio(false)}
        clientes={clientes}
      />
    </div>
  )
}
