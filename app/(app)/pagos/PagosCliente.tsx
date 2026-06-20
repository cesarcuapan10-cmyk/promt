"use client"

import { useState, useTransition } from "react"
import Link from "next/link"
import { toast } from "sonner"
import { Wallet, Plus, Printer, ChevronLeft, ChevronRight, AlertTriangle } from "lucide-react"
import { Badge } from "@/app/components/ui/Badge"
import { Button } from "@/app/components/ui/Button"
import { Modal } from "@/app/components/ui/Modal"
import { Input, Select } from "@/app/components/ui/Input"
import { Card } from "@/app/components/ui/Card"
import { formatMoney, formatFecha } from "@/app/lib/utils"
import {
  listarPagos,
  crearPago,
  actualizarEstatusPago,
  eliminarPago,
  actualizarPago,
  resumenPagos,
} from "@/app/actions/pagos"

type Pago = {
  id: string
  monto: number
  metodo: string
  estatus: string
  concepto: string | null
  notas: string | null
  folio: string | null
  fechaPago: Date | null
  fechaVencimiento: Date | null
  creadoEn: Date
  cliente: { id: string; nombre: string; empresaNombre?: string | null }
}

type Resumen = {
  cobradoMes: number
  pendiente: number
  vencido: number
  totalMes: number
}

type DatosIniciales = {
  pagos: Pago[]
  total: number
  paginas: number
  totalMonto: number
  resumenEstatus: { estatus: string; _sum: { monto: number | null }; _count: number }[]
}

interface Props {
  datosIniciales: DatosIniciales
  resumenInicial?: Resumen
  clientesDisponibles?: { id: string; nombre: string }[]
}

const METODOS = [
  { valor: "EFECTIVO", label: "Efectivo" },
  { valor: "TRANSFERENCIA", label: "Transferencia" },
  { valor: "TARJETA", label: "Tarjeta" },
  { valor: "CHEQUE", label: "Cheque" },
  { valor: "OTRO", label: "Otro" },
]

const ESTATUS_OPTS = [
  { valor: "", label: "Todos los estatus" },
  { valor: "PENDIENTE", label: "Pendiente" },
  { valor: "PAGADO", label: "Pagado" },
  { valor: "VENCIDO", label: "Vencido" },
  { valor: "CANCELADO", label: "Cancelado" },
]

function estatusBadge(estatus: string) {
  const mapa: Record<string, "pendiente" | "pagado" | "vencido" | "default"> = {
    PENDIENTE: "pendiente",
    PAGADO: "pagado",
    VENCIDO: "vencido",
    CANCELADO: "default",
  }
  return mapa[estatus] ?? "default"
}

export function PagosCliente({ datosIniciales, resumenInicial, clientesDisponibles = [] }: Props) {
  const [isPending, startTransition] = useTransition()
  const [pagos, setPagos] = useState<Pago[]>(datosIniciales.pagos)
  const [total, setTotal] = useState(datosIniciales.total)
  const [paginas, setPaginas] = useState(datosIniciales.paginas)
  const [resumen, setResumen] = useState<Resumen>(resumenInicial ?? { cobradoMes: 0, pendiente: 0, vencido: 0, totalMes: 0 })
  const [pagina, setPagina] = useState(1)
  const [filtroEstatus, setFiltroEstatus] = useState("")
  const [filtroMes, setFiltroMes] = useState("")
  const [modalCrear, setModalCrear] = useState(false)
  const [modalEditar, setModalEditar] = useState<Pago | null>(null)
  const [pagoRecibo, setPagoRecibo] = useState<Pago | null>(null)
  const [buscarCliente, setBuscarCliente] = useState("")

  const [form, setForm] = useState({
    clienteId: "",
    monto: "",
    metodo: "EFECTIVO",
    estatus: "PENDIENTE",
    fechaPago: "",
    fechaVencimiento: "",
    concepto: "",
  })

  const [formEditar, setFormEditar] = useState({
    estatus: "",
    fechaPago: "",
    monto: "",
    concepto: "",
    metodo: "",
    fechaVencimiento: "",
  })

  async function cargar(p: number, estatus: string, mes: string) {
    startTransition(async () => {
      const res = await listarPagos({ pagina: p, estatus: estatus || undefined, mes: mes || undefined })
      setPagos(res.pagos as unknown as Pago[])
      setTotal(res.total)
      setPaginas(res.paginas)
      try {
        const r = await resumenPagos()
        setResumen(r)
      } catch {}
    })
  }

  function handleFiltroEstatus(e: React.ChangeEvent<HTMLSelectElement>) {
    setFiltroEstatus(e.target.value)
    setPagina(1)
    cargar(1, e.target.value, filtroMes)
  }

  function handleFiltroMes(e: React.ChangeEvent<HTMLInputElement>) {
    setFiltroMes(e.target.value)
    setPagina(1)
    cargar(1, filtroEstatus, e.target.value)
  }

  async function handleCrear(e: React.FormEvent) {
    e.preventDefault()
    startTransition(async () => {
      const res = await crearPago({
        clienteId: form.clienteId,
        monto: Number(form.monto),
        metodo: form.metodo,
        estatus: form.estatus as "PENDIENTE" | "PAGADO" | "VENCIDO" | "CANCELADO",
        concepto: form.concepto || null,
        fechaPago: form.fechaPago || null,
        fechaVencimiento: form.fechaVencimiento || null,
      })
      if (!res.ok) { toast.error("Error al registrar pago"); return }
      toast.success("Pago registrado")
      setModalCrear(false)
      setForm({ clienteId: "", monto: "", metodo: "EFECTIVO", estatus: "PENDIENTE", fechaPago: "", fechaVencimiento: "", concepto: "" })
      cargar(pagina, filtroEstatus, filtroMes)
    })
  }

  async function handleMarcarPagado(id: string) {
    startTransition(async () => {
      const res = await actualizarEstatusPago(id, "PAGADO")
      if (!res.ok) { toast.error("Error"); return }
      toast.success("Marcado como pagado")
      cargar(pagina, filtroEstatus, filtroMes)
    })
  }

  async function handleEliminar(id: string) {
    if (!confirm("¿Eliminar este pago?")) return
    startTransition(async () => {
      const res = await eliminarPago(id)
      if (!res.ok) { toast.error("Error"); return }
      toast.success("Pago eliminado")
      cargar(pagina, filtroEstatus, filtroMes)
    })
  }

  function abrirEditar(p: Pago) {
    setFormEditar({
      estatus: p.estatus,
      fechaPago: p.fechaPago ? new Date(p.fechaPago).toISOString().slice(0, 10) : "",
      monto: String(p.monto),
      concepto: p.concepto ?? "",
      metodo: p.metodo,
      fechaVencimiento: p.fechaVencimiento ? new Date(p.fechaVencimiento).toISOString().slice(0, 10) : "",
    })
    setModalEditar(p)
  }

  async function handleEditar(e: React.FormEvent) {
    e.preventDefault()
    if (!modalEditar) return
    startTransition(async () => {
      const res = await actualizarPago(modalEditar.id, {
        estatus: formEditar.estatus as "PENDIENTE" | "PAGADO" | "VENCIDO" | "CANCELADO",
        monto: Number(formEditar.monto),
        metodo: formEditar.metodo,
        concepto: formEditar.concepto || null,
        fechaPago: formEditar.fechaPago || null,
        fechaVencimiento: formEditar.fechaVencimiento || null,
      })
      if (!res.ok) { toast.error("Error al actualizar"); return }
      toast.success("Pago actualizado")
      setModalEditar(null)
      cargar(pagina, filtroEstatus, filtroMes)
    })
  }

  function generarRecibo(p: Pago) {
    setPagoRecibo(p)
    setTimeout(() => window.print(), 300)
  }

  const vencidos = pagos.filter((p) => p.estatus === "VENCIDO")
  const resto = pagos.filter((p) => p.estatus !== "VENCIDO")
  const ordenados = [...vencidos, ...resto]

  const clientesFiltrados = clientesDisponibles.filter((c) =>
    c.nombre.toLowerCase().includes(buscarCliente.toLowerCase())
  )

  const clienteOpciones = [
    { valor: "", label: "Selecciona un cliente" },
    ...clientesFiltrados.map((c) => ({ valor: c.id, label: c.nombre })),
  ]

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto print:p-0">
      {/* Recibo para impresión */}
      {pagoRecibo && (
        <div className="hidden print:block p-8 space-y-4">
          <h1 className="text-2xl font-bold">Recibo de pago</h1>
          <p className="text-sm text-gray-500">PROMPT MAESTRO</p>
          <hr />
          <div className="space-y-2 text-sm">
            <p><strong>Folio:</strong> {pagoRecibo.folio ?? "—"}</p>
            <p><strong>Cliente:</strong> {pagoRecibo.cliente.nombre}</p>
            <p><strong>Concepto:</strong> {pagoRecibo.concepto ?? "—"}</p>
            <p><strong>Monto:</strong> {formatMoney(pagoRecibo.monto)}</p>
            <p><strong>Método:</strong> {pagoRecibo.metodo}</p>
            <p><strong>Fecha de pago:</strong> {pagoRecibo.fechaPago ? formatFecha(pagoRecibo.fechaPago) : "—"}</p>
            <p><strong>Estatus:</strong> {pagoRecibo.estatus}</p>
          </div>
        </div>
      )}

      {/* Contenido principal (oculto en impresión) */}
      <div className="print:hidden space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-emerald-500/10">
              <Wallet className="w-5 h-5 text-emerald-500" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Pagos</h1>
              <p className="text-sm text-gray-500">{total} registros</p>
            </div>
          </div>
          <Button onClick={() => setModalCrear(true)} className="min-h-[44px]">
            <Plus className="w-4 h-4 mr-1" /> Registrar pago
          </Button>
        </div>

        {/* Resumen */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="p-4">
            <p className="text-xs text-gray-500 mb-1">Cobrado este mes</p>
            <p className="text-xl font-bold text-green-600">{formatMoney(resumen.cobradoMes)}</p>
          </Card>
          <Card className="p-4">
            <p className="text-xs text-gray-500 mb-1">Pendiente</p>
            <p className="text-xl font-bold text-yellow-600">{formatMoney(resumen.pendiente)}</p>
          </Card>
          <Card className="p-4 border-red-200 dark:border-red-900">
            <p className="text-xs text-gray-500 mb-1">Vencido</p>
            <p className="text-xl font-bold text-red-600">{formatMoney(resumen.vencido)}</p>
          </Card>
          <Card className="p-4">
            <p className="text-xs text-gray-500 mb-1">Total registrado</p>
            <p className="text-xl font-bold text-gray-900 dark:text-white">{formatMoney(resumen.totalMes)}</p>
          </Card>
        </div>

        {/* Filtros */}
        <div className="flex flex-wrap gap-3">
          <Select
            opciones={ESTATUS_OPTS}
            value={filtroEstatus}
            onChange={handleFiltroEstatus}
            className="w-48"
          />
          <Input
            type="month"
            value={filtroMes}
            onChange={handleFiltroMes}
            className="w-48"
            placeholder="Mes"
          />
        </div>

        {/* Alerta vencidos */}
        {vencidos.length > 0 && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl px-4 py-3 flex items-center gap-3 text-red-700 dark:text-red-400">
            <AlertTriangle className="w-5 h-5 shrink-0" />
            <p className="text-sm font-medium">{vencidos.length} pago(s) vencido(s) — revísalos primero</p>
          </div>
        )}

        {/* Lista */}
        {ordenados.length === 0 ? (
          <div className="text-center py-16 text-gray-500">
            <Wallet className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="font-medium">Sin pagos registrados</p>
            <p className="text-sm mt-1">Registra el primer pago con el botón de arriba</p>
          </div>
        ) : (
          <div className="space-y-2">
            {ordenados.map((p) => (
              <div
                key={p.id}
                className={`bg-white dark:bg-gray-900 border rounded-xl p-4 flex flex-wrap items-center gap-4 ${
                  p.estatus === "VENCIDO"
                    ? "border-red-300 dark:border-red-800 bg-red-50 dark:bg-red-900/10"
                    : "border-gray-200 dark:border-gray-700"
                }`}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Link href={`/clientes/${p.cliente.id}`} className="font-medium text-gray-900 dark:text-white hover:text-brand truncate">
                      {p.cliente.nombre}
                    </Link>
                    <Badge variante={estatusBadge(p.estatus)}>{p.estatus}</Badge>
                  </div>
                  <div className="text-sm text-gray-500 mt-1 flex flex-wrap gap-3">
                    <span className="font-semibold text-gray-900 dark:text-white">{formatMoney(p.monto)}</span>
                    <span>{p.metodo}</span>
                    {p.concepto && <span>{p.concepto}</span>}
                    {p.fechaPago && <span>Pagado: {formatFecha(p.fechaPago)}</span>}
                    {p.fechaVencimiento && <span>Vence: {formatFecha(p.fechaVencimiento)}</span>}
                    {p.folio && <span className="text-xs text-gray-400">{p.folio}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  {p.estatus !== "PAGADO" && (
                    <Button
                      variante="exito"
                      tamaño="sm"
                      cargando={isPending}
                      onClick={() => handleMarcarPagado(p.id)}
                      className="min-h-[44px]"
                    >
                      Marcar pagado
                    </Button>
                  )}
                  <Button variante="secundario" tamaño="sm" onClick={() => abrirEditar(p)} className="min-h-[44px]">
                    Editar
                  </Button>
                  <Button
                    variante="fantasma"
                    tamaño="sm"
                    onClick={() => generarRecibo(p)}
                    className="min-h-[44px]"
                  >
                    <Printer className="w-4 h-4" />
                  </Button>
                  <Button
                    variante="peligro"
                    tamaño="sm"
                    cargando={isPending}
                    onClick={() => handleEliminar(p.id)}
                    className="min-h-[44px]"
                  >
                    Eliminar
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Paginación */}
        {paginas > 1 && (
          <div className="flex items-center justify-center gap-4">
            <Button
              variante="fantasma"
              tamaño="sm"
              disabled={pagina <= 1}
              onClick={() => { setPagina(p => p - 1); cargar(pagina - 1, filtroEstatus, filtroMes) }}
              className="min-h-[44px]"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="text-sm text-gray-500">Página {pagina} de {paginas}</span>
            <Button
              variante="fantasma"
              tamaño="sm"
              disabled={pagina >= paginas}
              onClick={() => { setPagina(p => p + 1); cargar(pagina + 1, filtroEstatus, filtroMes) }}
              className="min-h-[44px]"
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        )}
      </div>

      {/* Modal crear */}
      <Modal abierto={modalCrear} onCerrar={() => setModalCrear(false)} titulo="Registrar pago" tamaño="md">
        <form onSubmit={handleCrear} className="space-y-4">
          {clientesDisponibles.length > 0 && (
            <>
              <Input
                label="Buscar cliente"
                placeholder="Escribe el nombre..."
                value={buscarCliente}
                onChange={(e) => setBuscarCliente(e.target.value)}
              />
              <Select
                label="Cliente *"
                opciones={clienteOpciones}
                value={form.clienteId}
                onChange={(e) => setForm((f) => ({ ...f, clienteId: e.target.value }))}
                required
              />
            </>
          )}
          <Input
            label="Monto *"
            type="number"
            placeholder="0"
            value={form.monto}
            onChange={(e) => setForm((f) => ({ ...f, monto: e.target.value }))}
            required
          />
          <Select
            label="Método *"
            opciones={METODOS}
            value={form.metodo}
            onChange={(e) => setForm((f) => ({ ...f, metodo: e.target.value }))}
          />
          <Select
            label="Estatus"
            opciones={ESTATUS_OPTS.slice(1)}
            value={form.estatus}
            onChange={(e) => setForm((f) => ({ ...f, estatus: e.target.value }))}
          />
          <Input
            label="Concepto"
            placeholder="Ej: Mensualidad enero"
            value={form.concepto}
            onChange={(e) => setForm((f) => ({ ...f, concepto: e.target.value }))}
          />
          <Input
            label="Fecha de pago"
            type="date"
            value={form.fechaPago}
            onChange={(e) => setForm((f) => ({ ...f, fechaPago: e.target.value }))}
          />
          <Input
            label="Fecha de vencimiento"
            type="date"
            value={form.fechaVencimiento}
            onChange={(e) => setForm((f) => ({ ...f, fechaVencimiento: e.target.value }))}
          />
          <div className="flex gap-3 justify-end pt-2">
            <Button type="button" variante="fantasma" onClick={() => setModalCrear(false)}>Cancelar</Button>
            <Button type="submit" cargando={isPending} className="min-h-[44px]">Guardar</Button>
          </div>
        </form>
      </Modal>

      {/* Modal editar */}
      {modalEditar && (
        <Modal abierto={!!modalEditar} onCerrar={() => setModalEditar(null)} titulo="Editar pago" tamaño="md">
          <form onSubmit={handleEditar} className="space-y-4">
            <Input
              label="Monto"
              type="number"
              value={formEditar.monto}
              onChange={(e) => setFormEditar((f) => ({ ...f, monto: e.target.value }))}
            />
            <Select
              label="Estatus"
              opciones={ESTATUS_OPTS.slice(1)}
              value={formEditar.estatus}
              onChange={(e) => setFormEditar((f) => ({ ...f, estatus: e.target.value }))}
            />
            <Select
              label="Método"
              opciones={METODOS}
              value={formEditar.metodo}
              onChange={(e) => setFormEditar((f) => ({ ...f, metodo: e.target.value }))}
            />
            <Input
              label="Concepto"
              value={formEditar.concepto}
              onChange={(e) => setFormEditar((f) => ({ ...f, concepto: e.target.value }))}
            />
            <Input
              label="Fecha de pago"
              type="date"
              value={formEditar.fechaPago}
              onChange={(e) => setFormEditar((f) => ({ ...f, fechaPago: e.target.value }))}
            />
            <Input
              label="Fecha de vencimiento"
              type="date"
              value={formEditar.fechaVencimiento}
              onChange={(e) => setFormEditar((f) => ({ ...f, fechaVencimiento: e.target.value }))}
            />
            <div className="flex gap-3 justify-end pt-2">
              <Button type="button" variante="fantasma" onClick={() => setModalEditar(null)}>Cancelar</Button>
              <Button type="submit" cargando={isPending} className="min-h-[44px]">Actualizar</Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}
