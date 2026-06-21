"use client"

import { useState, useTransition } from "react"
import { CalendarDays, Plus, ChevronLeft, ChevronRight, Clock, User, Info } from "lucide-react"
import { Card } from "@/app/components/ui/Card"
import { Button } from "@/app/components/ui/Button"
import { Modal } from "@/app/components/ui/Modal"
import { listarCitas, crearCita, eliminarCita } from "@/app/actions/citas"
import { toast } from "sonner"
import Link from "next/link"

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Cita = any

const DIAS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"]
const MESES = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"]

function getDiasEnMes(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate()
}

function getPrimerDia(year: number, month: number) {
  return new Date(year, month, 1).getDay()
}

interface AgendaClienteProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  citasIniciales: any[]
  userId: string
}

export function AgendaCliente({ citasIniciales, userId }: AgendaClienteProps) {
  const ahora = new Date()
  const [año, setAño] = useState(ahora.getFullYear())
  const [mes, setMes] = useState(ahora.getMonth())
  const [diaSeleccionado, setDiaSeleccionado] = useState<number | null>(ahora.getDate())
  const [citas, setCitas] = useState<Cita[]>(citasIniciales)
  const [modalAbierto, setModalAbierto] = useState(false)
  const [citaSeleccionada, setCitaSeleccionada] = useState<Cita | null>(null)
  const [, startTransition] = useTransition()

  const [form, setForm] = useState({
    clienteId: "",
    titulo: "",
    fechaInicio: "",
    fechaFin: "",
    notas: "",
  })
  const [guardando, setGuardando] = useState(false)

  function recargar(a = año, m = mes) {
    const mesStr = `${a}-${String(m + 1).padStart(2, "0")}`
    startTransition(async () => {
      const r = await listarCitas({ mes: mesStr })
      setCitas(r)
    })
  }

  function navMes(dir: -1 | 1) {
    let nm = mes + dir
    let na = año
    if (nm < 0) { nm = 11; na-- }
    if (nm > 11) { nm = 0; na++ }
    setMes(nm)
    setAño(na)
    setDiaSeleccionado(null)
    recargar(na, nm)
  }

  function citasDelDia(dia: number) {
    return citas.filter((c) => {
      const d = new Date(c.fechaInicio)
      return d.getFullYear() === año && d.getMonth() === mes && d.getDate() === dia
    })
  }

  function abrirModalDia(dia: number) {
    const fechaBase = new Date(año, mes, dia, 9, 0, 0)
    const fechaFin = new Date(año, mes, dia, 9, 45, 0)
    setForm({
      clienteId: "",
      titulo: "",
      fechaInicio: fechaBase.toISOString().slice(0, 16),
      fechaFin: fechaFin.toISOString().slice(0, 16),
      notas: "",
    })
    setModalAbierto(true)
  }

  async function handleGuardar(e: React.FormEvent) {
    e.preventDefault()
    if (!form.clienteId) return toast.error("Ingresa el ID del cliente")
    setGuardando(true)
    try {
      const r = await crearCita(form)
      if (r.ok) {
        toast.success("Cita agendada")
        setModalAbierto(false)
        recargar()
      } else {
        toast.error("Error al agendar")
      }
    } finally {
      setGuardando(false)
    }
  }

  async function handleEliminar(id: string) {
    if (!confirm("¿Eliminar esta cita?")) return
    const r = await eliminarCita(id)
    if (r.ok) { toast.success("Cita eliminada"); recargar() }
    else toast.error(r.error)
  }

  const totalDias = getDiasEnMes(año, mes)
  const primerDia = getPrimerDia(año, mes)
  const hoy = new Date()
  const citasDia = diaSeleccionado !== null ? citasDelDia(diaSeleccionado) : []

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-green-50">
            <CalendarDays className="w-5 h-5 text-green-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Agenda</h1>
            <p className="text-sm text-gray-500">Tus citas, organizadas</p>
          </div>
        </div>
        <Button icono={<Plus className="w-4 h-4" />} onClick={() => {
          abrirModalDia(diaSeleccionado ?? hoy.getDate())
        }}>
          Nueva cita
        </Button>
      </div>

      {/* Banner Google Calendar */}
      <div className="flex items-center gap-3 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-xl text-sm text-blue-700 dark:text-blue-300">
        <Info className="w-4 h-4 flex-shrink-0" />
        <span>Conecta Google Calendar para crear reuniones de Meet automáticamente.</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendario */}
        <div className="lg:col-span-2">
          <Card>
            {/* Navegación mes */}
            <div className="flex items-center justify-between mb-4">
              <button onClick={() => navMes(-1)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <h2 className="font-semibold text-gray-900 dark:text-white">
                {MESES[mes]} {año}
              </h2>
              <button onClick={() => navMes(1)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Días de la semana */}
            <div className="grid grid-cols-7 mb-2">
              {DIAS.map((d) => (
                <div key={d} className="text-center text-xs font-medium text-gray-400 py-1">{d}</div>
              ))}
            </div>

            {/* Días */}
            <div className="grid grid-cols-7 gap-1">
              {Array.from({ length: primerDia }).map((_, i) => (
                <div key={`empty-${i}`} />
              ))}
              {Array.from({ length: totalDias }).map((_, i) => {
                const dia = i + 1
                const esHoy = hoy.getFullYear() === año && hoy.getMonth() === mes && hoy.getDate() === dia
                const esSeleccionado = diaSeleccionado === dia
                const citasDiaCount = citasDelDia(dia).length

                return (
                  <button
                    key={dia}
                    onClick={() => setDiaSeleccionado(dia)}
                    className={`relative aspect-square flex flex-col items-center justify-center rounded-xl text-sm transition-all ${
                      esSeleccionado
                        ? "bg-brand text-white font-semibold"
                        : esHoy
                        ? "bg-brand/10 text-brand-700 font-semibold border border-brand/30"
                        : "hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300"
                    }`}
                  >
                    {dia}
                    {citasDiaCount > 0 && (
                      <span className={`absolute bottom-1 w-1.5 h-1.5 rounded-full ${esSeleccionado ? "bg-white" : "bg-brand"}`} />
                    )}
                  </button>
                )
              })}
            </div>
          </Card>
        </div>

        {/* Panel del día */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-gray-900 dark:text-white">
              {diaSeleccionado
                ? `${diaSeleccionado} de ${MESES[mes]}`
                : "Selecciona un día"}
            </h3>
            {diaSeleccionado && (
              <Button tamaño="sm" variante="secundario" icono={<Plus className="w-3 h-3" />} onClick={() => abrirModalDia(diaSeleccionado)}>
                Agendar
              </Button>
            )}
          </div>

          {diaSeleccionado && citasDia.length === 0 && (
            <Card className="text-center py-8">
              <CalendarDays className="w-10 h-10 mx-auto mb-2 opacity-20" />
              <p className="text-sm text-gray-400">Sin citas este día</p>
              <button
                onClick={() => abrirModalDia(diaSeleccionado)}
                className="mt-2 text-sm text-brand hover:underline"
              >
                + Agendar cita
              </button>
            </Card>
          )}

          {citasDia.map((cita: Cita) => (
            <Card key={cita.id} className="p-4 hover:shadow-sm transition-shadow">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 dark:text-white text-sm truncate">{cita.titulo}</p>
                  <div className="flex items-center gap-1 mt-1 text-xs text-gray-500">
                    <Clock className="w-3 h-3" />
                    <span>
                      {new Date(cita.fechaInicio).toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" })} —{" "}
                      {new Date(cita.fechaFin).toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                  {cita.cliente && (
                    <Link href={`/clientes/${cita.cliente.id}`} className="flex items-center gap-1 mt-1 text-xs text-brand hover:underline">
                      <User className="w-3 h-3" />
                      {cita.cliente.nombre}
                    </Link>
                  )}
                  {cita.notas && (
                    <p className="mt-1 text-xs text-gray-400 line-clamp-2">{cita.notas}</p>
                  )}
                </div>
                <button
                  onClick={() => handleEliminar(cita.id)}
                  className="text-gray-300 hover:text-red-400 text-xs transition-colors flex-shrink-0"
                >
                  ✕
                </button>
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* Modal nueva cita */}
      <Modal abierto={modalAbierto} onCerrar={() => setModalAbierto(false)} titulo="Nueva cita" tamaño="md">
        <form onSubmit={handleGuardar} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              ID del cliente <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              placeholder="ID del cliente"
              value={form.clienteId}
              onChange={(e) => setForm({ ...form, clienteId: e.target.value })}
              className="w-full border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-sm bg-white dark:bg-gray-800"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Título <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              placeholder="Diagnóstico inicial, Seguimiento, etc."
              value={form.titulo}
              onChange={(e) => setForm({ ...form, titulo: e.target.value })}
              className="w-full border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-sm bg-white dark:bg-gray-800"
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Inicio</label>
              <input
                type="datetime-local"
                value={form.fechaInicio}
                onChange={(e) => setForm({ ...form, fechaInicio: e.target.value })}
                className="w-full border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-sm bg-white dark:bg-gray-800"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Fin</label>
              <input
                type="datetime-local"
                value={form.fechaFin}
                onChange={(e) => setForm({ ...form, fechaFin: e.target.value })}
                className="w-full border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-sm bg-white dark:bg-gray-800"
                required
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Notas</label>
            <textarea
              rows={2}
              placeholder="Temas a tratar, contexto, etc."
              value={form.notas}
              onChange={(e) => setForm({ ...form, notas: e.target.value })}
              className="w-full border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-sm bg-white dark:bg-gray-800 resize-none"
            />
          </div>
          <div className="flex gap-3 pt-2">
            <Button variante="secundario" type="button" className="flex-1" onClick={() => setModalAbierto(false)}>
              Cancelar
            </Button>
            <Button type="submit" className="flex-1" cargando={guardando}>
              Agendar cita
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
