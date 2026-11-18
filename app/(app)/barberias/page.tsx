import { ScanFace } from "lucide-react"
import { auth } from "@/app/lib/auth"
import { listarBarberias } from "@/app/actions/barberias"
import { formatMoney } from "@/app/lib/utils"
import { FormNuevaBarberia, FilaBarberia } from "./FormsBarberias"

export const metadata = { title: "Barberías · Visage" }
export const dynamic = "force-dynamic"

export default async function BarberiasPage() {
  const s = await auth()
  if ((s?.user as { rol?: string } | undefined)?.rol !== "ADMIN") {
    return <p className="p-6 text-gray-500">Solo el administrador puede ver esta sección.</p>
  }
  const barberias = await listarBarberias()
  const activas = barberias.filter((b) => b.activa)
  const diagnosticos = barberias.reduce((t, b) => t + b.usoMes, 0)
  const ventas = barberias.reduce((t, b) => t + b.ventasMes, 0)

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-4 md:p-6">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#d4af6a]/15">
          <ScanFace className="h-5 w-5 text-[#b8913f]" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Barberías · Visage</h1>
          <p className="text-sm text-gray-500">Da de alta a cada barbería que contrata el estudio de visagismo con IA.</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Kpi etiqueta="Barberías activas" valor={String(activas.length)} />
        <Kpi etiqueta="Diagnósticos este mes" valor={String(diagnosticos)} />
        <Kpi etiqueta="Ventas registradas por ellas" valor={formatMoney(ventas)} />
        <Kpi etiqueta="Clientes en la plataforma" valor={String(barberias.reduce((t, b) => t + b.clientes, 0))} />
      </div>

      <FormNuevaBarberia />

      <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white dark:border-gray-800 dark:bg-[#151515]">
        {barberias.length === 0 && <p className="p-8 text-center text-sm text-gray-500">Aún no hay barberías. Crea la primera arriba.</p>}
        {barberias.map((b) => (
          <FilaBarberia key={b.id} b={{ ...b, creadoEn: b.creadoEn.toISOString() }} />
        ))}
      </div>

      <p className="text-xs text-gray-400">
        La barbería entra en <b>/studio</b> con su código y PIN. Su marca, catálogo, precios y barberos los configura ella misma
        en Ajustes. Desde aquí controlas el plan, el límite mensual, el PIN y si está activa.
      </p>
    </div>
  )
}

function Kpi({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-4 dark:border-gray-800 dark:bg-[#151515]">
      <p className="text-xs text-gray-500">{etiqueta}</p>
      <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">{valor}</p>
    </div>
  )
}
