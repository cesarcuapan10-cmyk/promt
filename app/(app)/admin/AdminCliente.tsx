"use client"
import { useState, useTransition } from "react"
import { Users, Settings, Activity, Download, Plus, UserCheck, UserX, Key, Save, RefreshCcw } from "lucide-react"
import { Button } from "@/app/components/ui/Button"
import { Card } from "@/app/components/ui/Card"
import { Badge } from "@/app/components/ui/Badge"
import { Input } from "@/app/components/ui/Input"
import { Modal } from "@/app/components/ui/Modal"
import { crearUsuario, desactivarUsuario, resetearContrasena, actualizarMetaNegocio, exportarTodo } from "@/app/actions/admin"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import { formatFecha } from "@/app/lib/utils"

type Usuario = { id: string; nombre: string; correo: string; rol: string; activo: boolean; metaMensual: number | null; creadoEn: Date }
type Auditoria = { id: string; descripcion: string; accion: string; creadoEn: Date; usuario: { nombre: string } | null }
type MetaNegocio = { nombre: string; colorMarca: string; moneda: string; horarioInicio: string; horarioFin: string; duracionCita: number; metaMensual: number; mensajeWhatsapp: string; umbralEstancamiento: number }

const TABS = [
  { id: "usuarios", label: "Usuarios", Icon: Users },
  { id: "config", label: "Configuración", Icon: Settings },
  { id: "actividad", label: "Actividad", Icon: Activity },
  { id: "backup", label: "Backup", Icon: Download },
]

export default function AdminCliente({
  usuariosIniciales,
  auditoriaInicial,
  metaNegocioInicial,
}: {
  usuariosIniciales: Usuario[]
  auditoriaInicial: Auditoria[]
  metaNegocioInicial: MetaNegocio
}) {
  const [tab, setTab] = useState("usuarios")
  const [modalNuevo, setModalNuevo] = useState(false)
  const [nuevoUser, setNuevoUser] = useState({ nombre: "", correo: "", contrasena: "", rol: "VENDEDOR", metaMensual: "" })
  const [config, setConfig] = useState(metaNegocioInicial)
  const [, startTransition] = useTransition()
  const router = useRouter()

  function crearNuevoUsuario() {
    startTransition(async () => {
      const r = await crearUsuario({
        nombre: nuevoUser.nombre,
        correo: nuevoUser.correo,
        contrasena: nuevoUser.contrasena,
        rol: nuevoUser.rol as "ADMIN" | "VENDEDOR",
        metaMensual: nuevoUser.metaMensual ? Number(nuevoUser.metaMensual) : null,
      })
      if (r.ok) {
        toast.success("Usuario creado")
        setModalNuevo(false)
        setNuevoUser({ nombre: "", correo: "", contrasena: "", rol: "VENDEDOR", metaMensual: "" })
        router.refresh()
      } else {
        toast.error(r.error || "No se pudo crear")
      }
    })
  }

  function toggleActivo(id: string) {
    startTransition(async () => {
      const r = await desactivarUsuario(id)
      if (r.ok) { toast.success("Actualizado"); router.refresh() }
      else toast.error(r.error || "Error")
    })
  }

  function guardarConfig() {
    startTransition(async () => {
      const r = await actualizarMetaNegocio(config)
      if (r.ok) toast.success("Configuración guardada")
      else toast.error("No se pudo guardar")
    })
  }

  function descargarBackup() {
    startTransition(async () => {
      const data = await exportarTodo()
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `backup-crm-${new Date().toISOString().slice(0, 10)}.json`
      a.click()
      toast.success("Backup descargado")
    })
  }

  return (
    <div className="space-y-4">
      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-xl w-fit">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${tab === t.id ? "bg-white dark:bg-gray-700 text-brand shadow-sm" : "text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"}`}>
            <t.Icon className="w-4 h-4" />
            <span className="hidden sm:inline">{t.label}</span>
          </button>
        ))}
      </div>

      {/* TAB: USUARIOS */}
      {tab === "usuarios" && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <Button icono={<Plus className="w-4 h-4" />} onClick={() => setModalNuevo(true)}>
              Nuevo usuario
            </Button>
          </div>
          <div className="space-y-3">
            {usuariosIniciales.map(u => (
              <Card key={u.id} className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-brand/10 flex items-center justify-center shrink-0 font-bold text-brand">
                  {u.nombre[0].toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 dark:text-white">{u.nombre}</p>
                  <p className="text-sm text-gray-500">{u.correo}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
                  <Badge variante={u.rol === "ADMIN" ? "activo" : "default"}>{u.rol}</Badge>
                  {!u.activo && <Badge variante="perdido">Inactivo</Badge>}
                  {u.metaMensual && <span className="text-xs text-gray-400">Meta: {u.metaMensual}</span>}
                  <Button variante="fantasma" tamaño="sm"
                    icono={u.activo ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                    onClick={() => toggleActivo(u.id)}>
                    {u.activo ? "Desactivar" : "Activar"}
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* TAB: CONFIGURACIÓN */}
      {tab === "config" && (
        <Card className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input label="Nombre del negocio" value={config.nombre} onChange={e => setConfig(p => ({ ...p, nombre: e.target.value }))} />
            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Color de marca</label>
              <div className="flex gap-2 items-center">
                <input type="color" value={config.colorMarca} onChange={e => setConfig(p => ({ ...p, colorMarca: e.target.value }))}
                  className="w-10 h-10 rounded cursor-pointer border-0" />
                <span className="text-sm text-gray-500">{config.colorMarca}</span>
              </div>
            </div>
            <Input label="Moneda" value={config.moneda} onChange={e => setConfig(p => ({ ...p, moneda: e.target.value }))} placeholder="MXN" />
            <Input label="Meta mensual (clientes)" type="number" value={String(config.metaMensual)} onChange={e => setConfig(p => ({ ...p, metaMensual: Number(e.target.value) }))} />
            <Input label="Horario inicio" type="time" value={config.horarioInicio} onChange={e => setConfig(p => ({ ...p, horarioInicio: e.target.value }))} />
            <Input label="Horario fin" type="time" value={config.horarioFin} onChange={e => setConfig(p => ({ ...p, horarioFin: e.target.value }))} />
            <Input label="Duración de cita (min)" type="number" value={String(config.duracionCita)} onChange={e => setConfig(p => ({ ...p, duracionCita: Number(e.target.value) }))} />
            <Input label="Días sin avance para alerta" type="number" value={String(config.umbralEstancamiento)} onChange={e => setConfig(p => ({ ...p, umbralEstancamiento: Number(e.target.value) }))} />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Mensaje tipo WhatsApp</label>
            <textarea value={config.mensajeWhatsapp} onChange={e => setConfig(p => ({ ...p, mensajeWhatsapp: e.target.value }))}
              rows={4} className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand resize-none" />
          </div>
          <Button icono={<Save className="w-4 h-4" />} onClick={guardarConfig}>Guardar configuración</Button>
        </Card>
      )}

      {/* TAB: ACTIVIDAD */}
      {tab === "actividad" && (
        <div className="space-y-3">
          <p className="text-sm text-gray-500">Últimas {auditoriaInicial.length} acciones del equipo</p>
          {auditoriaInicial.map(r => (
            <Card key={r.id} className="py-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm text-gray-900 dark:text-white">{r.descripcion}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{r.usuario?.nombre ?? "Sistema"}</p>
                </div>
                <span className="text-xs text-gray-400 shrink-0">{formatFecha(r.creadoEn)}</span>
              </div>
            </Card>
          ))}
          {auditoriaInicial.length === 0 && (
            <Card className="text-center py-8">
              <Activity className="w-10 h-10 mx-auto mb-2 text-gray-200" />
              <p className="text-gray-400 text-sm">Sin actividad registrada aún</p>
            </Card>
          )}
        </div>
      )}

      {/* TAB: BACKUP */}
      {tab === "backup" && (
        <Card className="space-y-4">
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white mb-1">Respaldar todo</h3>
            <p className="text-sm text-gray-500 mb-4">Descarga todos tus datos (clientes, pagos, citas, notas) como un archivo JSON. Guárdalo en un lugar seguro.</p>
            <Button icono={<Download className="w-4 h-4" />} onClick={descargarBackup}>
              Descargar backup completo (.json)
            </Button>
          </div>
          <hr className="border-gray-100 dark:border-gray-800" />
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white mb-1">Restaurar desde respaldo</h3>
            <p className="text-sm text-gray-500">Para restaurar datos, contacta al administrador técnico con tu archivo JSON de respaldo.</p>
          </div>
        </Card>
      )}

      {/* Modal nuevo usuario */}
      <Modal abierto={modalNuevo} onCerrar={() => setModalNuevo(false)} titulo="Nuevo usuario">
        <div className="space-y-4 p-4">
          <Input label="Nombre completo" value={nuevoUser.nombre} onChange={e => setNuevoUser(p => ({ ...p, nombre: e.target.value }))} placeholder="María López" />
          <Input label="Correo electrónico" type="email" value={nuevoUser.correo} onChange={e => setNuevoUser(p => ({ ...p, correo: e.target.value }))} placeholder="maria@ejemplo.com" />
          <Input label="Contraseña temporal" type="password" value={nuevoUser.contrasena} onChange={e => setNuevoUser(p => ({ ...p, contrasena: e.target.value }))} placeholder="Mínimo 6 caracteres" />
          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Rol</label>
            <select value={nuevoUser.rol} onChange={e => setNuevoUser(p => ({ ...p, rol: e.target.value }))}
              className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand">
              <option value="VENDEDOR">Vendedor</option>
              <option value="ADMIN">Administrador</option>
            </select>
          </div>
          <Input label="Meta mensual (clientes, opcional)" type="number" value={nuevoUser.metaMensual} onChange={e => setNuevoUser(p => ({ ...p, metaMensual: e.target.value }))} placeholder="15" />
          <div className="flex gap-2 pt-2">
            <Button onClick={crearNuevoUsuario} className="flex-1">Crear usuario</Button>
            <Button variante="secundario" onClick={() => setModalNuevo(false)}>Cancelar</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
