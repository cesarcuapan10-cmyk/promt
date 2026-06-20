"use client"

import { useState, useTransition, useMemo } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { ChevronLeft, ChevronRight, Calendar, List, Plus, X, Check, Trash2, CalendarDays } from "lucide-react"
import { Modal } from "@/app/components/ui/Modal"
import { Button } from "@/app/components/ui/Button"
import { Input, Select } from "@/app/components/ui/Input"
import { listarCitas, crearCita, eliminarCita, confirmarCita } from "@/app/actions/agenda"

type Cita = {
  id: string
  titulo: string
  fechaInicio: Date
  fechaFin: Date
  notas: string | null
  confirmada: boolean
  googleMeetUrl: string | null
  cliente: { id: string; nombre: string }
  vendedor: { id: string; nombre: string }
}

type Cliente = {
  id: string
  nombre: string
}

interface Props {
  citasIniciales: Cita[]
  mesInicial: number
  añoInicial: number
  clientes: Cliente[]
  tieneGoogle?: boolean
}

const DIAS_SEMANA = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"]
const MESES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
]

export function AgendaCliente({ citasIniciales, mesInicial, añoInicial, clientes, tieneGoogle = false }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [citas, setCitas] = useState<Cita[]>(citasIniciales)
  const [mes, setMes] = useState(mesInicial)
  const [año, setAño] = useState(añoInicial)
  const [vista, setVista] = useState<"mes" | "lista">("mes")
  const [modalCrear, setModalCrear] = useState(false)
  const [modalDetalle, setModalDetalle] = useState<Cita | null>(null)
  const [diaSeleccionado, setDiaSeleccionado] = useState<number | null>(null)
  const [buscarCliente, setBuscarCliente] = useState("")
  const [form, setForm] = useState({
    clienteId: "",
    titulo: "",
    fechaInicio: "",
    notas: "",
  })

  const clientesFiltrados = clientes.filter((c) =>
    c.nombre.toLowerCase().includes(buscarCliente.toLowerCase())
  )

  // Construir grilla del mes
  const diasEnMes = new Date(año, mes, 0).getDate()
  const primerDia = new Date(año, mes - 1, 1).getDay()

  const celdasCalendario = useMemo(() => {
    const celdas: (number | null)[] = []
    for (let i = 0; i < primerDia; i++) celdas.push(null)
    for (let d = 1; d <= diasEnMes; d++) celdas.push(d)
    return celdas
  }, [mes, año, diasEnMes, primerDia])

  function citasDelDia(dia: number) {
    return citas.filter((c) => {
      const f = new Date(c.fechaInicio)
      return f.getDate() === dia && f.getMonth() + 1 === mes && f.getFullYear() === año
    })
  }

  function esHoy(dia: number) {
    const hoy = new Date()
    return hoy.getDate() === dia && hoy.getMonth() + 1 === mes && hoy.getFullYear() === año
  }

  async function cargarMes(nuevoMes: number, nuevoAño: number) {
    startTransition(async () => {
      const res = await listarCitas(nuevoMes, nuevoAño)
      setCitas(res.citas as unknown as Cita[])
      setMes(nuevoMes)
      setAño(nuevoAño)
    })
  }

  function prevMes() {
    const nm = mes === 1 ? 12 : mes - 1
    const na = mes === 1 ? año - 1 : año
    cargarMes(nm, na)
  }

  function nextMes() {
    const nm = mes === 12 ? 1 : mes + 1
    const na = mes === 12 ? año + 1 : año
    cargarMes(nm, na)
  }

  function abrirModalCrear(dia?: number) {
    if (dia) {
      const pad = (n: number) => String(n).padStart(2, "0")
      setForm((f) => ({
        ...f,
        fechaInicio: `${año}-${pad(mes)}-${pad(dia)}T09:00`,
      }))
      setDiaSeleccionado(dia)
    }
    setModalCrear(true)
  }

  async function handleCrear(e: React.FormEvent) {
    e.preventDefault()
    startTransition(async () => {
      const res = await crearCita({
        clienteId: form.clienteId,
        titulo: form.titulo,
        fechaInicio: form.fechaInicio,
        notas: form.notas || null,
      })
      if (!res.ok) {
        toast.error(res.error ?? "Error al crear la cita")
        return
      }
      toast.success("Cita creada correctamente")
      setModalCrear(false)
      setForm({ clienteId: "", titulo: "", fechaInicio: "", notas: "" })
      setBuscarCliente("")
      await cargarMes(mes, año)
    })
  }

  async function handleEliminar(id: string) {
    startTransition(async () => {
      const res = await eliminarCita(id)
      if (!res.ok) { toast.error(res.error ?? "Error"); return }
      toast.success("Cita eliminada")
      setModalDetalle(null)
      await cargarMes(mes, año)
    })
  }

  async function handleConfirmar(id: string) {
    startTransition(async () => {
      const res = await confirmarCita(id)
      if (!res.ok) { toast.error(res.error ?? "Error"); return }
      toast.success("Cita actualizada")
      setModalDetalle(null)
      await cargarMes(mes, año)
    })
  }

  // Citas agrupadas por día para vista lista
  const citasPorDia = useMemo(() => {
    const mapa: Record<number, Cita[]> = {}
    citas.forEach((c) => {
      const dia = new Date(c.fechaInicio).getDate()
      if (!mapa[dia]) mapa[dia] = []
      mapa[dia].push(c)
    })
    return mapa
  }, [citas])

  const clienteOpciones = [
    { valor: "", label: "Selecciona un cliente" },
    ...clientesFiltrados.map((c) => ({ valor: c.id, label: c.nombre })),
  ]

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-brand/10">
            <CalendarDays className="w-5 h-5 text-brand" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Agenda</h1>
            <p className="text-sm text-gray-500">{citas.length} citas en {MESES[mes - 1]} {año}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setVista("mes")}
            className={`min-h-[44px] px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors ${vista === "mes" ? "bg-brand text-white" : "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300"}`}
          >
            <Calendar className="w-4 h-4" /> Vista mes
          </button>
          <button
            onClick={() => setVista("lista")}
            className={`min-h-[44px] px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors ${vista === "lista" ? "bg-brand text-white" : "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300"}`}
          >
            <List className="w-4 h-4" /> Vista lista
          </button>
          <Button onClick={() => abrirModalCrear()} tamaño="md" className="min-h-[44px]">
            <Plus className="w-4 h-4 mr-1" /> Nueva cita
          </Button>
        </div>
      </div>

      {/* Banner Google Calendar */}
      {!tieneGoogle && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl px-4 py-3 text-sm text-blue-700 dark:text-blue-300">
          Conecta Google Calendar para crear eventos automáticos en tu calendario.
        </div>
      )}

      {/* Navegación */}
      <div className="flex items-center justify-between">
        <button onClick={prevMes} className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
          {MESES[mes - 1]} {año}
        </h2>
        <button onClick={nextMes} className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* Vista mes */}
      {vista === "mes" && (
        <div>
          {/* Encabezados días semana */}
          <div className="grid grid-cols-7 mb-2">
            {DIAS_SEMANA.map((d) => (
              <div key={d} className="text-center text-xs font-medium text-gray-500 py-2">{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {celdasCalendario.map((dia, idx) => {
              if (!dia) return <div key={`empty-${idx}`} className="min-h-[80px]" />
              const citasDia = citasDelDia(dia)
              const hoy = esHoy(dia)
              return (
                <div
                  key={dia}
                  onClick={() => abrirModalCrear(dia)}
                  className={`min-h-[80px] p-1 rounded-lg border cursor-pointer transition-colors hover:bg-gray-50 dark:hover:bg-gray-800 ${
                    hoy
                      ? "border-brand bg-brand/5"
                      : "border-gray-200 dark:border-gray-700"
                  }`}
                >
                  <span className={`text-xs font-medium ${hoy ? "text-brand" : "text-gray-700 dark:text-gray-300"}`}>
                    {dia}
                  </span>
                  <div className="mt-1 space-y-0.5">
                    {citasDia.slice(0, 3).map((c) => (
                      <button
                        key={c.id}
                        onClick={(e) => { e.stopPropagation(); setModalDetalle(c) }}
                        className="w-full text-left text-xs bg-brand/20 text-brand-700 dark:text-brand rounded px-1 py-0.5 truncate hover:bg-brand/30 transition-colors min-h-[22px]"
                      >
                        {new Date(c.fechaInicio).toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" })} {c.cliente.nombre}
                      </button>
                    ))}
                    {citasDia.length > 3 && (
                      <span className="text-xs text-gray-500">+{citasDia.length - 3} más</span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Vista lista */}
      {vista === "lista" && (
        <div className="space-y-4">
          {citas.length === 0 ? (
            <div className="text-center py-16 text-gray-500">
              <CalendarDays className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="font-medium">No hay citas en {MESES[mes - 1]}</p>
              <p className="text-sm mt-1">Haz clic en "Nueva cita" para agendar la primera</p>
            </div>
          ) : (
            Object.entries(citasPorDia)
              .sort(([a], [b]) => Number(a) - Number(b))
              .map(([dia, citasGrupo]) => (
                <div key={dia}>
                  <h3 className="text-sm font-semibold text-gray-500 mb-2">
                    {dia} de {MESES[mes - 1]}
                  </h3>
                  <div className="space-y-2">
                    {citasGrupo.map((c) => (
                      <div
                        key={c.id}
                        className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-4 flex items-center justify-between gap-4"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-gray-900 dark:text-white truncate">
                              {c.titulo}
                            </span>
                            {c.confirmada && (
                              <span className="inline-flex items-center gap-1 text-xs text-green-600 bg-green-50 px-1.5 py-0.5 rounded">
                                <Check className="w-3 h-3" /> Confirmada
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            <Link href={`/clientes/${c.cliente.id}`} className="hover:text-brand" onClick={(e) => e.stopPropagation()}>
                              {c.cliente.nombre}
                            </Link>
                            {" · "}
                            {new Date(c.fechaInicio).toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" })}
                            {" – "}
                            {new Date(c.fechaFin).toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" })}
                          </div>
                        </div>
                        <Button variante="fantasma" tamaño="sm" onClick={() => setModalDetalle(c)} className="min-h-[44px]">
                          Ver
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              ))
          )}
        </div>
      )}

      {/* Modal crear cita */}
      <Modal abierto={modalCrear} onCerrar={() => { setModalCrear(false); setBuscarCliente("") }} titulo="Nueva cita" tamaño="md">
        <form onSubmit={handleCrear} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Buscar cliente
            </label>
            <Input
              placeholder="Escribe el nombre..."
              value={buscarCliente}
              onChange={(e) => setBuscarCliente(e.target.value)}
            />
          </div>
          <Select
            label="Cliente *"
            opciones={clienteOpciones}
            value={form.clienteId}
            onChange={(e) => setForm((f) => ({ ...f, clienteId: e.target.value }))}
            required
          />
          <Input
            label="Título *"
            placeholder="Ej: Presentación de propuesta"
            value={form.titulo}
            onChange={(e) => setForm((f) => ({ ...f, titulo: e.target.value }))}
            required
          />
          <Input
            label="Fecha y hora *"
            type="datetime-local"
            value={form.fechaInicio}
            onChange={(e) => setForm((f) => ({ ...f, fechaInicio: e.target.value }))}
            required
          />
          <p className="text-xs text-gray-500">Horario permitido: 09:00 – 18:00. Duración: 45 min.</p>
          <Input
            label="Notas"
            placeholder="Opcional..."
            value={form.notas}
            onChange={(e) => setForm((f) => ({ ...f, notas: e.target.value }))}
          />
          <div className="flex gap-3 justify-end pt-2">
            <Button type="button" variante="fantasma" onClick={() => { setModalCrear(false); setBuscarCliente("") }}>
              Cancelar
            </Button>
            <Button type="submit" cargando={isPending} className="min-h-[44px]">
              Agendar cita
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal detalle cita */}
      {modalDetalle && (
        <Modal abierto={!!modalDetalle} onCerrar={() => setModalDetalle(null)} titulo={modalDetalle.titulo} tamaño="md">
          <div className="space-y-4">
            <div className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
              <p>
                <span className="font-medium">Cliente:</span>{" "}
                <Link href={`/clientes/${modalDetalle.cliente.id}`} className="text-brand hover:underline">
                  {modalDetalle.cliente.nombre}
                </Link>
              </p>
              <p>
                <span className="font-medium">Inicio:</span>{" "}
                {new Date(modalDetalle.fechaInicio).toLocaleString("es-MX", { dateStyle: "long", timeStyle: "short" })}
              </p>
              <p>
                <span className="font-medium">Fin:</span>{" "}
                {new Date(modalDetalle.fechaFin).toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" })}
              </p>
              {modalDetalle.notas && (
                <p><span className="font-medium">Notas:</span> {modalDetalle.notas}</p>
              )}
              <p>
                <span className="font-medium">Estado:</span>{" "}
                {modalDetalle.confirmada ? (
                  <span className="text-green-600 font-medium">Confirmada</span>
                ) : (
                  <span className="text-yellow-600">Sin confirmar</span>
                )}
              </p>
            </div>
            <div className="flex gap-2 pt-2">
              <Button
                variante={modalDetalle.confirmada ? "secundario" : "exito"}
                tamaño="sm"
                cargando={isPending}
                onClick={() => handleConfirmar(modalDetalle.id)}
                className="min-h-[44px]"
              >
                <Check className="w-4 h-4 mr-1" />
                {modalDetalle.confirmada ? "Desconfirmar" : "Confirmar"}
              </Button>
              <Button
                variante="peligro"
                tamaño="sm"
                cargando={isPending}
                onClick={() => handleEliminar(modalDetalle.id)}
                className="min-h-[44px]"
              >
                <Trash2 className="w-4 h-4 mr-1" /> Eliminar
              </Button>
              <Button variante="fantasma" tamaño="sm" onClick={() => setModalDetalle(null)} className="ml-auto min-h-[44px]">
                <X className="w-4 h-4 mr-1" /> Cerrar
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
