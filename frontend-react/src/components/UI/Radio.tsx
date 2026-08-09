import type { InputHTMLAttributes } from "react"

interface RadioProps
  extends InputHTMLAttributes<HTMLInputElement> {
  label: string
}

function Radio({
  label,
  disabled = false,
  className = "",
  ...props
}: RadioProps) {
  return (
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
        type="radio"
        disabled={disabled}
        className="
          h-4
          w-4
          cursor-pointer
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
  )
}

export default Radio