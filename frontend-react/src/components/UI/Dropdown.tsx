import { useState } from "react"
import type { ReactNode } from "react"

interface DropdownItem {
  label: string
  onClick: () => void
  disabled?: boolean
}

interface DropdownProps {
  trigger: ReactNode
  items: DropdownItem[]
}

function Dropdown({
  trigger,
  items,
}: DropdownProps) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <div className="relative inline-block">

      <div onClick={() => setIsOpen(!isOpen)}>
        {trigger}
      </div>

      {isOpen && (
        <div
          className="
            absolute
            right-0
            z-40
            mt-2
            min-w-48
            rounded-lg
            border
            border-slate-200
            bg-white
            p-1
            shadow-lg
          "
        >

          {items.map((item) => (
            <button
              key={item.label}
              type="button"
              disabled={item.disabled}
              onClick={() => {
                item.onClick()
                setIsOpen(false)
              }}
              className="
                block
                w-full
                rounded-md
                px-3
                py-2
                text-left
                text-sm
                text-slate-700
                hover:bg-slate-100
                disabled:cursor-not-allowed
                disabled:opacity-50
              "
            >
              {item.label}
            </button>
          ))}

        </div>
      )}

    </div>
  )
}

export default Dropdown