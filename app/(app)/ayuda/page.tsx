import { HelpCircle, Search, Plus, Star, ArrowRight, Keyboard, Coffee } from "lucide-react"
import { Card } from "@/app/components/ui/Card"

export const metadata = { title: "Ayuda · Tutorial y atajos" }

const PASOS = [
  { n: 1, titulo: "Abre 'Hoy te toca' cada mañana", desc: "Es lo primero que debes ver. Ahí están todos los clientes que necesitan atención hoy, ordenados por temperatura." },
  { n: 2, titulo: "Contacta primero a los 🔥 calientes", desc: "Escribe o llama usando el botón de WhatsApp con el mensaje pre-llenado. No improvises — el mensaje ya está pensado para cerrar." },
  { n: 3, titulo: "Registra qué pasó", desc: "Toca 'Registrar contacto' y escribe en una línea qué dijo. Esto alimenta el historial del cliente." },
  { n: 4, titulo: "Deja siempre la próxima acción", desc: "Antes de cerrar la ficha, define qué sigue y para cuándo. Un cliente sin próxima acción se enfría." },
  { n: 5, titulo: "Mueve al cliente en el embudo", desc: "Si avanzó, arrástralo a la siguiente columna. El embudo debe reflejar la realidad siempre." },
  { n: 6, titulo: "Repite mañana", desc: "El sistema recuerda por ti. Solo tienes que abrir 'Hoy te toca' y seguir el ritual." },
]

const ATAJOS = [
  { teclas: ["/"], desc: "Abrir el buscador global" },
  { teclas: ["Ctrl", "K"], desc: "Abrir el buscador (alternativo)" },
  { teclas: ["N"], desc: "Nuevo cliente" },
  { teclas: ["?"], desc: "Ver esta lista de atajos" },
  { teclas: ["Esc"], desc: "Cerrar modales y buscador" },
]

export default function AyudaPage() {
  return (
    <div className="p-4 md:p-6 space-y-6 max-w-3xl mx-auto">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-brand/10 flex items-center justify-center">
          <HelpCircle className="w-5 h-5 text-brand" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Ayuda y Tutorial</h1>
          <p className="text-sm text-gray-500">Todo lo que necesitas para vender más con este CRM</p>
        </div>
      </div>

      {/* Ritual diario */}
      <Card>
        <div className="flex items-center gap-2 mb-4">
          <Coffee className="w-5 h-5 text-brand" />
          <h2 className="font-semibold text-gray-900 dark:text-white">Tu ritual diario de ventas</h2>
        </div>
        <div className="space-y-3">
          {PASOS.map(p => (
            <div key={p.n} className="flex gap-3">
              <div className="w-7 h-7 rounded-full bg-brand text-white text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                {p.n}
              </div>
              <div>
                <p className="font-medium text-gray-900 dark:text-white text-sm">{p.titulo}</p>
                <p className="text-sm text-gray-500 mt-0.5">{p.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Atajos */}
      <Card>
        <div className="flex items-center gap-2 mb-4">
          <Keyboard className="w-5 h-5 text-brand" />
          <h2 className="font-semibold text-gray-900 dark:text-white">Atajos de teclado</h2>
        </div>
        <div className="space-y-2">
          {ATAJOS.map((a, i) => (
            <div key={i} className="flex items-center justify-between py-2 border-b border-gray-50 dark:border-gray-800 last:border-0">
              <span className="text-sm text-gray-700 dark:text-gray-300">{a.desc}</span>
              <div className="flex gap-1">
                {a.teclas.map(t => (
                  <kbd key={t} className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-800 rounded-lg font-mono text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700">
                    {t}
                  </kbd>
                ))}
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* FAQ */}
      <Card className="space-y-4">
        <h2 className="font-semibold text-gray-900 dark:text-white">Preguntas frecuentes</h2>
        {[
          { q: "¿Cómo agrego un nuevo cliente?", a: "Usa el botón '+' en la barra de navegación, o presiona la tecla N desde cualquier pantalla." },
          { q: "¿Cómo muevo un cliente en el embudo?", a: "Ve a la sección Embudo y arrastra la tarjeta del cliente a la columna correcta." },
          { q: "¿Cómo registro un pago?", a: "Entra al expediente del cliente → Tab Pagos → Registrar pago. O desde la sección Pagos del menú." },
          { q: "¿Qué significa 🔴 'próxima acción vencida'?", a: "Que ya pasó la fecha que te pusiste para contactar a ese cliente. Atiéndelo hoy — los clientes sin seguimiento se pierden." },
          { q: "¿Puedo recuperar un cliente perdido o archivado?", a: "Sí. En la sección Perdidos o Archivados, cada cliente tiene un botón 'Reactivar' o 'Restaurar'." },
        ].map((faq, i) => (
          <details key={i} className="group">
            <summary className="flex justify-between items-center cursor-pointer py-2 text-sm font-medium text-gray-900 dark:text-white">
              {faq.q}
              <ArrowRight className="w-4 h-4 text-gray-400 group-open:rotate-90 transition-transform" />
            </summary>
            <p className="text-sm text-gray-500 pb-2 pl-0">{faq.a}</p>
          </details>
        ))}
      </Card>
    </div>
  )
}
