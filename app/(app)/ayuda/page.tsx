import { HelpCircle, Phone, MessageSquare, FileText, Calendar, CreditCard, Users, Target, BarChart2, RefreshCw } from "lucide-react"
import Link from "next/link"
import { Card } from "@/app/components/ui/Card"
import { marcarOnboardingCompletado } from "@/app/actions/perfil"
import { redirect } from "next/navigation"

export const metadata = { title: "Ayuda" }

const RITUAL = [
  {
    num: 1,
    icon: Target,
    titulo: "Abre 'Seguimiento → Hoy te toca'",
    desc: "Los calientes primero",
  },
  {
    num: 2,
    icon: Phone,
    titulo: "Llama o escribe con el botón de WhatsApp ya armado",
    desc: "Un clic y ya",
  },
  {
    num: 3,
    icon: FileText,
    titulo: "Registra lo que pasó en el expediente",
    desc: "Historial limpio",
  },
  {
    num: 4,
    icon: Calendar,
    titulo: "Deja la próxima acción y fecha",
    desc: "Nunca dejes a nadie sin siguiente paso",
  },
  {
    num: 5,
    icon: CreditCard,
    titulo: "Revisa tus pagos vencidos",
    desc: "Cobrar es la venta más fácil",
  },
]

const ATAJOS = [
  { atajo: "Ctrl+K o /", que: "Abre el buscador global" },
  { atajo: "N", que: "Nuevo cliente" },
  { atajo: "?", que: "Lista de atajos" },
]

const SECCIONES = [
  { href: "/seguimiento", icon: Target, titulo: "Seguimiento", desc: "Ver a quién te toca contactar hoy" },
  { href: "/clientes", icon: Users, titulo: "Clientes", desc: "Toda tu cartera de prospectos" },
  { href: "/pagos", icon: CreditCard, titulo: "Pagos", desc: "Historial de cobros y pendientes" },
  { href: "/agenda", icon: Calendar, titulo: "Agenda", desc: "Tus citas y recordatorios" },
  { href: "/equipo", icon: BarChart2, titulo: "Equipo", desc: "Ranking y metas del equipo" },
]

async function relanzarTour() {
  "use server"
  await marcarOnboardingCompletado(false)
  redirect("/")
}

export default function AyudaPage() {
  return (
    <div className="p-4 md:p-6 space-y-8 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: "#e8b76320" }}>
          <HelpCircle className="w-5 h-5" style={{ color: "#e8b763" }} />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Ayuda</h1>
          <p className="text-sm text-gray-500">Aprende a usar tu CRM para vender más</p>
        </div>
      </div>

      {/* Tu ritual diario */}
      <Card>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-5">Tu ritual diario ☀️</h2>
        <div className="space-y-4">
          {RITUAL.map(({ num, icon: Icon, titulo, desc }) => (
            <div key={num} className="flex items-start gap-4">
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 font-bold text-sm"
                style={{ backgroundColor: "#e8b76320", color: "#e8b763" }}
              >
                {num}
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">{titulo}</p>
                <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-1">
                  <Icon size={12} />
                  {desc}
                </p>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Atajos de teclado */}
      <Card>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Atajos de teclado ⌨️</h2>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-500 border-b dark:border-gray-800">
              <th className="pb-3 font-medium">Atajo</th>
              <th className="pb-3 font-medium">Qué hace</th>
            </tr>
          </thead>
          <tbody className="divide-y dark:divide-gray-800">
            {ATAJOS.map(({ atajo, que }) => (
              <tr key={atajo}>
                <td className="py-3">
                  <kbd className="px-2 py-1 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-mono text-xs border border-gray-200 dark:border-gray-700">
                    {atajo}
                  </kbd>
                </td>
                <td className="py-3 text-gray-600 dark:text-gray-400">{que}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      {/* Secciones del CRM */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Secciones del CRM</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {SECCIONES.map(({ href, icon: Icon, titulo, desc }) => (
            <Link key={href} href={href}>
              <Card hover className="flex items-center gap-3">
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: "#e8b76320" }}
                >
                  <Icon size={18} style={{ color: "#e8b763" }} />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">{titulo}</p>
                  <p className="text-xs text-gray-500">{desc}</p>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      </div>

      {/* Relanzar tour */}
      <Card>
        <div className="flex items-center gap-4">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: "#e8b76320" }}
          >
            <RefreshCw size={18} style={{ color: "#e8b763" }} />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-900 dark:text-white">Ver el tutorial de nuevo</p>
            <p className="text-xs text-gray-500">Relanza el tour de bienvenida paso a paso</p>
          </div>
          <form action={relanzarTour}>
            <button
              type="submit"
              className="px-4 py-2.5 rounded-xl border border-brand text-brand text-sm font-medium hover:bg-brand/5 transition min-h-[44px]"
            >
              Ver tutorial
            </button>
          </form>
        </div>
      </Card>
    </div>
  )
}
