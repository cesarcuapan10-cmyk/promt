"use client"
import { useEffect, useMemo, useState, useTransition } from "react"
import {
  CalendarDays, ChevronLeft, ChevronRight, Plus, Settings2, Share2,
  Clock, User, Tag, Trash2, Check, X, Loader2, ExternalLink,
} from "lucide-react"
import { toast } from "sonner"
import { Card } from "@/app/components/ui/Card"
import { Modal, ConfirmModal } from "@/app/components/ui/Modal"
import {
  obtenerCitasRango, cambiarEstadoCita, listarServicios, guardarServicio,
  eliminarServicio, guardarConfigAgenda, type ConfigAgenda, type CitaCalendario,
} from "@/app/actions/agendar"
import { formatMoney } from "@/app/lib/utils"

const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"]
const DIAS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"]
const pad = (n: number) => String(n).padStart(2, "0")
const claveDia = (y: number, m: number, d: number) => `${y}-${pad(m + 1)}-${pad(d)}`

const ESTADOS: Record<string, { label: string; clase: string }> = {
  AGENDADA: { label: "Agendada", clase: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300" },
  CONFIRMADA: { label: "Confirmada", clase: "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300" },
  ATENDIDA: { label: "Atendida", clase: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300" },
  NO_ASISTIO: { label: "No asistió", clase: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300" },
  CANCELADA: { label: "Cancelada", clase: "bg-gray-100 text-gray-500 line-through dark:bg-gray-800" },
}

function horaLocal(iso: string): string {
  return new Date(iso).toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit", timeZone: "America/Mexico_City" })
}
function diaDe(iso: string): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Mexico_City" }).format(new Date(iso))
}

export function AgendaCliente({ config }: { config: ConfigAgenda }) {
  const marca = config.negocio.colorMarca || "#e8b763"
  const hoy = useMemo(() => new Date(), [])
  const [anio, setAnio] = useState(hoy.getFullYear())
  const [mes, setMes] = useState(hoy.getMonth())
  const [citas, setCitas] = useState<CitaCalendario[]>([])
  const [cargando, setCargando] = useState(true)
  const [diaSel, setDiaSel] = useState<string | null>(null)
  const [modalServicios, setModalServicios] = useState(false)
  const [modalConfig, setModalConfig] = useState(false)

  async function recargar() {
    setCargando(true)
    const desde = new Date(anio, mes, 1).toISOString()
    const hasta = new Date(anio, mes + 1, 1).toISOString()
    try {
      setCitas(await obtenerCitasRango(desde, hasta))
    } catch {
      toast.error("No se pudieron cargar las citas")
    } finally {
      setCargando(false)
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    recargar()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [anio, mes])

  const porDia = useMemo(() => {
    const map: Record<string, CitaCalendario[]> = {}
    for (const c of citas) {
      const k = diaDe(c.fechaInicio)
      ;(map[k] ||= []).push(c)
    }
    return map
  }, [citas])

  const primerDia = new Date(anio, mes, 1).getDay()
  const diasEnMes = new Date(anio, mes + 1, 0).getDate()
  const celdas: (number | null)[] = [...Array(primerDia).fill(null), ...Array.from({ length: diasEnMes }, (_, i) => i + 1)]
  const hoyClave = claveDia(hoy.getFullYear(), hoy.getMonth(), hoy.getDate())

  function cambiarMes(delta: number) {
    let nm = mes + delta, na = anio
    if (nm < 0) { nm = 11; na-- }
    if (nm > 11) { nm = 0; na++ }
    setMes(nm); setAnio(na); setDiaSel(null)
  }

  function copiarLiga() {
    const url = `${window.location.origin}/agendar`
    navigator.clipboard?.writeText(url).then(
      () => toast.success("Liga copiada: compártela por WhatsApp"),
      () => toast.error("No se pudo copiar"),
    )
  }

  const citasDelDia = diaSel ? (porDia[diaSel] ?? []).slice().sort((a, b) => a.fechaInicio.localeCompare(b.fechaInicio)) : []

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-5xl mx-auto">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${marca}20` }}>
            <CalendarDays className="w-5 h-5" style={{ color: marca }} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Agenda</h1>
            <p className="text-sm text-gray-500">Todas tus citas, en un solo lugar</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button onClick={copiarLiga} className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 px-3 py-2 text-sm font-medium hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-white/5">
            <Share2 className="h-4 w-4" /> Compartir liga
          </button>
          <a href="/agendar" target="_blank" className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 px-3 py-2 text-sm font-medium hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-white/5">
            <ExternalLink className="h-4 w-4" /> Ver página
          </a>
          <button onClick={() => setModalServicios(true)} className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 px-3 py-2 text-sm font-medium hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-white/5">
            <Tag className="h-4 w-4" /> Servicios
          </button>
          <button onClick={() => setModalConfig(true)} className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 px-3 py-2 text-sm font-medium hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-white/5">
            <Settings2 className="h-4 w-4" /> Horario
          </button>
        </div>
      </div>

      <Card padding="sm">
        <div className="mb-3 flex items-center justify-between">
          <span className="text-base font-semibold capitalize">{MESES[mes]} {anio}</span>
          <div className="flex items-center gap-1">
            <button onClick={() => cambiarMes(-1)} className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-white/10"><ChevronLeft className="h-5 w-5" /></button>
            <button onClick={() => { setAnio(hoy.getFullYear()); setMes(hoy.getMonth()); setDiaSel(null) }} className="rounded-lg px-3 py-1.5 text-xs font-medium text-gray-500 hover:bg-gray-100 dark:hover:bg-white/10">Hoy</button>
            <button onClick={() => cambiarMes(1)} className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-white/10"><ChevronRight className="h-5 w-5" /></button>
          </div>
        </div>

        <div className="mb-1 grid grid-cols-7 text-center text-[11px] font-medium text-gray-400">
          {DIAS.map((d) => <span key={d}>{d}</span>)}
        </div>

        {cargando ? (
          <div className="flex justify-center py-12 text-gray-300"><Loader2 className="h-7 w-7 animate-spin" /></div>
        ) : (
          <div className="grid grid-cols-7 gap-1">
            {celdas.map((d, i) => {
              if (d === null) return <span key={i} className="aspect-square" />
              const k = claveDia(anio, mes, d)
              const lista = porDia[k] ?? []
              const esHoy = k === hoyClave
              const activo = k === diaSel
              return (
                <button
                  key={i}
                  onClick={() => setDiaSel(k)}
                  className="relative flex aspect-square flex-col items-center justify-start rounded-lg p-1 text-sm transition-all hover:bg-gray-50 dark:hover:bg-white/5"
                  style={activo ? { backgroundColor: `${marca}18`, outline: `1.5px solid ${marca}` } : undefined}
                >
                  <span className={esHoy ? "flex h-6 w-6 items-center justify-center rounded-full font-bold text-white" : "font-medium"} style={esHoy ? { backgroundColor: marca } : undefined}>{d}</span>
                  {lista.length > 0 && (
                    <span className="mt-0.5 flex flex-wrap justify-center gap-0.5">
                      {lista.slice(0, 3).map((c) => (
                        <span key={c.id} className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: c.estado === "CANCELADA" ? "#cbd5e1" : c.color }} />
                      ))}
                      {lista.length > 3 && <span className="text-[9px] leading-none text-gray-400">+{lista.length - 3}</span>}
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        )}
      </Card>

      {/* Detalle del día */}
      {diaSel && (
        <Card padding="sm">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="font-semibold capitalize">
              {(() => { const [y, m, d] = diaSel.split("-").map(Number); return `${DIAS[new Date(y, m - 1, d).getDay()]} ${d} de ${MESES[m - 1]}` })()}
            </h3>
            <button onClick={() => setDiaSel(null)} className="text-gray-400 hover:text-gray-600"><X className="h-4 w-4" /></button>
          </div>
          {citasDelDia.length === 0 ? (
            <p className="py-6 text-center text-sm text-gray-400">Sin citas este día.</p>
          ) : (
            <ul className="space-y-2.5">
              {citasDelDia.map((c) => <FilaCita key={c.id} cita={c} onCambio={recargar} />)}
            </ul>
          )}
        </Card>
      )}

      {modalServicios && <ModalServicios marca={marca} moneda={config.negocio.moneda} onCerrar={() => setModalServicios(false)} />}
      {modalConfig && <ModalConfig negocio={config.negocio} onCerrar={() => setModalConfig(false)} />}
    </div>
  )
}

// ── Fila de cita con acciones ──
function FilaCita({ cita, onCambio }: { cita: CitaCalendario; onCambio: () => void }) {
  const [pend, start] = useTransition()
  const estado = ESTADOS[cita.estado] ?? ESTADOS.AGENDADA

  function set(estado: string) {
    start(async () => {
      const r = await cambiarEstadoCita(cita.id, estado)
      if (r.ok) { toast.success("Cita actualizada"); onCambio() }
      else toast.error(r.error || "Error")
    })
  }

  return (
    <li className="rounded-xl border border-gray-100 p-3 dark:border-gray-800">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 text-sm font-semibold"><Clock className="h-3.5 w-3.5" style={{ color: cita.color }} />{horaLocal(cita.fechaInicio)}</span>
            <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${estado.clase}`}>{estado.label}</span>
            {cita.origen === "PUBLICA" && <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] text-gray-500 dark:bg-gray-800">En línea</span>}
          </div>
          <p className="mt-1 truncate text-sm font-medium">{cita.clienteNombre}</p>
          <p className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-gray-500">
            {cita.servicioNombre && <span className="inline-flex items-center gap-1"><Tag className="h-3 w-3" />{cita.servicioNombre}</span>}
            <span className="inline-flex items-center gap-1"><User className="h-3 w-3" />{cita.personaNombre}</span>
          </p>
        </div>
        {cita.clienteWhatsapp && (
          <a href={`https://wa.me/${cita.clienteWhatsapp.startsWith("52") ? cita.clienteWhatsapp : "52" + cita.clienteWhatsapp}`} target="_blank" className="shrink-0 rounded-lg border border-gray-200 px-2.5 py-1 text-xs font-medium text-green-600 hover:bg-green-50 dark:border-gray-700">WhatsApp</a>
        )}
      </div>
      {cita.estado !== "CANCELADA" && cita.estado !== "ATENDIDA" && (
        <div className="mt-2.5 flex flex-wrap gap-1.5">
          {cita.estado === "AGENDADA" && <BtnMini onClick={() => set("CONFIRMADA")} disabled={pend}><Check className="h-3 w-3" /> Confirmar</BtnMini>}
          <BtnMini onClick={() => set("ATENDIDA")} disabled={pend}>Atendió</BtnMini>
          <BtnMini onClick={() => set("NO_ASISTIO")} disabled={pend}>No asistió</BtnMini>
          <BtnMini onClick={() => set("CANCELADA")} disabled={pend} peligro>Cancelar</BtnMini>
        </div>
      )}
    </li>
  )
}

function BtnMini({ children, onClick, disabled, peligro }: { children: React.ReactNode; onClick: () => void; disabled?: boolean; peligro?: boolean }) {
  return (
    <button onClick={onClick} disabled={disabled} className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1 text-xs font-medium transition-colors disabled:opacity-50 ${peligro ? "border-red-200 text-red-600 hover:bg-red-50 dark:border-red-900/50" : "border-gray-200 text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-white/5"}`}>
      {children}
    </button>
  )
}

// ── Modal: gestión de servicios ──
type Serv = Awaited<ReturnType<typeof listarServicios>>[number]

function ModalServicios({ marca, moneda, onCerrar }: { marca: string; moneda: string; onCerrar: () => void }) {
  const [lista, setLista] = useState<Serv[] | null>(null)
  const [editar, setEditar] = useState<Serv | null>(null)
  const [nuevo, setNuevo] = useState(false)
  const [aBorrar, setABorrar] = useState<Serv | null>(null)

  async function recargar() { setLista(await listarServicios()) }
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { recargar() }, [])

  return (
    <Modal abierto onCerrar={onCerrar} titulo="Servicios" tamaño="lg">
      <p className="-mt-2 mb-4 text-sm text-gray-500">Lo que el cliente puede elegir al agendar. Edita nombre, precio y duración.</p>
      {lista === null ? (
        <div className="flex justify-center py-8 text-gray-300"><Loader2 className="h-6 w-6 animate-spin" /></div>
      ) : (
        <div className="space-y-2">
          {lista.map((s) => (
            <div key={s.id} className="flex items-center justify-between gap-3 rounded-xl border border-gray-100 p-3 dark:border-gray-800">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full" style={{ backgroundColor: s.color }} />
                  <span className="truncate text-sm font-medium">{s.nombre}</span>
                  {!s.activo && <span className="rounded-full bg-gray-100 px-2 text-[11px] text-gray-500 dark:bg-gray-800">Oculto</span>}
                </div>
                <p className="text-xs text-gray-500">{s.precio > 0 ? formatMoney(s.precio, moneda) : "Gratis"} · {s.duracionMin} min</p>
              </div>
              <div className="flex shrink-0 gap-1.5">
                <button onClick={() => setEditar(s)} className="rounded-lg border border-gray-200 px-2.5 py-1 text-xs hover:bg-gray-50 dark:border-gray-700">Editar</button>
                <button onClick={() => setABorrar(s)} className="rounded-lg border border-red-200 p-1.5 text-red-500 hover:bg-red-50 dark:border-red-900/50"><Trash2 className="h-3.5 w-3.5" /></button>
              </div>
            </div>
          ))}
          {lista.length === 0 && <p className="py-6 text-center text-sm text-gray-400">Aún no hay servicios.</p>}
        </div>
      )}
      <button onClick={() => setNuevo(true)} className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold text-white" style={{ backgroundColor: marca }}>
        <Plus className="h-4 w-4" /> Agregar servicio
      </button>

      {(nuevo || editar) && (
        <FormServicio
          servicio={editar}
          onCerrar={() => { setNuevo(false); setEditar(null) }}
          onGuardado={() => { setNuevo(false); setEditar(null); recargar() }}
        />
      )}
      {aBorrar && (
        <ConfirmModal
          abierto onCerrar={() => setABorrar(null)}
          onConfirmar={async () => { const r = await eliminarServicio(aBorrar.id); if (r.ok) { toast.success("Servicio eliminado"); recargar() } }}
          titulo="Eliminar servicio" mensaje={`¿Eliminar "${aBorrar.nombre}"? Las citas existentes no se borran.`}
          textoConfirmar="Eliminar" peligroso
        />
      )}
    </Modal>
  )
}

function FormServicio({ servicio, onCerrar, onGuardado }: { servicio: Serv | null; onCerrar: () => void; onGuardado: () => void }) {
  const [nombre, setNombre] = useState(servicio?.nombre ?? "")
  const [descripcion, setDescripcion] = useState(servicio?.descripcion ?? "")
  const [precio, setPrecio] = useState(String(servicio?.precio ?? ""))
  const [duracionMin, setDuracionMin] = useState(String(servicio?.duracionMin ?? 45))
  const [activo, setActivo] = useState(servicio?.activo ?? true)
  const [guardando, start] = useTransition()

  function guardar() {
    start(async () => {
      const r = await guardarServicio({ nombre, descripcion, precio, duracionMin, activo }, servicio?.id)
      if (r.ok) { toast.success("Guardado"); onGuardado() }
      else toast.error(r.error || "Error")
    })
  }

  return (
    <Modal abierto onCerrar={onCerrar} titulo={servicio ? "Editar servicio" : "Nuevo servicio"} tamaño="md">
      <div className="space-y-3">
        <Campo label="Nombre"><input value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Ej. Corte de cabello" className={inputCls} /></Campo>
        <Campo label="Descripción (opcional)"><input value={descripcion} onChange={(e) => setDescripcion(e.target.value)} placeholder="Ej. Incluye lavado" className={inputCls} /></Campo>
        <div className="grid grid-cols-2 gap-3">
          <Campo label="Precio (MXN)"><input value={precio} onChange={(e) => setPrecio(e.target.value)} inputMode="numeric" placeholder="220" className={inputCls} /></Campo>
          <Campo label="Duración (min)"><input value={duracionMin} onChange={(e) => setDuracionMin(e.target.value)} inputMode="numeric" placeholder="45" className={inputCls} /></Campo>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={activo} onChange={(e) => setActivo(e.target.checked)} className="h-4 w-4 rounded" />
          Visible para el cliente
        </label>
      </div>
      <div className="mt-5 flex justify-end gap-3">
        <button onClick={onCerrar} className="rounded-xl border border-gray-200 px-4 py-2 text-sm dark:border-gray-700">Cancelar</button>
        <button onClick={guardar} disabled={guardando || nombre.trim().length < 2} className="inline-flex items-center gap-2 rounded-xl bg-brand px-4 py-2 text-sm font-medium text-white disabled:opacity-50">
          {guardando && <Loader2 className="h-4 w-4 animate-spin" />} Guardar
        </button>
      </div>
    </Modal>
  )
}

// ── Modal: configuración de horario ──
function ModalConfig({ negocio, onCerrar }: { negocio: ConfigAgenda["negocio"]; onCerrar: () => void }) {
  const [horarioInicio, setHI] = useState(negocio.horarioInicio)
  const [horarioFin, setHF] = useState(negocio.horarioFin)
  const [duracionCita, setDur] = useState(String(negocio.duracionCita))
  const [anticipacionMinDias, setAnt] = useState(String(negocio.anticipacionMinDias))
  const [dias, setDias] = useState<number[]>(negocio.diasAtencion)
  const [mensaje, setMensaje] = useState(negocio.mensajeConfirmacion)
  const [guardando, start] = useTransition()

  function toggleDia(d: number) {
    setDias((prev) => prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d].sort())
  }
  function guardar() {
    start(async () => {
      const r = await guardarConfigAgenda({ horarioInicio, horarioFin, duracionCita, anticipacionMinDias, diasAtencion: dias, mensajeConfirmacion: mensaje })
      if (r.ok) { toast.success("Horario actualizado"); onCerrar() }
      else toast.error(r.error || "Error")
    })
  }

  return (
    <Modal abierto onCerrar={onCerrar} titulo="Horario de atención" tamaño="md">
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Campo label="Abre"><input type="time" value={horarioInicio} onChange={(e) => setHI(e.target.value)} className={inputCls} /></Campo>
          <Campo label="Cierra"><input type="time" value={horarioFin} onChange={(e) => setHF(e.target.value)} className={inputCls} /></Campo>
        </div>
        <Campo label="Días de atención">
          <div className="flex flex-wrap gap-1.5">
            {DIAS.map((d, i) => (
              <button key={i} onClick={() => toggleDia(i)} className="h-9 w-11 rounded-lg border text-xs font-medium transition-colors" style={dias.includes(i) ? { backgroundColor: negocio.colorMarca, borderColor: "transparent", color: "#fff" } : { borderColor: "rgba(120,120,120,0.3)" }}>
                {d}
              </button>
            ))}
          </div>
        </Campo>
        <div className="grid grid-cols-2 gap-3">
          <Campo label="Duración por cita (min)"><input value={duracionCita} onChange={(e) => setDur(e.target.value)} inputMode="numeric" className={inputCls} /></Campo>
          <Campo label="Anticipación mínima (días)"><input value={anticipacionMinDias} onChange={(e) => setAnt(e.target.value)} inputMode="numeric" className={inputCls} /></Campo>
        </div>
        <p className="-mt-1 text-xs text-gray-400">Con 1 día o más, el cliente no puede agendar el mismo día.</p>
        <Campo label="Mensaje de confirmación"><input value={mensaje} onChange={(e) => setMensaje(e.target.value)} className={inputCls} /></Campo>
      </div>
      <div className="mt-5 flex justify-end gap-3">
        <button onClick={onCerrar} className="rounded-xl border border-gray-200 px-4 py-2 text-sm dark:border-gray-700">Cancelar</button>
        <button onClick={guardar} disabled={guardando} className="inline-flex items-center gap-2 rounded-xl bg-brand px-4 py-2 text-sm font-medium text-white disabled:opacity-50">
          {guardando && <Loader2 className="h-4 w-4 animate-spin" />} Guardar
        </button>
      </div>
    </Modal>
  )
}

const inputCls = "w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 dark:border-gray-700 dark:bg-[#161616]"

function Campo({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-gray-500">{label}</span>
      {children}
    </label>
  )
}
