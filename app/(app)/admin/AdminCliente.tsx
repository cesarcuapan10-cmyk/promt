"use client"

import { useState, useTransition } from "react"
import { toast } from "sonner"
import { ShieldCheck, Users, Settings, Activity, Trash2, Database, Plus, Edit2, RefreshCw, ToggleLeft, ToggleRight, Download, ChevronLeft, ChevronRight } from "lucide-react"
import { Card } from "@/app/components/ui/Card"
import { Button } from "@/app/components/ui/Button"
import { Badge } from "@/app/components/ui/Badge"
import { Modal, ConfirmModal } from "@/app/components/ui/Modal"
import { Input } from "@/app/components/ui/Input"
import {
  listarUsuarios,
  crearUsuario,
  actualizarUsuario,
  desactivarUsuario,
  resetearContrasena,
  obtenerConfigNegocio,
  actualizarConfigNegocio,
  listarAuditoria,
  exportarDatos,
  exportarCSV,
  listarPapelera,
  restaurarDePapelera,
  vaciarPapelera,
} from "@/app/actions/admin"

type Usuario = {
  id: string
  nombre: string
  correo: string
  rol: string
  activo: boolean
  metaMensual: number | null
  creadoEn: Date
}

type ConfigNegocio = {
  id: string
  nombre: string
  mensajeWhatsapp: string
  metaMensual: number
  umbralEstancamiento: number
  metodoPago: string
  motivosPerdida: string
}

type RegistroAuditoria = {
  id: string
  accion: string
  descripcion: string
  creadoEn: Date
  usuario: { nombre: string } | null
}

type ClientePapelera = {
  id: string
  nombre: string
  correo: string | null
  telefono: string | null
  eliminadoEn: Date | null
  vendedor: { nombre: string }
}

type Props = {
  usuarios: Usuario[]
  config: ConfigNegocio
  auditoria: { registros: RegistroAuditoria[]; total: number; pagina: number; totalPaginas: number }
  papelera: ClientePapelera[]
}

const TABS = [
  { id: "usuarios", label: "Usuarios", icon: Users },
  { id: "config", label: "Configuración", icon: Settings },
  { id: "actividad", label: "Actividad del equipo", icon: Activity },
  { id: "papelera", label: "Papelera", icon: Trash2 },
  { id: "respaldo", label: "Respaldo", icon: Database },
] as const

type TabId = (typeof TABS)[number]["id"]

export function AdminCliente({ usuarios: initialUsuarios, config: initialConfig, auditoria: initialAuditoria, papelera: initialPapelera }: Props) {
  const [tab, setTab] = useState<TabId>("usuarios")
  const [usuarios, setUsuarios] = useState(initialUsuarios)
  const [config, setConfig] = useState(initialConfig)
  const [auditoria, setAuditoria] = useState(initialAuditoria)
  const [papelera, setPapelera] = useState(initialPapelera)
  const [isPending, startTransition] = useTransition()

  // Modal estados
  const [modalCrear, setModalCrear] = useState(false)
  const [modalEditar, setModalEditar] = useState<Usuario | null>(null)
  const [modalReset, setModalReset] = useState<Usuario | null>(null)
  const [modalVaciar, setModalVaciar] = useState(false)
  const [modalVaciar2, setModalVaciar2] = useState(false)

  // Formularios
  const [formCrear, setFormCrear] = useState({ nombre: "", correo: "", contraseña: "", rol: "VENDEDOR", metaMensual: "" })
  const [formEditar, setFormEditar] = useState({ nombre: "", correo: "", rol: "VENDEDOR", metaMensual: "" })
  const [formReset, setFormReset] = useState({ contraseña: "", confirmar: "" })
  const [formConfig, setFormConfig] = useState({
    nombre: config.nombre,
    mensajeWhatsapp: config.mensajeWhatsapp,
    metaMensual: String(config.metaMensual),
    umbralEstancamiento: String(config.umbralEstancamiento),
    metodoPago: (() => { try { return JSON.parse(config.metodoPago).join(", ") } catch { return config.metodoPago } })(),
    motivosPerdida: (() => { try { return JSON.parse(config.motivosPerdida).join(", ") } catch { return config.motivosPerdida } })(),
  })

  // Auditoría filtros
  const [filtroUsuario, setFiltroUsuario] = useState("")
  const [filtroDesde, setFiltroDesde] = useState("")
  const [filtroHasta, setFiltroHasta] = useState("")

  const refreshUsuarios = () => {
    startTransition(async () => {
      const data = await listarUsuarios()
      setUsuarios(data)
    })
  }

  const handleCrearUsuario = () => {
    startTransition(async () => {
      try {
        await crearUsuario({
          nombre: formCrear.nombre,
          correo: formCrear.correo,
          contraseña: formCrear.contraseña,
          rol: formCrear.rol,
          metaMensual: formCrear.metaMensual ? Number(formCrear.metaMensual) : undefined,
        })
        toast.success("Usuario creado")
        setModalCrear(false)
        setFormCrear({ nombre: "", correo: "", contraseña: "", rol: "VENDEDOR", metaMensual: "" })
        refreshUsuarios()
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Error al crear usuario")
      }
    })
  }

  const handleEditarUsuario = () => {
    if (!modalEditar) return
    startTransition(async () => {
      try {
        await actualizarUsuario(modalEditar.id, {
          nombre: formEditar.nombre,
          correo: formEditar.correo,
          rol: formEditar.rol,
          metaMensual: formEditar.metaMensual ? Number(formEditar.metaMensual) : null,
        })
        toast.success("Usuario actualizado")
        setModalEditar(null)
        refreshUsuarios()
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Error")
      }
    })
  }

  const handleToggleActivo = (u: Usuario) => {
    startTransition(async () => {
      try {
        await actualizarUsuario(u.id, { activo: !u.activo })
        toast.success(u.activo ? "Usuario desactivado" : "Usuario activado")
        refreshUsuarios()
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Error")
      }
    })
  }

  const handleResetContrasena = () => {
    if (!modalReset) return
    if (formReset.contraseña !== formReset.confirmar) {
      toast.error("Las contraseñas no coinciden")
      return
    }
    if (formReset.contraseña.length < 8) {
      toast.error("Mínimo 8 caracteres")
      return
    }
    startTransition(async () => {
      try {
        await resetearContrasena(modalReset.id, formReset.contraseña)
        toast.success("Contraseña actualizada")
        setModalReset(null)
        setFormReset({ contraseña: "", confirmar: "" })
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Error")
      }
    })
  }

  const handleGuardarConfig = () => {
    startTransition(async () => {
      try {
        const metodoPagoArr = formConfig.metodoPago.split(",").map((s: string) => s.trim()).filter(Boolean)
        const motivosPerdidaArr = formConfig.motivosPerdida.split(",").map((s: string) => s.trim()).filter(Boolean)
        await actualizarConfigNegocio({
          nombre: formConfig.nombre,
          mensajeWhatsapp: formConfig.mensajeWhatsapp,
          metaMensual: Number(formConfig.metaMensual),
          umbralEstancamiento: Number(formConfig.umbralEstancamiento),
          metodoPago: JSON.stringify(metodoPagoArr),
          motivosPerdida: JSON.stringify(motivosPerdidaArr),
        })
        toast.success("Configuración guardada")
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Error")
      }
    })
  }

  const handleFiltrarAuditoria = (pagina = 1) => {
    startTransition(async () => {
      try {
        const data = await listarAuditoria({
          pagina,
          usuario: filtroUsuario || undefined,
          desde: filtroDesde || undefined,
          hasta: filtroHasta || undefined,
        })
        setAuditoria(data)
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Error")
      }
    })
  }

  const handleRestaurar = (id: string) => {
    startTransition(async () => {
      try {
        await restaurarDePapelera(id)
        toast.success("Cliente restaurado")
        const data = await listarPapelera()
        setPapelera(data)
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Error")
      }
    })
  }

  const handleVaciarPapelera = () => {
    startTransition(async () => {
      try {
        const r = await vaciarPapelera()
        toast.success(`${r.eliminados} cliente(s) eliminados permanentemente`)
        setModalVaciar2(false)
        setPapelera([])
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Error")
      }
    })
  }

  const handleExportarJSON = () => {
    startTransition(async () => {
      try {
        const data = await exportarDatos()
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" })
        const url = URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url
        a.download = `crm-backup-${new Date().toISOString().split("T")[0]}.json`
        a.click()
        URL.revokeObjectURL(url)
        toast.success("Descarga iniciada")
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Error")
      }
    })
  }

  const handleExportarCSV = (tipo: "clientes" | "pagos" | "citas") => {
    startTransition(async () => {
      try {
        const csv = await exportarCSV(tipo)
        const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
        const url = URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url
        a.download = `${tipo}-${new Date().toISOString().split("T")[0]}.csv`
        a.click()
        URL.revokeObjectURL(url)
        toast.success("CSV descargado")
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Error")
      }
    })
  }

  const formatFecha = (d: Date) =>
    new Date(d).toLocaleDateString("es-MX", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: "#e8b76320" }}>
          <ShieldCheck className="w-5 h-5" style={{ color: "#e8b763" }} />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Panel admin</h1>
          <p className="text-sm text-gray-500">Tu equipo, tus datos, tu negocio</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 overflow-x-auto pb-1">
        {TABS.map((t) => {
          const Icon = t.icon
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition min-h-[44px] ${
                tab === t.id
                  ? "bg-brand text-white"
                  : "bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-white/10"
              }`}
            >
              <Icon size={15} />
              {t.label}
            </button>
          )
        })}
      </div>

      {/* ── Tab: Usuarios ── */}
      {tab === "usuarios" && (
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Usuarios</h2>
            <Button icono={<Plus size={16} />} onClick={() => setModalCrear(true)} tamaño="sm">
              Agregar usuario
            </Button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b dark:border-gray-800">
                  <th className="pb-3 font-medium">Nombre</th>
                  <th className="pb-3 font-medium">Correo</th>
                  <th className="pb-3 font-medium">Rol</th>
                  <th className="pb-3 font-medium">Activo</th>
                  <th className="pb-3 font-medium">Meta mensual</th>
                  <th className="pb-3 font-medium">Contraseña</th>
                  <th className="pb-3 font-medium">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y dark:divide-gray-800">
                {usuarios.map((u) => (
                  <tr key={u.id} className="hover:bg-gray-50 dark:hover:bg-white/5">
                    <td className="py-3 font-medium text-gray-900 dark:text-white">{u.nombre}</td>
                    <td className="py-3 text-gray-600 dark:text-gray-400">{u.correo}</td>
                    <td className="py-3">
                      <Badge variante={u.rol === "ADMIN" ? "caliente" : "activo"}>{u.rol}</Badge>
                    </td>
                    <td className="py-3">
                      <button onClick={() => handleToggleActivo(u)} className="text-gray-400 hover:text-brand transition min-h-[44px] flex items-center" title={u.activo ? "Desactivar" : "Activar"}>
                        {u.activo ? <ToggleRight size={24} className="text-green-500" /> : <ToggleLeft size={24} />}
                      </button>
                    </td>
                    <td className="py-3 text-gray-600 dark:text-gray-400">{u.metaMensual ? `$${u.metaMensual.toLocaleString()}` : "—"}</td>
                    <td className="py-3 text-gray-400 font-mono tracking-widest">••••••••</td>
                    <td className="py-3">
                      <div className="flex gap-1">
                        <button
                          onClick={() => { setModalEditar(u); setFormEditar({ nombre: u.nombre, correo: u.correo, rol: u.rol, metaMensual: u.metaMensual ? String(u.metaMensual) : "" }) }}
                          className="p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg transition min-h-[44px] min-w-[44px] flex items-center justify-center"
                          title="Editar"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          onClick={() => setModalReset(u)}
                          className="p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg transition min-h-[44px] min-w-[44px] flex items-center justify-center"
                          title="Resetear contraseña"
                        >
                          <RefreshCw size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* ── Tab: Configuración ── */}
      {tab === "config" && (
        <Card>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">Configuración del negocio</h2>
          <div className="grid gap-5 max-w-2xl">
            <div>
              <Input
                label="Nombre del negocio"
                value={formConfig.nombre}
                onChange={(e) => setFormConfig((p) => ({ ...p, nombre: e.target.value }))}
                ayuda="El nombre que verán tus clientes y tu equipo"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                Mensaje de WhatsApp por defecto
              </label>
              <textarea
                className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white bg-white dark:bg-[#1a1a1a] text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 resize-none"
                rows={4}
                value={formConfig.mensajeWhatsapp}
                onChange={(e) => setFormConfig((p) => ({ ...p, mensajeWhatsapp: e.target.value }))}
              />
              <p className="text-xs text-gray-500 mt-1">Usa {"{nombre}"} para personalizar el mensaje</p>
            </div>
            <Input
              label="Meta mensual (número de clientes ganados)"
              type="number"
              value={formConfig.metaMensual}
              onChange={(e) => setFormConfig((p) => ({ ...p, metaMensual: e.target.value }))}
              ayuda="¿Cuántos clientes quieres cerrar al mes?"
            />
            <Input
              label="Umbral de estancamiento (días)"
              type="number"
              value={formConfig.umbralEstancamiento}
              onChange={(e) => setFormConfig((p) => ({ ...p, umbralEstancamiento: e.target.value }))}
              ayuda="Días sin contacto para marcar un cliente como estancado"
            />
            <Input
              label="Métodos de pago (separados por coma)"
              value={formConfig.metodoPago}
              onChange={(e) => setFormConfig((p) => ({ ...p, metodoPago: e.target.value }))}
              ayuda="Ejemplo: Transferencia, Tarjeta, Liga de pago, Efectivo"
            />
            <Input
              label="Motivos de pérdida (separados por coma)"
              value={formConfig.motivosPerdida}
              onChange={(e) => setFormConfig((p) => ({ ...p, motivosPerdida: e.target.value }))}
              ayuda="Razones por las que puedes perder un cliente"
            />
            <Button onClick={handleGuardarConfig} cargando={isPending}>
              Guardar cambios
            </Button>
          </div>
        </Card>
      )}

      {/* ── Tab: Actividad ── */}
      {tab === "actividad" && (
        <Card>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Actividad del equipo</h2>
          <div className="flex flex-wrap gap-3 mb-4">
            <select
              className="px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-sm bg-white dark:bg-[#1a1a1a] text-gray-900 dark:text-white min-h-[44px]"
              value={filtroUsuario}
              onChange={(e) => setFiltroUsuario(e.target.value)}
            >
              <option value="">Todos los usuarios</option>
              {usuarios.map((u) => (
                <option key={u.id} value={u.id}>{u.nombre}</option>
              ))}
            </select>
            <input
              type="date"
              className="px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-sm bg-white dark:bg-[#1a1a1a] text-gray-900 dark:text-white min-h-[44px]"
              value={filtroDesde}
              onChange={(e) => setFiltroDesde(e.target.value)}
            />
            <input
              type="date"
              className="px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-sm bg-white dark:bg-[#1a1a1a] text-gray-900 dark:text-white min-h-[44px]"
              value={filtroHasta}
              onChange={(e) => setFiltroHasta(e.target.value)}
            />
            <Button onClick={() => handleFiltrarAuditoria(1)} variante="secundario" tamaño="sm">
              Filtrar
            </Button>
          </div>

          <div className="space-y-2">
            {auditoria.registros.length === 0 ? (
              <p className="text-gray-500 text-sm text-center py-8">No hay registros de actividad</p>
            ) : (
              auditoria.registros.map((r) => (
                <div key={r.id} className="flex items-start gap-3 p-3 rounded-xl bg-gray-50 dark:bg-white/5">
                  <div className="w-8 h-8 rounded-full bg-brand/10 flex items-center justify-center flex-shrink-0 text-xs font-bold text-brand">
                    {r.usuario?.nombre?.[0] ?? "?"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-800 dark:text-gray-200">{r.descripcion}</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {r.usuario?.nombre ?? "Sistema"} · {formatFecha(r.creadoEn)}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>

          {auditoria.totalPaginas > 1 && (
            <div className="flex items-center justify-center gap-3 mt-4">
              <button
                disabled={auditoria.pagina <= 1}
                onClick={() => handleFiltrarAuditoria(auditoria.pagina - 1)}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 disabled:opacity-30 min-h-[44px] min-w-[44px] flex items-center justify-center"
              >
                <ChevronLeft size={16} />
              </button>
              <span className="text-sm text-gray-600 dark:text-gray-400">
                Página {auditoria.pagina} de {auditoria.totalPaginas}
              </span>
              <button
                disabled={auditoria.pagina >= auditoria.totalPaginas}
                onClick={() => handleFiltrarAuditoria(auditoria.pagina + 1)}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 disabled:opacity-30 min-h-[44px] min-w-[44px] flex items-center justify-center"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          )}
        </Card>
      )}

      {/* ── Tab: Papelera ── */}
      {tab === "papelera" && (
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Papelera (últimos 30 días)</h2>
            {papelera.length > 0 && (
              <Button variante="peligro" tamaño="sm" icono={<Trash2 size={14} />} onClick={() => setModalVaciar(true)}>
                Vaciar papelera
              </Button>
            )}
          </div>

          {papelera.length === 0 ? (
            <p className="text-gray-500 text-sm text-center py-10">La papelera está vacía</p>
          ) : (
            <div className="space-y-2">
              {papelera.map((c) => (
                <div key={c.id} className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 dark:bg-white/5">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{c.nombre}</p>
                    <p className="text-xs text-gray-500">
                      {c.correo} · {c.vendedor.nombre} · Eliminado: {formatFecha(c.eliminadoEn!)}
                    </p>
                  </div>
                  <Button variante="secundario" tamaño="sm" onClick={() => handleRestaurar(c.id)}>
                    Restaurar
                  </Button>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* ── Tab: Respaldo ── */}
      {tab === "respaldo" && (
        <div className="space-y-4">
          <Card>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Respaldo completo (JSON)</h2>
            <p className="text-sm text-gray-500 mb-4">
              Incluye todos los clientes, citas, pagos y notas del CRM. <strong>Nunca incluye contraseñas.</strong>
            </p>
            <Button icono={<Download size={16} />} onClick={handleExportarJSON} cargando={isPending}>
              Descargar JSON completo
            </Button>
          </Card>

          <Card>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Exportar como CSV</h2>
            <div className="space-y-3">
              <div className="p-4 rounded-xl border border-gray-100 dark:border-gray-800">
                <p className="text-sm font-medium text-gray-800 dark:text-gray-200 mb-1">Clientes</p>
                <p className="text-xs text-gray-500 mb-3">Nombre, correo, teléfono, etapa, temperatura, origen, vendedor</p>
                <Button variante="secundario" tamaño="sm" icono={<Download size={14} />} onClick={() => handleExportarCSV("clientes")} cargando={isPending}>
                  Exportar CSV Clientes
                </Button>
              </div>
              <div className="p-4 rounded-xl border border-gray-100 dark:border-gray-800">
                <p className="text-sm font-medium text-gray-800 dark:text-gray-200 mb-1">Pagos</p>
                <p className="text-xs text-gray-500 mb-3">Cliente, vendedor, monto, método, estatus, concepto, fecha</p>
                <Button variante="secundario" tamaño="sm" icono={<Download size={14} />} onClick={() => handleExportarCSV("pagos")} cargando={isPending}>
                  Exportar CSV Pagos
                </Button>
              </div>
              <div className="p-4 rounded-xl border border-gray-100 dark:border-gray-800">
                <p className="text-sm font-medium text-gray-800 dark:text-gray-200 mb-1">Citas</p>
                <p className="text-xs text-gray-500 mb-3">Cliente, vendedor, título, fechas, confirmada</p>
                <Button variante="secundario" tamaño="sm" icono={<Download size={14} />} onClick={() => handleExportarCSV("citas")} cargando={isPending}>
                  Exportar CSV Citas
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* ── Modal: Crear usuario ── */}
      <Modal abierto={modalCrear} onCerrar={() => setModalCrear(false)} titulo="Nuevo usuario">
        <div className="space-y-4">
          <Input label="Nombre" value={formCrear.nombre} onChange={(e) => setFormCrear((p) => ({ ...p, nombre: e.target.value }))} />
          <Input label="Correo" type="email" value={formCrear.correo} onChange={(e) => setFormCrear((p) => ({ ...p, correo: e.target.value }))} />
          <Input label="Contraseña (mín. 8 caracteres)" type="password" value={formCrear.contraseña} onChange={(e) => setFormCrear((p) => ({ ...p, contraseña: e.target.value }))} />
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Rol</label>
            <select
              className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white bg-white dark:bg-[#1a1a1a] text-sm outline-none focus:border-brand min-h-[44px]"
              value={formCrear.rol}
              onChange={(e) => setFormCrear((p) => ({ ...p, rol: e.target.value }))}
            >
              <option value="VENDEDOR">Vendedor</option>
              <option value="ADMIN">Admin</option>
            </select>
          </div>
          <Input label="Meta mensual (opcional)" type="number" value={formCrear.metaMensual} onChange={(e) => setFormCrear((p) => ({ ...p, metaMensual: e.target.value }))} />
          <div className="flex gap-3 justify-end pt-2">
            <Button variante="fantasma" onClick={() => setModalCrear(false)}>Cancelar</Button>
            <Button onClick={handleCrearUsuario} cargando={isPending}>Crear usuario</Button>
          </div>
        </div>
      </Modal>

      {/* ── Modal: Editar usuario ── */}
      <Modal abierto={!!modalEditar} onCerrar={() => setModalEditar(null)} titulo="Editar usuario">
        <div className="space-y-4">
          <Input label="Nombre" value={formEditar.nombre} onChange={(e) => setFormEditar((p) => ({ ...p, nombre: e.target.value }))} />
          <Input label="Correo" type="email" value={formEditar.correo} onChange={(e) => setFormEditar((p) => ({ ...p, correo: e.target.value }))} />
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Rol</label>
            <select
              className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white bg-white dark:bg-[#1a1a1a] text-sm outline-none focus:border-brand min-h-[44px]"
              value={formEditar.rol}
              onChange={(e) => setFormEditar((p) => ({ ...p, rol: e.target.value }))}
            >
              <option value="VENDEDOR">Vendedor</option>
              <option value="ADMIN">Admin</option>
            </select>
          </div>
          <Input label="Meta mensual" type="number" value={formEditar.metaMensual} onChange={(e) => setFormEditar((p) => ({ ...p, metaMensual: e.target.value }))} />
          <div className="flex gap-3 justify-end pt-2">
            <Button variante="fantasma" onClick={() => setModalEditar(null)}>Cancelar</Button>
            <Button onClick={handleEditarUsuario} cargando={isPending}>Guardar</Button>
          </div>
        </div>
      </Modal>

      {/* ── Modal: Resetear contraseña ── */}
      <Modal abierto={!!modalReset} onCerrar={() => setModalReset(null)} titulo={`Resetear contraseña de ${modalReset?.nombre}`}>
        <div className="space-y-4">
          <Input label="Nueva contraseña" type="password" value={formReset.contraseña} onChange={(e) => setFormReset((p) => ({ ...p, contraseña: e.target.value }))} />
          <Input label="Confirmar contraseña" type="password" value={formReset.confirmar} onChange={(e) => setFormReset((p) => ({ ...p, confirmar: e.target.value }))} />
          <div className="flex gap-3 justify-end pt-2">
            <Button variante="fantasma" onClick={() => setModalReset(null)}>Cancelar</Button>
            <Button onClick={handleResetContrasena} cargando={isPending}>Actualizar contraseña</Button>
          </div>
        </div>
      </Modal>

      {/* ── Modal: Confirmar vaciar papelera (1) ── */}
      <ConfirmModal
        abierto={modalVaciar}
        onCerrar={() => setModalVaciar(false)}
        onConfirmar={() => { setModalVaciar(false); setModalVaciar2(true) }}
        titulo="¿Vaciar papelera?"
        mensaje="Esta acción eliminará permanentemente todos los clientes en la papelera. ¿Estás seguro?"
        textoConfirmar="Sí, continuar"
        peligroso
      />

      {/* ── Modal: Confirmar vaciar papelera (2) ── */}
      <ConfirmModal
        abierto={modalVaciar2}
        onCerrar={() => setModalVaciar2(false)}
        onConfirmar={handleVaciarPapelera}
        titulo="¿Confirmas que quieres eliminar TODO?"
        mensaje="Esta es tu segunda y última confirmación. Los datos eliminados NO se pueden recuperar."
        textoConfirmar="Eliminar permanentemente"
        peligroso
      />
    </div>
  )
}
