import type {
  InputHTMLAttributes,
  ReactNode,
  TextareaHTMLAttributes,
} from "react"

type InputState =
  | "default"
  | "focus"
  | "error"
  | "success"
  | "disabled"


interface InputProps
  extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  state?: InputState
  errorMessage?: string
  successMessage?: string
  leftIcon?: ReactNode
  rightIcon?: ReactNode
}

interface TextareaProps
  extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  errorMessage?: string
  successMessage?: string
  leftIcon?: ReactNode
  rightIcon?: ReactNode
}

function Input({
  label,
  state = "default",
  errorMessage,
  successMessage,
  leftIcon,
  rightIcon,
  disabled,
  className = "",
  ...props
}: InputProps) {
  /*
   * Si disabled est true,
   * on force automatiquement l'état disabled.
   */
  const currentState = disabled ? "disabled" : state

  /*
   * Styles de base.
   */
  const baseStyles = `
    w-full
    h-10
    rounded-md
    border
    bg-white
    px-3
    text-sm
    text-slate-900
    placeholder:text-slate-400
    transition-all
    duration-150
    outline-none
  `

  /*
   * Styles selon l'état.
   */
  const stateStyles = {
    default: `
      border-slate-300
      hover:border-slate-400
      focus:border-blue-500
      focus:ring-2
      focus:ring-blue-100
    `,

    focus: `
      border-blue-500
      ring-2
      ring-blue-100
    `,

    error: `
      border-red-500
      focus:border-red-500
      focus:ring-2
      focus:ring-red-100
    `,

    success: `
      border-green-500
      focus:border-green-500
      focus:ring-2
      focus:ring-green-100
    `,

    disabled: `
      border-slate-200
      bg-slate-100
      text-slate-400
      placeholder:text-slate-400
      cursor-not-allowed
    `,
  }

  return (
    <div className="w-full">
      {label && (
        <label className="mb-2 block text-sm font-medium text-slate-700">
          {label}
        </label>
      )}

      <div className="relative">

        {/* Icône gauche */}

        {leftIcon && (
          <span
            className="
              pointer-events-none
              absolute
              left-3
              top-1/2
              -translate-y-1/2
              text-slate-400
            "
          >
            {leftIcon}
          </span>
        )}

        <input
          {...props}
          type={props.type || "text"}
          disabled={currentState === "disabled"}
          aria-invalid={currentState === "error"}
          className={`
            ${baseStyles}
            ${stateStyles[currentState]}
            ${leftIcon ? "pl-10" : ""}
            ${rightIcon ? "pr-10" : ""}
            ${className}
          `}
        />

        {/* Icône droite */}

        {rightIcon && (
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
            {rightIcon}
          </span>
        )}
      </div>

      {/* Message d'erreur */}

      {currentState === "error" && errorMessage && (
        <p className="mt-1 text-xs text-red-500">
          {errorMessage}
        </p>
      )}

      {/* Message de succès */}

      {currentState === "success" && successMessage && (
        <p className="mt-1 text-xs text-green-500">
          {successMessage}
        </p>
      )}
    </div>
  )
}


/*
 * TEXTAREA
 */

export function Textarea({
  label,
  errorMessage,
  successMessage,
  leftIcon,
  rightIcon,
  disabled,
  className = "",
  ...props
}: TextareaProps) {

  const hasError = Boolean(errorMessage)
  const hasSuccess = Boolean(successMessage)

  const stateStyles = hasError
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
          focus:border-blue-500
          focus:ring-2
          focus:ring-blue-100
        `

  return (
    <div className="w-full">

      {label && (
        <label className="mb-2 block text-sm font-medium text-slate-700">
          {label}
        </label>
      )}

      <div className="relative">

        {leftIcon && (
          <span
            className="
              pointer-events-none
              absolute
              left-3
              top-3
              text-slate-400
            "
          >
            {leftIcon}
          </span>
        )}

        <textarea
          {...props}
          disabled={disabled}
          aria-invalid={hasError}
          className={`
            min-h-24
            w-full
            resize-y
            rounded-md
            border
            bg-white
            px-3
            py-2
            text-sm
            text-slate-900
            placeholder:text-slate-400
            outline-none
            transition-all
            duration-150

            ${stateStyles}

            ${disabled
              ? "cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400"
              : ""
            }

            ${leftIcon ? "pl-10" : ""}
            ${rightIcon ? "pr-10" : ""}
            ${className}
          `}
        />

        {rightIcon && (
          <span
            className="
              pointer-events-none
              absolute
              right-3
              top-3
              text-slate-400
            "
          >
            {rightIcon}
          </span>
        )}
      </div>

      {hasError && (
        <p className="mt-1 text-xs text-red-500">
          {errorMessage}
        </p>
      )}

      {hasSuccess && (
        <p className="mt-1 text-xs text-green-500">
          {successMessage}
        </p>
      )}

    </div>
  )
}

export default Input