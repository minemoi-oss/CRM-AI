import type { ReactNode } from "react"

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title: string
  children: ReactNode
}

function Modal({
  isOpen,
  onClose,
  title,
  children,
}: ModalProps) {
  if (!isOpen) {
    return null
  }

  return (
    <div
      className="
        fixed
        inset-0
        z-50
        flex
        items-center
        justify-center
        bg-black/50
        p-4
      "
      onClick={onClose}
    >

      <div
        className="
          w-full
          max-w-lg
          rounded-xl
          bg-white
          p-6
          shadow-xl
        "
        onClick={(event) => event.stopPropagation()}
      >

        <div className="mb-5 flex items-center justify-between">

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

      </div>

    </div>
  )
}

export default Modal