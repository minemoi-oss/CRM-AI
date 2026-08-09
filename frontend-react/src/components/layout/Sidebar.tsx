import type { ReactNode } from "react"

interface SidebarItem {
  label: string
  icon: ReactNode
  active?: boolean
  onClick?: () => void
}

interface SidebarProps {
  items: SidebarItem[]
  userName?: string
  userRole?: string
  userInitials?: string
}

function Sidebar({
  items,
  userName = "Marie Dupuis",
  userRole = "Admin",
  userInitials = "MD",
}: SidebarProps) {
  return (
    <aside className="flex h-full w-[187px] shrink-0 flex-col bg-[#0F172A]">

      {/* Logo */}
      <div className="flex h-[68px] items-center px-[16px]">

        <div className="flex h-[32px] w-[32px] items-center justify-center rounded-full bg-[#2563EB]">
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="white"
            strokeWidth="2"
          >
            <rect x="4" y="4" width="6" height="6" rx="1" />
            <rect x="14" y="4" width="6" height="6" rx="1" />
            <rect x="4" y="14" width="6" height="6" rx="1" />
            <rect x="14" y="14" width="6" height="6" rx="1" />
          </svg>
        </div>

        <span className="ml-[8px] text-[13px] font-semibold text-white">
          Nova CRM
        </span>

      </div>

      {/* Navigation */}
      <nav className="px-[10px]">

        <div className="flex flex-col gap-[3px]">

          {items.map((item) => (
            <button
              key={item.label}
              type="button"
              onClick={item.onClick}
              className={`
                flex
                h-[32px]
                w-full
                items-center
                rounded-[5px]
                px-[9px]
                text-left
                text-[11px]
                transition-colors

                ${
                  item.active
                    ? "bg-[#1E293B] font-semibold text-white"
                    : "font-normal text-[#94A3B8] hover:bg-[#172033]"
                }
              `}
            >
              <span className="flex h-[16px] w-[16px] items-center justify-center">
                {item.icon}
              </span>

              <span className="ml-[9px]">
                {item.label}
              </span>
            </button>
          ))}

        </div>

      </nav>

      {/* User */}
      <div className="mt-auto px-[16px] pb-[18px]">

        <div className="flex items-center">

          <div className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-full bg-[#7C3AED] text-[10px] font-semibold text-white">
            {userInitials}
          </div>

          <div className="ml-[8px] min-w-0">

            <p className="truncate text-[10px] font-semibold leading-[13px] text-white">
              {userName}
            </p>

            <p className="text-[9px] leading-[12px] text-[#94A3B8]">
              {userRole}
            </p>

          </div>

        </div>

      </div>

    </aside>
  )
}

export default Sidebar