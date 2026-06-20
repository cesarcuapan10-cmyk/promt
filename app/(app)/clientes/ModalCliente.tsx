"use client"

import { useState, useTransition } from "react"
import { Modal } from "@/app/components/ui/Modal"
import { Input, Textarea, Select } from "@/app/components/ui/Input"
import { Button } from "@/app/components/ui/Button"
import { crearCliente, actualizarCliente } from "@/app/actions/clientes"
import type { ClienteData } from "@/app/actions/clientes"

interface ClienteEditable {
  id: string
  nombre: string
  correo: string | null
  telefono: string | null
  whatsapp: string | null
  empresaNombre: string | null
  empresaPuesto: string | null
  etapa: string
  temperatura: string
  origen: string | null
  valorEstimado: number | null
  notas: string | null
  estadoCartera: string
}

interface Props {
  abierto: boolean
  onCerrar: () => void
  onGuardado: () => void
  cliente?: ClienteEditable | null
}

const ETAPAS = [
  { valor: "NUEVO", label: "Nuevo" },
  { valor: "CONTACTADO", label: "Contactado" },
  { valor: "CITA_AGENDADA", label: "Cita agendada" },
  { valor: "PROPUESTA_ENVIADA", label: "Propuesta enviada" },
  { valor: "NEGOCIACION", label: "Negociación" },
]

const TEMPERATURAS = [
  { valor: "CALIENTE", label: "🔥 Caliente" },
  { valor: "TIBIO", label: "🟡 Tibio" },
  { valor: "FRIO", label: "🔵 Frío" },
]

const ORIGENES = [
  { valor: "", label: "Seleccionar..." },
  { valor: "REFERIDO", label: "Referido" },
  { valor: "REDES_SOCIALES", label: "Redes sociales" },
  { valor: "BUSQUEDA_WEB", label: "Búsqueda web" },
  { valor: "EVENTO", label: "Evento" },
  { valor: "OTRO", label: "Otro" },
]

type FormState = {
  nombre: string
  correo: string
  telefono: string
  whatsapp: string
  empresaNombre: string
  empresaPuesto: string
  etapa: string
  temperatura: string
  origen: string
  valorEstimado: string
  notas: string
  estadoCartera: string
}

function estadoInicial(cliente?: ClienteEditable | null): FormState {
  return {
    nombre: cliente?.nombre ?? "",
    correo: cliente?.correo ?? "",
    telefono: cliente?.telefono ?? "",
    whatsapp: cliente?.whatsapp ?? "",
    empresaNombre: cliente?.empresaNombre ?? "",
    empresaPuesto: cliente?.empresaPuesto ?? "",
    etapa: cliente?.etapa ?? "NUEVO",
    temperatura: cliente?.temperatura ?? "TIBIO",
    origen: cliente?.origen ?? "",
    valorEstimado: cliente?.valorEstimado?.toString() ?? "",
    notas: cliente?.notas ?? "",
    estadoCartera: cliente?.estadoCartera ?? "ACTIVO",
  }
}

export function ModalCliente({ abierto, onCerrar, onGuardado, cliente }: Props) {
  const [form, setForm] = useState<FormState>(() => estadoInicial(cliente))
  const [error, setError] = useState("")
  const [pending, startTransition] = useTransition()

  function reset() {
    setForm(estadoInicial(cliente))
    setError("")
  }

  function set(campo: keyof FormState, valor: string) {
    setForm((prev) => ({ ...prev, [campo]: valor }))
  }

  function toClienteData(): ClienteData {
    return {
      nombre: form.nombre,
      correo: form.correo || null,
      telefono: form.telefono || null,
      whatsapp: form.whatsapp || form.telefono || null,
      empresaNombre: form.empresaNombre || null,
      empresaPuesto: form.empresaPuesto || null,
      etapa: form.etapa || "NUEVO",
      temperatura: form.temperatura || "TIBIO",
      origen: form.origen || null,
      valorEstimado: form.valorEstimado ? Number(form.valorEstimado) : null,
      notas: form.notas || null,
      estadoCartera: form.estadoCartera || "ACTIVO",
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.nombre.trim()) {
      setError("El nombre es obligatorio")
      return
    }
    setError("")
    startTransition(async () => {
      try {
        if (cliente?.id) {
          await actualizarCliente(cliente.id, toClienteData())
        } else {
          await crearCliente(toClienteData())
        }
        onGuardado()
        onCerrar()
      } catch (err) {
        setError(err instanceof Error ? err.message : "Ocurrió un error")
      }
    })
  }

  return (
    <Modal
      abierto={abierto}
      onCerrar={onCerrar}
      titulo={cliente ? "Editar cliente" : "Nuevo cliente"}
      tamaño="xl"
    >
      <form onSubmit={handleSubmit} className="space-y-5" onFocus={reset}>
        {/* Datos personales */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <Input
              label="Nombre *"
              value={form.nombre}
              onChange={(e) => set("nombre", e.target.value)}
              placeholder="Juan García"
              required
            />
          </div>
          <Input
            label="Correo"
            type="email"
            value={form.correo}
            onChange={(e) => set("correo", e.target.value)}
            placeholder="juan@empresa.com"
          />
          <Input
            label="Teléfono"
            type="tel"
            value={form.telefono}
            onChange={(e) => set("telefono", e.target.value)}
            placeholder="+52 33 1234 5678"
          />
          <Input
            label="WhatsApp (si difiere del teléfono)"
            type="tel"
            value={form.whatsapp}
            onChange={(e) => set("whatsapp", e.target.value)}
            placeholder="+52 33 1234 5678"
          />
        </div>

        {/* Empresa */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Empresa"
            value={form.empresaNombre}
            onChange={(e) => set("empresaNombre", e.target.value)}
            placeholder="Nombre de la empresa"
          />
          <Input
            label="Cargo / Puesto"
            value={form.empresaPuesto}
            onChange={(e) => set("empresaPuesto", e.target.value)}
            placeholder="Director de ventas"
          />
        </div>

        {/* Etapa y temperatura */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Select
            label="Etapa"
            value={form.etapa}
            onChange={(e) => set("etapa", e.target.value)}
            opciones={ETAPAS}
          />
          <Select
            label="Temperatura"
            value={form.temperatura}
            onChange={(e) => set("temperatura", e.target.value)}
            opciones={TEMPERATURAS}
          />
          <Select
            label="Origen"
            value={form.origen}
            onChange={(e) => set("origen", e.target.value)}
            opciones={ORIGENES}
          />
        </div>

        {/* Valor */}
        <Input
          label="Valor estimado (MXN)"
          type="number"
          min={0}
          value={form.valorEstimado}
          onChange={(e) => set("valorEstimado", e.target.value)}
          placeholder="0"
        />

        {/* Notas */}
        <Textarea
          label="Notas"
          value={form.notas}
          onChange={(e) => set("notas", e.target.value)}
          placeholder="Información adicional sobre el cliente..."
          rows={3}
        />

        {error && (
          <p className="text-sm text-red-600 bg-red-50 dark:bg-red-900/20 rounded-lg px-3 py-2">
            {error}
          </p>
        )}

        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variante="fantasma" onClick={onCerrar}>
            Cancelar
          </Button>
          <Button type="submit" cargando={pending}>
            {cliente ? "Guardar cambios" : "Crear cliente"}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
