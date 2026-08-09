import type { InputHTMLAttributes } from "react"

interface SwitchProps
  extends InputHTMLAttributes<HTMLInputElement> {
  label: string
}

function Switch({
  label,
  disabled = false,
  className = "",
  ...props
}: SwitchProps) {
  return (
    <label
      className={`
        flex
        items-center
        gap-3
        text-sm
        text-slate-700
        ${disabled ? "cursor-not-allowed text-slate-400" : "cursor-pointer"}
        ${className}
      `}
    >
      <span className="relative">
        <input
          {...props}
          type="checkbox"
          disabled={disabled}
          className="peer sr-only"
        />

        <span
          className="
            block
            h-6
            w-11
            rounded-full
            bg-slate-300
            transition
            peer-checked:bg-blue-600
            peer-focus:ring-2
            peer-focus:ring-blue-200
            peer-disabled:opacity-50
          "
        />

        <span
          className="
            absolute
            left-1
            top-1
            h-4
            w-4
            rounded-full
            bg-white
            transition
            peer-checked:translate-x-5
          "
        />
      </span>

      <span>{label}</span>
    </label>
  )
}

export default Switch