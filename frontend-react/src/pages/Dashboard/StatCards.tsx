interface StatCardData {
  title: string
  value: string
  change: string
  changeType: "positive" | "negative"
  icon: "users" | "revenue" | "invoice" | "conversion"
}

interface StatCardsProps {
  cards: StatCardData[]
}

function StatIcon({ type }: { type: StatCardData["icon"] }) {
  if (type === "users") {
    return (
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
      >
        <circle cx="9" cy="8" r="3" />
        <path d="M3.5 19c.6-3.2 2.5-5 5.5-5s4.9 1.8 5.5 5" />
        <path d="M16 6.5c2.2.2 3.5 1.6 3.8 3.7" />
      </svg>
    )
  }

  if (type === "revenue") {
    return (
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
      >
        <path d="M12 3v18" />
        <path d="M16 7c0-2-1.8-3-4-3S8 5 8 7s1.5 3 4 4 4 2 4 4-1.8 4-4 4-4-1-4-3" />
      </svg>
    )
  }

  if (type === "invoice") {
    return (
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
      >
        <rect x="6" y="3" width="12" height="18" rx="1" />
        <path d="M9 8h6M9 12h6M9 16h3" />
      </svg>
    )
  }

  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <path d="M4 17l5-5 4 3 7-8" />
      <path d="M20 7v5h-5" />
    </svg>
  )
}

function StatCards({ cards }: StatCardsProps) {
  return (
    <div className="responsive-grid responsive-kpi-grid grid grid-cols-4 gap-[12px] max-md:grid-cols-2">

      {cards.map((card) => (
        <div
          key={card.title}
          className="
            rounded-[8px]
            border
            border-[#E2E8F0]
            bg-white
            p-[15px]
          "
        >

          <div className="flex items-start justify-between">

            <p className="text-[10px] font-medium text-[#64748B]">
              {card.title}
            </p>

            <div
              className="
                flex
                h-[30px]
                w-[30px]
                items-center
                justify-center
                rounded-[7px]
                bg-[#EFF6FF]
                text-[#2563EB]
              "
            >
              <StatIcon type={card.icon} />
            </div>

          </div>

          <p className="mt-[8px] text-[21px] font-bold leading-none text-[#0F172A]">
            {card.value}
          </p>

          <div className="mt-[8px] flex items-center gap-[5px]">

            <span
              className={`
                text-[9px]
                font-semibold
                ${
                  card.changeType === "positive"
                    ? "text-[#16A34A]"
                    : "text-[#EF4444]"
                }
              `}
            >
              {card.change}
            </span>

          </div>

        </div>
      ))}

    </div>
  )
}

export default StatCards
