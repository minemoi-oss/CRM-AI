import type { ReactNode } from "react"

interface CardProps {
  children: ReactNode
  title?: string
  description?: string
  className?: string
}

function Card({
  children,
  title,
  description,
  className = "",
}: CardProps) {
  return (
    <div
      className={`
        rounded-lg
        border
        border-slate-200
        bg-white
        p-6
        shadow-sm
        ${className}
      `}
    >

      {(title || description) && (
        <div className="mb-5">

          {title && (
            <h3 className="text-lg font-semibold text-slate-900">
              {title}
            </h3>
          )}

          {description && (
            <p className="mt-1 text-sm text-slate-500">
              {description}
            </p>
          )}

        </div>
      )}

      {children}

    </div>
  )
}

export default Card