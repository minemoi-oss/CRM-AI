import type { ReactNode } from "react"

type AlertVariant =
  | "info"
  | "success"
  | "warning"
  | "danger"

interface AlertProps {
  children: ReactNode
  title?: string
  variant?: AlertVariant
}

function Alert({
  children,
  title,
  variant = "info",
}: AlertProps) {

  const variants = {
    info: "border-blue-200 bg-blue-50 text-blue-800",
    success: "border-green-200 bg-green-50 text-green-800",
    warning: "border-yellow-200 bg-yellow-50 text-yellow-800",
    danger: "border-red-200 bg-red-50 text-red-800",
  }

  return (
    <div
      className={`
        rounded-lg
        border
        p-4
        text-sm
        ${variants[variant]}
      `}
      role="alert"
    >

      {title && (
        <p className="mb-1 font-semibold">
          {title}
        </p>
      )}

      <div>
        {children}
      </div>

    </div>
  )
}

export default Alert