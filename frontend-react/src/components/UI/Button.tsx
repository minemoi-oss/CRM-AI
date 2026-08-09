import type {
  ButtonHTMLAttributes,
  ReactNode,
} from "react"

type ButtonVariant =
  | "primary"
  | "secondary"
  | "outline"
  | "ghost"
  | "danger"
  | "success"

type ButtonSize = "xs" | "sm" | "md" | "lg" | "xl"

interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  loading?: boolean
  fullWidth?: boolean
  iconOnly?: boolean
  icon?: ReactNode
  children?: ReactNode
}

function Button({
  variant = "primary",
  size = "md",
  loading = false,
  fullWidth = false,
  iconOnly = false,
  icon,
  children,
  disabled,
  className = "",
  ...props
}: ButtonProps) {

  /*
   * STYLE DE BASE
   *
   * Ces classes sont communes à tous les boutons.
   */
  const baseStyles = `
    inline-flex
    items-center
    justify-center
    gap-2
    font-medium
    whitespace-nowrap
    transition-all
    duration-150
    focus:outline-none
    focus-visible:ring-2
    focus-visible:ring-blue-500
    focus-visible:ring-offset-2
    disabled:cursor-not-allowed
  `

  /*
   * VARIANTES
   *
   * Chaque variante correspond
   * à une ligne de ton Design System.
   */
  const variants = {

    primary: `
      bg-blue-600
      text-white
      hover:bg-blue-700
      active:bg-blue-800
      disabled:bg-blue-300
      disabled:text-white
    `,

    secondary: `
      bg-slate-100
      text-slate-900
      hover:bg-slate-200
      active:bg-slate-300
      disabled:bg-slate-50
      disabled:text-slate-400
    `,

    outline: `
      border
      border-slate-300
      bg-white
      text-slate-900
      hover:bg-slate-50
      active:bg-slate-100
      disabled:border-slate-200
      disabled:text-slate-400
    `,

    ghost: `
      bg-transparent
      text-slate-900
      hover:bg-slate-100
      active:bg-slate-200
      disabled:text-slate-400
    `,

    danger: `
      bg-red-500
      text-white
      hover:bg-red-600
      active:bg-red-700
      disabled:bg-red-200
      disabled:text-white
    `,

    success: `
      bg-green-500
      text-white
      hover:bg-green-600
      active:bg-green-700
      disabled:bg-green-200
      disabled:text-white
    `,
  }

  /*
   * TAILLES
   */
  const sizes = {

    xs: `
      h-7
      px-3
      text-xs
      rounded-md
    `,

    sm: `
      h-8
      px-4
      text-sm
      rounded-md
    `,

    md: `
      h-10
      px-5
      text-sm
      rounded-md
    `,

    lg: `
      h-11
      px-6
      text-base
      rounded-md
    `,

    xl: `
      h-12
      px-7
      text-base
      rounded-md
    `,
  }

  /*
   * TAILLE POUR ICON BUTTON
   *
   * Un Icon Button doit être carré.
   */
  const iconSizes = {

    xs: "h-7 w-7 p-0",

    sm: "h-8 w-8 p-0",

    md: "h-10 w-10 p-0",

    lg: "h-11 w-11 p-0",

    xl: "h-12 w-12 p-0",
  }

  /*
   * FULL WIDTH
   */
  const width = fullWidth ? "w-full" : ""

  /*
   * Si loading = true,
   * le bouton devient automatiquement disabled.
   */
  const isDisabled = disabled || loading

  return (
    <button
      {...props}
      disabled={isDisabled}
      className={`
        ${baseStyles}
        ${variants[variant]}
        ${iconOnly ? iconSizes[size] : sizes[size]}
        ${width}
        ${className}
      `}
    >

      {/* LOADING */}

      {loading && (
        <span
          className="
            h-4
            w-4
            animate-spin
            rounded-full
            border-2
            border-current
            border-t-transparent
          "
          aria-hidden="true"
        />
      )}

      {/* ICON */}

      {!loading && icon && (
        <span
          className="shrink-0"
          aria-hidden="true"
        >
          {icon}
        </span>
      )}

      {/* TEXTE */}

      {!loading && !iconOnly && children}

      {/* LOADING TEXT */}

      {loading && !iconOnly && (
        <span>
          Loading...
        </span>
      )}

    </button>
  )
}

export default Button