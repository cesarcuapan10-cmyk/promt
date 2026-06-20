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
  { valor: "PROSPECTO", label: "Prospecto" },
  { valor: "CONTACTADO", label: "Contactado" },
  { valor: "PROPUESTA", label: "Propuesta" },
  { valor: "NEGOCIACION", label: "Negociación" },
  { valor: "GANADO", label: "Ganado" },
  { valor: "PERDIDO", label: "Perdido" },
]

const TEMPERATURAS = [
  { valor: "CALIENTE", label: "Caliente" },
  { valor: "TIBIO", label: "Tibio" },
  { valor: "FRIO", label: "Frío" },
]

const ORIGENES = [
  { valor: "", label: "Seleccionar..." },
  { valor: "REFERIDO", label: "Referido" },
  { valor: "REDES_SOCIALES", label: "Redes sociales" },
  { valor: "BUSQUEDA_WEB", label: "Búsqueda web" },
  { valor: "EVENTO", label: "Evento" },
  { valor: "OTRO", label: "Otro" },
]

const MONEDAS = [
  { valor: "MXN", label: "MXN" },
  { valor: "USD", label: "USD" },
]

function estadoInicial(cliente?: ClienteEditable | null): ClienteData {
  return {
    nombre: cliente?.nombre ?? "",
    correo: cliente?.correo ?? "",
    telefono: cliente?.telefono ?? "",
    empresa: cliente?.empresaNombre ?? "",
    cargo: cliente?.empresaPuesto ?? "",
    etapa: cliente?.etapa ?? "NUEVO",
    temperatura: cliente?.temperatura ?? "TIBIO",
    origen: cliente?.origen ?? "",
    presupuesto: cliente?.valorEstimado ?? undefined,
    moneda: "MXN",
    notas: cliente?.notas ?? "",
    estadoCartera: cliente?.estadoCartera ?? "ACTIVO",
  }
}

export function ModalCliente({ abierto, onCerrar, onGuardado, cliente }: Props) {
  const [form, setForm] = useState<ClienteData>(() => estadoInicial(cliente))
  const [error, setError] = useState("")
  const [pending, startTransition] = useTransition()

  // Reset form when cliente changes
  const handleOpen = () => {
    setForm(estadoInicial(cliente))
    setError("")
  }

  function set(campo: keyof ClienteData, valor: string | number | undefined) {
    setForm((prev) => ({ ...prev, [campo]: valor }))
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
          await actualizarCliente(cliente.id, form)
        } else {
          await crearCliente(form)
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
      <form onSubmit={handleSubmit} className="space-y-5" onFocus={handleOpen}>
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
            value={form.correo ?? ""}
            onChange={(e) => set("correo", e.target.value)}
            placeholder="juan@empresa.com"
          />
          <Input
            label="Teléfono"
            type="tel"
            value={form.telefono ?? ""}
            onChange={(e) => set("telefono", e.target.value)}
            placeholder="+52 55 1234 5678"
          />
        </div>

        {/* Empresa */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Empresa"
            value={form.empresa ?? ""}
            onChange={(e) => set("empresa", e.target.value)}
            placeholder="Nombre de la empresa"
          />
          <Input
            label="Cargo"
            value={form.cargo ?? ""}
            onChange={(e) => set("cargo", e.target.value)}
            placeholder="Director de ventas"
          />
        </div>

        {/* Etapa y temperatura */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Select
            label="Etapa"
            value={form.etapa ?? "NUEVO"}
            onChange={(e) => set("etapa", e.target.value)}
            opciones={ETAPAS}
          />
          <Select
            label="Temperatura"
            value={form.temperatura ?? "TIBIO"}
            onChange={(e) => set("temperatura", e.target.value)}
            opciones={TEMPERATURAS}
          />
          <Select
            label="Origen"
            value={form.origen ?? ""}
            onChange={(e) => set("origen", e.target.value)}
            opciones={ORIGENES}
          />
        </div>

        {/* Presupuesto */}
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Presupuesto"
            type="number"
            min={0}
            value={form.presupuesto ?? ""}
            onChange={(e) =>
              set("presupuesto", e.target.value ? Number(e.target.value) : undefined)
            }
            placeholder="0"
          />
          <Select
            label="Moneda"
            value={form.moneda ?? "MXN"}
            onChange={(e) => set("moneda", e.target.value)}
            opciones={MONEDAS}
          />
        </div>

        {/* Notas */}
        <Textarea
          label="Notas"
          value={form.notas ?? ""}
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
