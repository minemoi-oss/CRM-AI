import type { InputHTMLAttributes } from "react"

interface CheckboxProps
  extends InputHTMLAttributes<HTMLInputElement> {
  label: string
  errorMessage?: string
}

function Checkbox({
  label,
  errorMessage,
  disabled = false,
  className = "",
  ...props
}: CheckboxProps) {
  return (
    <div className="flex flex-col gap-1">

      <label
        className={`
          flex
          items-center
          gap-2
          text-sm
          text-slate-700
          ${disabled ? "cursor-not-allowed text-slate-400" : "cursor-pointer"}
          ${className}
        `}
      >

        <input
          {...props}
          type="checkbox"
          disabled={disabled}
          className="
            h-4
            w-4
            cursor-pointer
            rounded
            border-slate-300
            text-blue-600
            accent-blue-600
            focus:ring-2
            focus:ring-blue-100
            disabled:cursor-not-allowed
            disabled:opacity-60
          "
        />

        <span>{label}</span>

      </label>

      {errorMessage && (
        <p className="text-xs text-red-500">
          {errorMessage}
        </p>
      )}

    </div>
  )
}

export default Checkbox