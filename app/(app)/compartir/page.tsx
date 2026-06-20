import { Share2 } from "lucide-react"
import { CompartirCliente } from "./CompartirCliente"

export const metadata = { title: "Comparte y crece" }

export default function CompartirPage() {
  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: "#e8b76320" }}>
          <Share2 className="w-5 h-5" style={{ color: "#e8b763" }} />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Comparte y crece</h1>
          <p className="text-sm text-gray-500">Difunde tu landing y mide qué canal vende</p>
        </div>
      </div>
      <CompartirCliente />
    </div>
  )
}
