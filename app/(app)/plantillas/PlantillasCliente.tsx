"use client"
import { useState, useTransition } from "react"
import {
  MessageSquare, Star, Copy, Trash2, Edit3, Plus, Search, X, Check,
} from "lucide-react"
import {
  listarPlantillas, crearPlantilla, actualizarPlantilla,
  eliminarPlantilla, duplicarPlantilla, toggleFavoritaPlantilla,
} from "@/app/actions/plantillas"
import { sustituirVariables } from "@/app/lib/utils"

interface Plantilla {
  id: string
  usuarioId: string | null
  titulo: string
  contenido: string
  tipo: string
  etapa: string | null
  objecion: string | null
  favorita: boolean
  creadoEn: Date
}

interface Props {
  plantillasIniciales: Plantilla[]
}

const ETAPAS = [
  "NUEVO", "CONTACTADO", "INTERESADO", "PROPUESTA_ENVIADA", "CITA_AGENDADA",
  "NEGOCIACION", "GANADO", "PERDIDO",
]

const DATOS_EJEMPLO: Record<string, string> = {
  nombre: "María García",
  empresa: "Ventas Puebla SA",
  etapa: "PROPUESTA_ENVIADA",
  valor: "$5,000",
  vendedor: "César Cuapan",
  objecion: "Está caro",
}

const PLANTILLAS_SEED: Omit<Plantilla, "id" | "creadoEn" | "usuarioId">[] = [
  {
    titulo: "Reactivar un frío",
    tipo: "WHATSAPP",
    etapa: "NUEVO",
    objecion: null,
    favorita: false,
    contenido: "Hola {nombre}, soy César. Han pasado unos días desde que hablamos y quería saber cómo van tus ventas. ¿Pudiste aplicar algo de lo que conversamos?",
  },
  {
    titulo: "Vencer 'está caro'",
    tipo: "WHATSAPP",
    etapa: null,
    objecion: "Está caro",
    favorita: false,
    contenido: "Hola {nombre}, entiendo que el precio puede parecer alto al principio. Lo que nuestros clientes descubren es que el retorno llega en los primeros 2-3 meses. ¿Te gustaría ver cómo lo han logrado?",
  },
  {
    titulo: "El que lo va a pensar",
    tipo: "WHATSAPP",
    etapa: null,
    objecion: "Lo voy a pensar",
    favorita: false,
    contenido: "Hola {nombre}, quería darte un dato que podría ayudarte a tomar tu decisión. Los profesionales que empiezan hoy ven resultados en 30 días. ¿Qué es lo que necesitas para sentirte seguro/a?",
  },
  {
    titulo: "Confirmar cita",
    tipo: "WHATSAPP",
    etapa: "CITA_AGENDADA",
    objecion: null,
    favorita: false,
    contenido: "Hola {nombre}! Te confirmo nuestra llamada para el día de mañana. Estaré puntual. Si necesitas reprogramar, avísame con tiempo. ¡Nos vemos pronto! 👋",
  },
  {
    titulo: "Recuperar pago vencido",
    tipo: "WHATSAPP",
    etapa: null,
    objecion: null,
    favorita: false,
    contenido: "Hola {nombre}, espero que estés muy bien. Quería recordarte que tenemos un pago pendiente. ¿Podemos coordinar hoy para resolverlo? Estoy para ayudarte.",
  },
  {
    titulo: "Cerrar con urgencia",
    tipo: "WHATSAPP",
    etapa: "PROPUESTA_ENVIADA",
    objecion: null,
    favorita: false,
    contenido: "Hola {nombre}, solo quería avisarte que los lugares para este mes están casi llenos. Si quieres asegurar el tuyo, podemos cerrar hoy. ¿Te parece?",
  },
  {
    titulo: "Pedir el sí final",
    tipo: "WHATSAPP",
    etapa: "PROPUESTA_ENVIADA",
    objecion: null,
    favorita: false,
    contenido: "Hola {nombre}, revisé tu caso y creo que estás listo/a para dar el siguiente paso. ¿Qué te falta para decir que sí hoy?",
  },
  {
    titulo: "Pedir referidos",
    tipo: "WHATSAPP",
    etapa: "GANADO",
    objecion: null,
    favorita: false,
    contenido: "Hola {nombre}! Me alegra saber que estás logrando resultados. ¿Conoces a alguien más que quiera incrementar sus ventas? Tu recomendación significa mucho para mí. 🙏",
  },
]

export default function PlantillasCliente({ plantillasIniciales }: Props) {
  const [plantillas, setPlantillas] = useState<Plantilla[]>(plantillasIniciales)
  const [busqueda, setBusqueda] = useState("")
  const [filtroTipo, setFiltroTipo] = useState<string>("TODOS")
  const [filtroEtapa, setFiltroEtapa] = useState<string>("TODAS")
  const [filtroFavoritas, setFiltroFavoritas] = useState(false)
  const [modalAbierto, setModalAbierto] = useState(false)
  const [editando, setEditando] = useState<Plantilla | null>(null)
  const [copiado, setCopiado] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const [form, setForm] = useState({
    titulo: "",
    contenido: "",
    tipo: "WHATSAPP" as "WHATSAPP" | "CORREO",
    etapa: "",
    objecion: "",
    favorita: false,
  })

  const recargar = () => {
    startTransition(async () => {
      const { plantillas: nuevas } = await listarPlantillas()
      setPlantillas(nuevas)
    })
  }

  const abrirModal = (plantilla?: Plantilla) => {
    if (plantilla) {
      setEditando(plantilla)
      setForm({
        titulo: plantilla.titulo,
        contenido: plantilla.contenido,
        tipo: plantilla.tipo as "WHATSAPP" | "CORREO",
        etapa: plantilla.etapa ?? "",
        objecion: plantilla.objecion ?? "",
        favorita: plantilla.favorita,
      })
    } else {
      setEditando(null)
      setForm({ titulo: "", contenido: "", tipo: "WHATSAPP", etapa: "", objecion: "", favorita: false })
    }
    setModalAbierto(true)
  }

  const cerrarModal = () => {
    setModalAbierto(false)
    setEditando(null)
  }

  const guardar = async () => {
    const data = {
      titulo: form.titulo,
      contenido: form.contenido,
      tipo: form.tipo,
      etapa: form.etapa || null,
      objecion: form.objecion || null,
      favorita: form.favorita,
    }
    if (editando) {
      await actualizarPlantilla(editando.id, data)
    } else {
      await crearPlantilla(data)
    }
    cerrarModal()
    recargar()
  }

  const eliminar = async (id: string) => {
    if (!confirm("¿Eliminar esta plantilla?")) return
    await eliminarPlantilla(id)
    recargar()
  }

  const duplicar = async (id: string) => {
    await duplicarPlantilla(id)
    recargar()
  }

  const toggleFav = async (id: string) => {
    await toggleFavoritaPlantilla(id)
    recargar()
  }

  const copiar = (plantilla: Plantilla) => {
    const texto = sustituirVariables(plantilla.contenido, DATOS_EJEMPLO)
    navigator.clipboard.writeText(texto).catch(() => {})
    setCopiado(plantilla.id)
    setTimeout(() => setCopiado(null), 2000)
  }

  const cargarSeed = async () => {
    for (const p of PLANTILLAS_SEED) {
      await crearPlantilla({
        titulo: p.titulo,
        contenido: p.contenido,
        tipo: p.tipo as "WHATSAPP" | "CORREO",
        etapa: p.etapa ?? undefined,
        objecion: p.objecion ?? undefined,
        favorita: p.favorita,
      })
    }
    recargar()
  }

  const plantillasFiltradas = plantillas.filter((p) => {
    if (filtroTipo !== "TODOS" && p.tipo !== filtroTipo) return false
    if (filtroEtapa !== "TODAS" && p.etapa !== filtroEtapa) return false
    if (filtroFavoritas && !p.favorita) return false
    if (busqueda) {
      const q = busqueda.toLowerCase()
      return (
        p.titulo.toLowerCase().includes(q) ||
        p.contenido.toLowerCase().includes(q) ||
        (p.objecion?.toLowerCase().includes(q) ?? false)
      )
    }
    return true
  })

  const preview = sustituirVariables(form.contenido, DATOS_EJEMPLO)

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-brand/10 flex items-center justify-center">
            <MessageSquare className="w-5 h-5 text-brand" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">Plantillas de mensajes</h1>
            <p className="text-sm text-gray-500">Tu arsenal para cerrar ventas</p>
          </div>
        </div>
        <div className="flex gap-2">
          {plantillas.length === 0 && (
            <button
              onClick={cargarSeed}
              className="px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-white/5 transition"
            >
              Cargar plantillas base
            </button>
          )}
          <button
            onClick={() => abrirModal()}
            className="flex items-center gap-2 bg-brand text-white font-semibold px-4 py-2 rounded-xl text-sm hover:opacity-90 transition"
          >
            <Plus className="w-4 h-4" />
            Nueva plantilla
          </button>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-2 mb-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar..."
            className="pl-9 pr-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#1f1f1f] focus:outline-none focus:ring-2 focus:ring-brand w-48"
          />
        </div>
        <select
          value={filtroTipo}
          onChange={(e) => setFiltroTipo(e.target.value)}
          className="px-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#1f1f1f] focus:outline-none focus:ring-2 focus:ring-brand"
        >
          <option value="TODOS">Todos los tipos</option>
          <option value="WHATSAPP">WhatsApp</option>
          <option value="CORREO">Correo</option>
        </select>
        <select
          value={filtroEtapa}
          onChange={(e) => setFiltroEtapa(e.target.value)}
          className="px-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#1f1f1f] focus:outline-none focus:ring-2 focus:ring-brand"
        >
          <option value="TODAS">Todas las etapas</option>
          {ETAPAS.map((e) => <option key={e} value={e}>{e}</option>)}
        </select>
        <button
          onClick={() => setFiltroFavoritas(!filtroFavoritas)}
          className={`flex items-center gap-1.5 px-3 py-2 text-sm rounded-xl border transition ${
            filtroFavoritas
              ? "border-brand bg-brand/10 text-brand"
              : "border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5"
          }`}
        >
          <Star className="w-4 h-4" />
          Favoritas
        </button>
      </div>

      {/* Lista */}
      {isPending ? (
        <p className="text-sm text-gray-400 py-8 text-center">Cargando...</p>
      ) : plantillasFiltradas.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <MessageSquare className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm">No hay plantillas que coincidan</p>
          {plantillas.length === 0 && (
            <p className="text-xs mt-1">Carga las plantillas base o crea la primera.</p>
          )}
        </div>
      ) : (
        <div className="grid gap-3">
          {plantillasFiltradas.map((p) => (
            <div
              key={p.id}
              className="bg-white dark:bg-[#1f1f1f] rounded-2xl border border-gray-100 dark:border-gray-800 p-4 hover:shadow-sm transition"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <h3 className="font-semibold text-gray-900 dark:text-white text-sm truncate">
                      {p.titulo}
                    </h3>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      p.tipo === "WHATSAPP"
                        ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400"
                        : "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400"
                    }`}>
                      {p.tipo}
                    </span>
                    {p.etapa && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400">
                        {p.etapa}
                      </span>
                    )}
                    {p.objecion && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-brand/10 text-brand">
                        {p.objecion}
                      </span>
                    )}
                    {p.usuarioId === null && (
                      <span className="text-xs text-gray-400">global</span>
                    )}
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2">
                    {p.contenido}
                  </p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => toggleFav(p.id)}
                    className={`p-1.5 rounded-lg transition ${
                      p.favorita ? "text-brand" : "text-gray-400 hover:text-brand"
                    }`}
                    title="Favorita"
                  >
                    <Star className={`w-4 h-4 ${p.favorita ? "fill-brand" : ""}`} />
                  </button>
                  <button
                    onClick={() => copiar(p)}
                    className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition"
                    title="Copiar"
                  >
                    {copiado === p.id ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                  </button>
                  <button
                    onClick={() => abrirModal(p)}
                    className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition"
                    title="Editar"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => duplicar(p.id)}
                    className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition"
                    title="Duplicar"
                  >
                    <Copy className="w-4 h-4 opacity-60" />
                  </button>
                  <button
                    onClick={() => eliminar(p.id)}
                    className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 transition"
                    title="Eliminar"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {modalAbierto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={cerrarModal} />
          <div className="relative bg-white dark:bg-[#1f1f1f] rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-gray-800">
              <h2 className="font-bold text-gray-900 dark:text-white">
                {editando ? "Editar plantilla" : "Nueva plantilla"}
              </h2>
              <button onClick={cerrarModal} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 transition">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Título *</label>
                <input
                  value={form.titulo}
                  onChange={(e) => setForm({ ...form, titulo: e.target.value })}
                  placeholder="Ej: Vencer 'está caro'"
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#111] text-sm focus:outline-none focus:ring-2 focus:ring-brand"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Tipo</label>
                  <select
                    value={form.tipo}
                    onChange={(e) => setForm({ ...form, tipo: e.target.value as "WHATSAPP" | "CORREO" })}
                    className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#111] text-sm focus:outline-none focus:ring-2 focus:ring-brand"
                  >
                    <option value="WHATSAPP">WhatsApp</option>
                    <option value="CORREO">Correo</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Etapa destino</label>
                  <select
                    value={form.etapa}
                    onChange={(e) => setForm({ ...form, etapa: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#111] text-sm focus:outline-none focus:ring-2 focus:ring-brand"
                  >
                    <option value="">Sin etapa</option>
                    {ETAPAS.map((e) => <option key={e} value={e}>{e}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Objeción objetivo</label>
                <input
                  value={form.objecion}
                  onChange={(e) => setForm({ ...form, objecion: e.target.value })}
                  placeholder="Ej: Está caro, Lo voy a pensar..."
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#111] text-sm focus:outline-none focus:ring-2 focus:ring-brand"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Contenido *
                  <span className="text-xs text-gray-400 ml-2">Variables: {"{nombre}"} {"{empresa}"} {"{etapa}"} {"{valor}"} {"{vendedor}"} {"{objecion}"}</span>
                </label>
                <textarea
                  rows={5}
                  value={form.contenido}
                  onChange={(e) => setForm({ ...form, contenido: e.target.value })}
                  placeholder="Escribe tu mensaje aquí..."
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#111] text-sm focus:outline-none focus:ring-2 focus:ring-brand resize-none"
                />
              </div>
              {form.contenido && (
                <div className="bg-gray-50 dark:bg-[#111] rounded-xl p-4 border border-gray-100 dark:border-gray-800">
                  <p className="text-xs text-gray-500 mb-2 font-medium">Vista previa (con datos de ejemplo):</p>
                  <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{preview}</p>
                </div>
              )}
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="favorita"
                  checked={form.favorita}
                  onChange={(e) => setForm({ ...form, favorita: e.target.checked })}
                  className="accent-brand"
                />
                <label htmlFor="favorita" className="text-sm text-gray-700 dark:text-gray-300">Marcar como favorita</label>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  onClick={cerrarModal}
                  className="px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-sm hover:bg-gray-50 dark:hover:bg-white/5 transition"
                >
                  Cancelar
                </button>
                <button
                  onClick={guardar}
                  disabled={!form.titulo || !form.contenido}
                  className="px-4 py-2 rounded-xl bg-brand text-white font-semibold text-sm hover:opacity-90 transition disabled:opacity-50"
                >
                  {editando ? "Guardar cambios" : "Crear plantilla"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
