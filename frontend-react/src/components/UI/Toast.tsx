import type { ReactNode } from "react"

type ToastVariant =
  | "success"
  | "error"
  | "warning"
  | "info"

interface ToastProps {
  title: string
  message?: ReactNode
  variant?: ToastVariant
  onClose?: () => void
}

function Toast({
  title,
  message,
  variant = "info",
  onClose,
}: ToastProps) {

  const variants = {
    success: "border-green-200 bg-green-50 text-green-800",
    error: "border-red-200 bg-red-50 text-red-800",
    warning: "border-yellow-200 bg-yellow-50 text-yellow-800",
    info: "border-blue-200 bg-blue-50 text-blue-800",
  }

  return (
    <div
      className={`
        flex
        w-full
        max-w-sm
        items-start
        justify-between
        gap-4
        rounded-lg
        border
        p-4
        shadow-lg
        ${variants[variant]}
      `}
      role="alert"
    >

      <div>

        <p className="font-semibold">
          {title}
        </p>

        {message && (
          <div className="mt-1 text-sm opacity-80">
            {message}
          </div>
        )}

      </div>

      {onClose && (
        <button
          type="button"
          onClick={onClose}
          className="shrink-0 rounded p-1 hover:bg-black/5"
          aria-label="Fermer"
        >
          ✕
        </button>
      )}

    </div>
  )
}

export default Toast