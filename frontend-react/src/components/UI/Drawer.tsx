import type { ReactNode } from "react"

interface DrawerProps {
  isOpen: boolean
  onClose: () => void
  title: string
  children: ReactNode
}

function Drawer({
  isOpen,
  onClose,
  title,
  children,
}: DrawerProps) {
  if (!isOpen) {
    return null
  }

  return (
    <div className="fixed inset-0 z-50">

      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />

      <aside
        className="
          absolute
          right-0
          top-0
          h-full
          w-full
          max-w-md
          overflow-y-auto
          bg-white
          p-6
          shadow-xl
        "
      >

        <div className="mb-6 flex items-center justify-between">

          <h2 className="text-lg font-semibold text-slate-900">
            {title}
          </h2>

          <button
            type="button"
            onClick={onClose}
            className="
              rounded-md
              p-2
              text-slate-400
              hover:bg-slate-100
              hover:text-slate-700
            "
            aria-label="Fermer"
          >
            ✕
          </button>

        </div>

        {children}

      </aside>

    </div>
  )
}

export default Drawer