"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Wallet, Plus, Printer, Trash2, CheckCircle, Clock, AlertCircle, ChevronLeft, ChevronRight } from "lucide-react"
import { Card } from "@/app/components/ui/Card"
import { Button } from "@/app/components/ui/Button"
import { Badge } from "@/app/components/ui/Badge"
import { Modal } from "@/app/components/ui/Modal"
import { formatMoney, formatFechaCorta } from "@/app/lib/utils"
import { registrarPago, eliminarPago, listarPagos } from "@/app/actions/pagos"
import { toast } from "sonner"
import Link from "next/link"

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Pago = any
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Datos = any

const METODOS = ["Transferencia", "Tarjeta", "Liga de pago", "Efectivo", "Cheque"]
const ESTATUS_OPTS = ["", "PENDIENTE", "PAGADO", "VENCIDO", "CANCELADO"]

function estatusBadge(estatus: string) {
  if (estatus === "PAGADO") return <Badge variante="pagado">Pagado</Badge>
  if (estatus === "VENCIDO") return <Badge variante="vencido">Vencido</Badge>
  if (estatus === "CANCELADO") return <Badge variante="perdido">Cancelado</Badge>
  return <Badge variante="pendiente">Pendiente</Badge>
}

function diasVencido(fechaVencimiento: string | null): number | null {
  if (!fechaVencimiento) return null
  const diff = Math.floor((Date.now() - new Date(fechaVencimiento).getTime()) / 86400000)
  return diff > 0 ? diff : null
}

function ReciboHTML(pago: Pago) {
  return `
<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8">
<title>Recibo #${pago.folio ?? pago.id.slice(0, 8)}</title>
<style>
  body{font-family:system-ui,sans-serif;max-width:600px;margin:40px auto;padding:20px;color:#1a1a1a}
  .header{text-align:center;border-bottom:2px solid #e8b763;padding-bottom:20px;margin-bottom:20px}
  .logo{font-size:24px;font-weight:bold;color:#e8b763}
  .folio{font-size:14px;color:#666}
  .monto{font-size:48px;font-weight:bold;color:#e8b763;text-align:center;margin:20px 0}
  table{width:100%;border-collapse:collapse}
  td{padding:8px 4px;border-bottom:1px solid #eee}
  td:first-child{color:#666;width:140px}
  .footer{text-align:center;margin-top:30px;font-size:12px;color:#999}
  @media print{body{margin:0}}
</style></head><body>
<div class="header">
  <div class="logo">PROMPT MAESTRO</div>
  <div class="folio">Recibo #${pago.folio ?? pago.id.slice(0, 8).toUpperCase()}</div>
</div>
<div class="monto">${formatMoney(pago.monto)}</div>
<table>
  <tr><td>Cliente</td><td><strong>${pago.cliente?.nombre ?? "—"}</strong></td></tr>
  <tr><td>Concepto</td><td>${pago.concepto ?? "Servicio de consultoría"}</td></tr>
  <tr><td>Método</td><td>${pago.metodo}</td></tr>
  <tr><td>Estatus</td><td>${pago.estatus}</td></tr>
  <tr><td>Fecha de pago</td><td>${pago.fechaPago ? formatFechaCorta(pago.fechaPago) : "—"}</td></tr>
  <tr><td>Fecha de emisión</td><td>${formatFechaCorta(pago.creadoEn)}</td></tr>
</table>
<div class="footer">Gracias por tu confianza · cesar cuapan · Consultoría y Coaching</div>
</body></html>`
}

export function PagosCliente({ datosIniciales }: { datosIniciales: Datos }) {
  const router = useRouter()
  const [datos, setDatos] = useState<Datos>(datosIniciales)
  const [modalAbierto, setModalAbierto] = useState(false)
  const [filtroEstatus, setFiltroEstatus] = useState("")
  const [filtroMetodo, setFiltroMetodo] = useState("")
  const [pagina, setPagina] = useState(1)
  const [, startTransition] = useTransition()

  const [form, setForm] = useState({
    clienteId: "",
    monto: "",
    metodo: "Transferencia",
    estatus: "PENDIENTE",
    concepto: "",
    fechaVencimiento: "",
    fechaPago: "",
  })
  const [clienteBusqueda, setClienteBusqueda] = useState("")
  const [guardando, setGuardando] = useState(false)

  function recargar(p = pagina, estatus = filtroEstatus, metodo = filtroMetodo) {
    startTransition(async () => {
      const r = await listarPagos({ pagina: p, estatus: estatus || undefined, metodo: metodo || undefined })
      setDatos(r)
    })
  }

  async function handleGuardar(e: React.FormEvent) {
    e.preventDefault()
    if (!form.clienteId) return toast.error("Selecciona un cliente")
    setGuardando(true)
    try {
      const r = await registrarPago({
        clienteId: form.clienteId,
        monto: Number(form.monto),
        metodo: form.metodo,
        estatus: form.estatus as "PENDIENTE" | "PAGADO" | "VENCIDO" | "CANCELADO",
        concepto: form.concepto || undefined,
        fechaVencimiento: form.fechaVencimiento || undefined,
        fechaPago: form.fechaPago || undefined,
      })
      if (r.ok) {
        toast.success("Pago registrado")
        setModalAbierto(false)
        setForm({ clienteId: "", monto: "", metodo: "Transferencia", estatus: "PENDIENTE", concepto: "", fechaVencimiento: "", fechaPago: "" })
        recargar()
      }
    } finally {
      setGuardando(false)
    }
  }

  async function handleEliminar(id: string) {
    if (!confirm("¿Eliminar este pago?")) return
    const r = await eliminarPago(id)
    if (r.ok) { toast.success("Pago eliminado"); recargar() }
    else toast.error(r.error)
  }

  function imprimirRecibo(pago: Pago) {
    const w = window.open("", "_blank")
    if (!w) return
    w.document.write(ReciboHTML(pago))
    w.document.close()
    w.print()
  }

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-emerald-50">
            <Wallet className="w-5 h-5 text-emerald-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Pagos</h1>
            <p className="text-sm text-gray-500">Lo que cobraste y lo que falta</p>
          </div>
        </div>
        <Button icono={<Plus className="w-4 h-4" />} onClick={() => setModalAbierto(true)}>
          Registrar pago
        </Button>
      </div>

      {/* Resumen */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-1">
            <CheckCircle className="w-4 h-4 text-emerald-500" />
            <span className="text-sm text-gray-500">Cobrado este mes</span>
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{formatMoney(datos.cobradoMes ?? 0)}</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-1">
            <Clock className="w-4 h-4 text-yellow-500" />
            <span className="text-sm text-gray-500">Pendientes</span>
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{formatMoney(datos.pendientesTotal ?? 0)}</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-1">
            <AlertCircle className="w-4 h-4 text-red-500" />
            <span className="text-sm text-gray-500">Vencidos ({datos.vencidosCount ?? 0})</span>
          </div>
          <p className="text-2xl font-bold text-red-600">{formatMoney(datos.vencidosTotal ?? 0)}</p>
        </Card>
      </div>

      {/* Filtros */}
      <Card className="p-4 flex flex-wrap gap-3">
        <select
          value={filtroEstatus}
          onChange={(e) => { setFiltroEstatus(e.target.value); setPagina(1); recargar(1, e.target.value, filtroMetodo) }}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-800 dark:border-gray-700"
        >
          <option value="">Todos los estatus</option>
          {["PENDIENTE", "PAGADO", "VENCIDO", "CANCELADO"].map((s) => (
            <option key={s} value={s}>{s.charAt(0) + s.slice(1).toLowerCase()}</option>
          ))}
        </select>
        <select
          value={filtroMetodo}
          onChange={(e) => { setFiltroMetodo(e.target.value); setPagina(1); recargar(1, filtroEstatus, e.target.value) }}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-800 dark:border-gray-700"
        >
          <option value="">Todos los métodos</option>
          {METODOS.map((m) => <option key={m} value={m}>{m}</option>)}
        </select>
      </Card>

      {/* Lista */}
      {datos.pagos?.length === 0 ? (
        <Card className="text-center py-16">
          <Wallet className="w-16 h-16 mx-auto mb-4 opacity-20" />
          <p className="text-lg font-medium text-gray-500 mb-2">Sin pagos registrados</p>
          <p className="text-sm text-gray-400">Los pagos aparecerán aquí cuando los registres.</p>
        </Card>
      ) : (
        <Card padding="none" className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-800/50 border-b border-gray-100 dark:border-gray-800">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-400">Folio</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-400">Cliente</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-400">Concepto</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600 dark:text-gray-400">Monto</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-400">Método</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-400">Estatus</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-400">Fecha</th>
                  <th className="text-right px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {datos.pagos.map((pago: Pago) => {
                  const venc = diasVencido(pago.fechaVencimiento)
                  return (
                    <tr key={pago.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors">
                      <td className="px-4 py-3 text-gray-500 font-mono">
                        #{pago.folio ?? pago.id.slice(0, 6).toUpperCase()}
                      </td>
                      <td className="px-4 py-3">
                        <Link
                          href={`/clientes/${pago.cliente?.id}`}
                          className="font-medium text-gray-900 dark:text-white hover:text-brand transition-colors"
                        >
                          {pago.cliente?.nombre ?? "—"}
                        </Link>
                        {pago.cliente?.empresaNombre && (
                          <p className="text-xs text-gray-400">{pago.cliente.empresaNombre}</p>
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-400 max-w-[180px] truncate">
                        {pago.concepto ?? "—"}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-gray-900 dark:text-white">
                        {formatMoney(pago.monto)}
                      </td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{pago.metodo}</td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col gap-1">
                          {estatusBadge(pago.estatus)}
                          {venc && (
                            <span className="text-xs text-red-500">{venc}d vencido</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-500 text-xs">
                        {pago.fechaPago
                          ? formatFechaCorta(pago.fechaPago)
                          : formatFechaCorta(pago.creadoEn)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1 justify-end">
                          <button
                            onClick={() => imprimirRecibo(pago)}
                            className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-gray-600 transition-colors"
                            title="Generar recibo"
                          >
                            <Printer className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleEliminar(pago.id)}
                            className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
                            title="Eliminar"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Paginación */}
          {datos.paginas > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 dark:border-gray-800">
              <p className="text-sm text-gray-500">
                Página {pagina} de {datos.paginas} · {datos.total} pagos
              </p>
              <div className="flex gap-2">
                <Button
                  variante="fantasma"
                  tamaño="sm"
                  icono={<ChevronLeft className="w-4 h-4" />}
                  disabled={pagina <= 1}
                  onClick={() => { const p = pagina - 1; setPagina(p); recargar(p) }}
                >
                  Anterior
                </Button>
                <Button
                  variante="fantasma"
                  tamaño="sm"
                  disabled={pagina >= datos.paginas}
                  onClick={() => { const p = pagina + 1; setPagina(p); recargar(p) }}
                >
                  Siguiente <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </Card>
      )}

      {/* Modal registrar pago */}
      <Modal abierto={modalAbierto} onCerrar={() => setModalAbierto(false)} titulo="Registrar pago" tamaño="md">
        <form onSubmit={handleGuardar} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              ID del cliente <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              placeholder="ID del cliente (copia desde el expediente)"
              value={form.clienteId}
              onChange={(e) => setForm({ ...form, clienteId: e.target.value })}
              className="w-full border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-sm bg-white dark:bg-gray-800"
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Monto <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                min="1"
                step="0.01"
                placeholder="0.00"
                value={form.monto}
                onChange={(e) => setForm({ ...form, monto: e.target.value })}
                className="w-full border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-sm bg-white dark:bg-gray-800"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Método</label>
              <select
                value={form.metodo}
                onChange={(e) => setForm({ ...form, metodo: e.target.value })}
                className="w-full border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-sm bg-white dark:bg-gray-800"
              >
                {METODOS.map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Concepto</label>
            <input
              type="text"
              placeholder="Consultoría mensual, sesión individual, etc."
              value={form.concepto}
              onChange={(e) => setForm({ ...form, concepto: e.target.value })}
              className="w-full border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-sm bg-white dark:bg-gray-800"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Estatus</label>
              <select
                value={form.estatus}
                onChange={(e) => setForm({ ...form, estatus: e.target.value })}
                className="w-full border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-sm bg-white dark:bg-gray-800"
              >
                {ESTATUS_OPTS.filter(Boolean).map((s) => (
                  <option key={s} value={s}>{s.charAt(0) + s.slice(1).toLowerCase()}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Fecha de pago</label>
              <input
                type="date"
                value={form.fechaPago}
                onChange={(e) => setForm({ ...form, fechaPago: e.target.value })}
                className="w-full border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-sm bg-white dark:bg-gray-800"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Fecha de vencimiento</label>
            <input
              type="date"
              value={form.fechaVencimiento}
              onChange={(e) => setForm({ ...form, fechaVencimiento: e.target.value })}
              className="w-full border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-sm bg-white dark:bg-gray-800"
            />
          </div>
          <div className="flex gap-3 pt-2">
            <Button variante="secundario" type="button" className="flex-1" onClick={() => setModalAbierto(false)}>
              Cancelar
            </Button>
            <Button type="submit" className="flex-1" cargando={guardando}>
              Registrar pago
            </Button>
          </div>
        </form>
      </Modal>

      {/* Suprimir warning de clienteBusqueda no usada */}
      <span className="hidden">{clienteBusqueda}</span>
    </div>
  )
}
