import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { CalendarPlus, Check, MessageCircle, Sparkles } from "lucide-react"
import { db } from "@/app/lib/db"
import { asegurarEsquemaVisage, json } from "@/app/studio/lib/servidor"
import { ETIQUETA_CRANEO, ETIQUETA_FORMA, type TDiagnostico } from "@/app/studio/lib/esquema"
import { AntesDespues } from "@/app/studio/components/AntesDespues"
import "@/app/studio/studio.css"

export const dynamic = "force-dynamic"

async function cargar(token: string) {
  await asegurarEsquemaVisage()
  return db.diagnosticoVisage.findUnique({
    where: { token },
    include: { barberia: true, cliente: { select: { nombre: true } } },
  })
}

export async function generateMetadata({ params }: PageProps<"/v/[token]">): Promise<Metadata> {
  const d = await cargar((await params).token)
  if (!d) return { title: "Diagnóstico" }
  return {
    title: `Tu diagnóstico de estilo · ${d.barberia.nombre}`,
    description: "Rostro, cráneo y cabello analizados con IA, con el corte que mejor te queda.",
    robots: { index: false, follow: false },
  }
}

export default async function DiagnosticoCliente({ params }: PageProps<"/v/[token]">) {
  const d = await cargar((await params).token)
  if (!d || !d.barberia.activa) notFound()

  const b = d.barberia
  const diag = json<TDiagnostico | null>(d.diagnostico, null)
  if (!diag) notFound()
  const sims = json<Record<string, string>>(d.simulaciones, {})
  const elegido = d.corteElegido && /^\d$/.test(d.corteElegido) ? Number(d.corteElegido) : null
  const corte = elegido !== null ? diag.recomendaciones[elegido] : diag.recomendaciones[0]
  const despues = d.fotoReal ?? (elegido !== null ? sims[String(elegido)] : undefined) ?? sims["0"]
  const color = b.colorMarca || "#d4af6a"
  const wa = b.whatsapp
    ? `https://wa.me/52${b.whatsapp.slice(-10)}?text=${encodeURIComponent(`Hola, quiero agendar mi ${corte.nombre}. Vengo de mi diagnóstico de estilo.`)}`
    : null

  return (
    <main className="studio min-h-screen" style={{ ["--marca" as string]: color }}>
      <div className="mx-auto max-w-2xl px-4 pb-16 pt-[max(1.5rem,env(safe-area-inset-top))]">
        <header className="mb-6 flex items-center gap-3">
          {b.logo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={b.logo} alt={b.nombre} className="h-12 w-12 rounded-xl object-cover" />
          ) : (
            <span className="flex h-12 w-12 items-center justify-center rounded-xl text-lg font-bold text-black" style={{ background: color }}>
              {b.nombre.slice(0, 1)}
            </span>
          )}
          <div>
            <p className="font-semibold">{b.nombre}</p>
            <p className="text-xs uppercase tracking-[0.2em] text-white/40">Diagnóstico de estilo con IA</p>
          </div>
        </header>

        <h1 className="text-3xl font-semibold leading-tight">
          {d.cliente.nombre.split(" ")[0]}, este es el corte que mejor te queda
        </h1>
        <p className="mt-2 text-white/50">{d.creadoEn.toLocaleDateString("es-MX", { day: "numeric", month: "long", year: "numeric" })}</p>

        <div className="mt-6">
          {despues ? (
            <AntesDespues antes={d.fotoFrente} despues={despues} alt={corte.nombre} />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={d.fotoFrente} alt="Tu foto" className="w-full rounded-2xl" />
          )}
          {d.fotoReal && <p className="mt-2 text-center text-xs text-white/40">Después real, tomado al terminar tu servicio</p>}
        </div>

        <section className="mt-8 rounded-2xl border border-white/10 bg-white/[0.03] p-5">
          <p className="text-xs uppercase tracking-[0.2em] text-white/40">Tu corte</p>
          <h2 className="mt-1 text-2xl font-semibold" style={{ color }}>{corte.nombre}</h2>
          <p className="mt-3 text-white/80">{corte.porQueFunciona}</p>
          <p className="mt-3 flex gap-2 text-sm" style={{ color }}>
            <Sparkles className="mt-0.5 h-4 w-4 shrink-0" /> {corte.efectoOptico}
          </p>
        </section>

        <section className="mt-4 grid gap-3 sm:grid-cols-3">
          <Dato titulo="Rostro" valor={ETIQUETA_FORMA[diag.rostro.forma]} />
          <Dato titulo="Cráneo" valor={ETIQUETA_CRANEO[diag.craneo.tipo].split(" (")[0]} />
          <Dato titulo="Cabello" valor={`Tipo ${diag.cabello.tipoRizo}, ${diag.cabello.grosor}`} />
        </section>

        <section className="mt-4 rounded-2xl border border-white/10 bg-white/[0.03] p-5">
          <p className="text-white/80">{diag.resumenCliente}</p>
        </section>

        <section className="mt-4 rounded-2xl border border-white/10 bg-white/[0.03] p-5">
          <h3 className="mb-3 font-semibold">Tu rutina en casa</h3>
          <ul className="space-y-2 text-sm text-white/75">
            {diag.cuidadoEnCasa.map((c) => (
              <li key={c} className="flex gap-2">
                <Check className="mt-0.5 h-4 w-4 shrink-0" style={{ color }} /> {c}
              </li>
            ))}
          </ul>
          {diag.productosRecomendados?.length > 0 && (
            <>
              <h4 className="mb-2 mt-5 text-sm font-semibold">Productos recomendados para ti</h4>
              <ul className="space-y-2 text-sm">
                {diag.productosRecomendados.map((p) => (
                  <li key={p.producto} className="flex justify-between gap-3">
                    <span>
                      {p.producto}
                      <span className="block text-white/50">{p.motivo}</span>
                    </span>
                    {p.precio ? <span className="shrink-0 text-white/70">${p.precio}</span> : null}
                  </li>
                ))}
              </ul>
            </>
          )}
        </section>

        <section className="mt-6 rounded-2xl p-5 text-black" style={{ background: color }}>
          <p className="text-sm font-medium opacity-70">Para que tu corte se vea siempre así</p>
          <p className="text-xl font-semibold">
            {d.proximaVisita
              ? `Tu próxima visita: ${d.proximaVisita.toLocaleDateString("es-MX", { weekday: "long", day: "numeric", month: "long" })}`
              : `Regresa cada ${corte.fichaTecnica.mantenimientoSemanas} semanas`}
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {b.enlaceAgenda && (
              <a href={b.enlaceAgenda} className="flex items-center gap-2 rounded-full bg-black px-4 py-2 text-sm font-semibold text-white">
                <CalendarPlus className="h-4 w-4" /> Agendar
              </a>
            )}
            {wa && (
              <a href={wa} className="flex items-center gap-2 rounded-full bg-black/15 px-4 py-2 text-sm font-semibold">
                <MessageCircle className="h-4 w-4" /> WhatsApp
              </a>
            )}
          </div>
        </section>

        <p className="mt-8 text-center text-xs text-white/30">
          Análisis con medición facial de 478 puntos e IA. Criterio profesional de estilo, no diagnóstico médico.
          {b.instagram ? ` · @${b.instagram}` : ""}
        </p>
      </div>
    </main>
  )
}

function Dato({ titulo, valor }: { titulo: string; valor: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
      <p className="text-[11px] uppercase tracking-[0.2em] text-white/40">{titulo}</p>
      <p className="mt-1 font-semibold">{valor}</p>
    </div>
  )
}
