import { forwardRef, type InputHTMLAttributes, type TextareaHTMLAttributes } from 'react'

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  function Input({ className = '', ...props }, ref) {
    return (
      <input
        ref={ref}
        className={`w-full rounded-lg border border-gray-300 bg-white px-3.5 py-2.5 text-sm text-gray-900 placeholder-gray-400 transition focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/30 ${className}`}
        {...props}
      />
    )
  }
)

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
}

export function Textarea({ className = '', label, ...props }: TextareaProps) {
  return (
    <div>
      {label && (
        <label className="mb-1.5 block text-sm font-medium text-gray-700">{label}</label>
      )}
      <textarea
        className={`w-full rounded-lg border border-gray-300 bg-white px-3.5 py-2.5 text-sm text-gray-900 placeholder-gray-400 transition focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/30 ${className}`}
        {...props}
      />
    </div>
  )
}

interface FieldProps {
  label: string
  error?: string
  children: React.ReactNode
}

export function Field({ label, error, children }: FieldProps) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-gray-700">{label}</label>
      {children}
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  )
}
