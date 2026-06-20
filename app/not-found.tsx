import Link from "next/link"
import { SearchX } from "lucide-react"

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950 p-6">
      <div className="text-center max-w-md">
        <div className="w-20 h-20 rounded-2xl bg-brand/10 flex items-center justify-center mx-auto mb-6">
          <SearchX className="w-10 h-10 text-brand" />
        </div>
        <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">404</h1>
        <h2 className="text-xl font-semibold text-gray-700 dark:text-gray-300 mb-3">
          No encontramos esta página
        </h2>
        <p className="text-gray-500 dark:text-gray-400 mb-8">
          La liga que abriste no existe o fue movida. No te preocupes, el resto del sistema está intacto.
        </p>
        <Link
          href="/"
          className="inline-flex items-center gap-2 px-6 py-3 bg-brand text-white font-semibold rounded-xl hover:bg-brand/90 transition-colors"
        >
          Volver al inicio
        </Link>
      </div>
    </div>
  )
}
