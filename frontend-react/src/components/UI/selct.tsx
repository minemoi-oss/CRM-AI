import type {
  SelectHTMLAttributes,
  ReactNode,
} from "react"

interface SelectOption {
  value: string
  label: string
  disabled?: boolean
}

interface SelectProps
  extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  options: SelectOption[]
  errorMessage?: string
  successMessage?: string
  leftIcon?: ReactNode
}

function Select({
  label,
  options,
  errorMessage,
  successMessage,
  leftIcon,
  disabled = false,
  className = "",
  ...props
}: SelectProps) {

  const hasError = Boolean(errorMessage)
  const hasSuccess = Boolean(successMessage)

  const borderStyle = hasError
    ? `
      border-red-500
      focus:border-red-500
      focus:ring-2
      focus:ring-red-100
    `
    : hasSuccess
      ? `
        border-green-500
        focus:border-green-500
        focus:ring-2
        focus:ring-green-100
      `
      : `
        border-slate-300
        hover:border-slate-400
        focus:border-blue-500
        focus:ring-2
        focus:ring-blue-100
      `

  return (
    <div className="w-full">

      {/* LABEL */}

      {label && (
        <label className="mb-2 block text-sm font-medium text-slate-700">
          {label}
        </label>
      )}

      {/* SELECT */}

      <div className="relative">

        {/* ICÔNE */}

        {leftIcon && (
          <span
            className="
              pointer-events-none
              absolute
              left-3
              top-1/2
              z-10
              -translate-y-1/2
              text-slate-400
            "
          >
            {leftIcon}
          </span>
        )}

        <select
          {...props}
          disabled={disabled}
          aria-invalid={hasError}
          className={`
            h-10
            w-full
            appearance-none
            rounded-md
            border
            bg-white
            px-3
            pr-10
            text-sm
            text-slate-900
            outline-none
            transition-all
            duration-150

            ${borderStyle}

            ${leftIcon ? "pl-10" : ""}

            ${
              disabled
                ? `
                  cursor-not-allowed
                  border-slate-200
                  bg-slate-100
                  text-slate-400
                `
                : ""
            }

            ${className}
          `}
        >

          {/* OPTIONS */}

          {options.map((option) => (
            <option
              key={option.value}
              value={option.value}
              disabled={option.disabled}
            >
              {option.label}
            </option>
          ))}

        </select>

        {/* FLÈCHE */}

        <span
          className="
            pointer-events-none
            absolute
            right-3
            top-1/2
            -translate-y-1/2
            text-slate-400
          "
        >
          ▼
        </span>

      </div>

      {/* ERREUR */}

      {hasError && (
        <p className="mt-1 text-xs text-red-500">
          {errorMessage}
        </p>
      )}

      {/* SUCCÈS */}

      {hasSuccess && (
        <p className="mt-1 text-xs text-green-500">
          {successMessage}
        </p>
      )}

    </div>
  )
}

export default Select