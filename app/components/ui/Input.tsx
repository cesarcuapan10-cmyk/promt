"use client"
import { forwardRef } from "react"
import { cn } from "@/app/lib/utils"

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  ayuda?: string
  iconoIzquierda?: React.ReactNode
  iconoDerecha?: React.ReactNode
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, ayuda, iconoIzquierda, iconoDerecha, className, id, ...props }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, "-")
    return (
      <div className="space-y-1.5">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-sm font-medium text-gray-700 dark:text-gray-300"
          >
            {label}
          </label>
        )}
        <div className="relative">
          {iconoIzquierda && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
              {iconoIzquierda}
            </div>
          )}
          <input
            ref={ref}
            id={inputId}
            className={cn(
              "w-full py-3 rounded-xl border text-gray-900 dark:text-white bg-white dark:bg-[#1a1a1a] placeholder:text-gray-400 text-base transition outline-none",
              "focus:border-brand focus:ring-2 focus:ring-brand/20",
              error
                ? "border-red-400 focus:border-red-400 focus:ring-red-200"
                : "border-gray-200 dark:border-gray-700",
              iconoIzquierda ? "pl-10" : "pl-4",
              iconoDerecha ? "pr-10" : "pr-4",
              className
            )}
            {...props}
          />
          {iconoDerecha && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
              {iconoDerecha}
            </div>
          )}
        </div>
        {ayuda && !error && (
          <p className="text-xs text-gray-500 dark:text-gray-400">{ayuda}</p>
        )}
        {error && <p className="text-xs text-red-600">{error}</p>}
      </div>
    )
  }
)
Input.displayName = "Input"

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  error?: string
  ayuda?: string
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, ayuda, className, id, ...props }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, "-")
    return (
      <div className="space-y-1.5">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-sm font-medium text-gray-700 dark:text-gray-300"
          >
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          id={inputId}
          className={cn(
            "w-full px-4 py-3 rounded-xl border text-gray-900 dark:text-white bg-white dark:bg-[#1a1a1a] placeholder:text-gray-400 text-base transition outline-none resize-none",
            "focus:border-brand focus:ring-2 focus:ring-brand/20",
            error ? "border-red-400" : "border-gray-200 dark:border-gray-700",
            className
          )}
          {...props}
        />
        {ayuda && !error && <p className="text-xs text-gray-500">{ayuda}</p>}
        {error && <p className="text-xs text-red-600">{error}</p>}
      </div>
    )
  }
)
Textarea.displayName = "Textarea"

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  error?: string
  ayuda?: string
  opciones: { valor: string; label: string }[]
}

export function Select({ label, error, ayuda, opciones, className, id, ...props }: SelectProps) {
  const inputId = id || label?.toLowerCase().replace(/\s+/g, "-")
  return (
    <div className="space-y-1.5">
      {label && (
        <label
          htmlFor={inputId}
          className="block text-sm font-medium text-gray-700 dark:text-gray-300"
        >
          {label}
        </label>
      )}
      <select
        id={inputId}
        className={cn(
          "w-full px-4 py-3 rounded-xl border text-gray-900 dark:text-white bg-white dark:bg-[#1a1a1a] text-base transition outline-none",
          "focus:border-brand focus:ring-2 focus:ring-brand/20",
          error ? "border-red-400" : "border-gray-200 dark:border-gray-700",
          className
        )}
        {...props}
      >
        {opciones.map((o) => (
          <option key={o.valor} value={o.valor}>
            {o.label}
          </option>
        ))}
      </select>
      {ayuda && !error && <p className="text-xs text-gray-500">{ayuda}</p>}
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  )
}
