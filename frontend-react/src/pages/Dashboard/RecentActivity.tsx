interface Activity {
  id: number | string
  title: string
  description: string
  time: string
  type: "client" | "payment" | "invoice" | "email"
}

interface RecentActivityProps {
  activities: Activity[]
}

function ActivityIcon({
  type,
}: {
  type: Activity["type"]
}) {
  if (type === "client") {
    return (
      <svg
        width="15"
        height="15"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
      >
        <circle cx="12" cy="8" r="3" />
        <path d="M5 20c.7-3.5 3-5.5 7-5.5s6.3 2 7 5.5" />
      </svg>
    )
  }

  if (type === "payment") {
    return (
      <svg
        width="15"
        height="15"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
      >
        <rect x="3" y="5" width="18" height="14" rx="2" />
        <path d="M3 10h18" />
        <path d="M7 15h3" />
      </svg>
    )
  }

  if (type === "invoice") {
    return (
      <svg
        width="15"
        height="15"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
      >
        <path d="M6 3h12v18l-3-2-3 2-3-2-3 2V3Z" />
        <path d="M9 8h6" />
        <path d="M9 12h6" />
      </svg>
    )
  }

  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="m4 7 8 6 8-6" />
    </svg>
  )
}

function RecentActivity({
  activities,
}: RecentActivityProps) {
  const [expanded, setExpanded] = useState(false)
  const visibleActivities = expanded ? activities : activities.slice(0, 4)

  return (
    <div className="rounded-[8px] border border-[#E2E8F0] bg-white p-[16px]">

      {/* HEADER */}

      <div className="flex items-center justify-between">

        <h3 className="text-[12px] font-semibold text-[#0F172A]">
          Activité récente
        </h3>

        {activities.length > 4 && (
          <button type="button" onClick={() => setExpanded((value) => !value)} className="text-[9px] font-medium text-[#2563EB] hover:text-[#1D4ED8]">
            {expanded ? "Réduire" : "Voir tout"}
          </button>
        )}

      </div>


      {/* ACTIVITIES */}

      <div className="mt-[14px]">

        {activities.length === 0 && <p className="py-[24px] text-center text-[10px] text-[#94A3B8]">Aucune activité récente.</p>}
        {visibleActivities.map((activity) => (
          <div
            key={activity.id}
            className="
              flex
              items-center
              border-b
              border-[#F1F5F9]
              py-[9px]
              last:border-0
            "
          >

            {/* ICON */}

            <div
              className="
                flex
                h-[30px]
                w-[30px]
                shrink-0
                items-center
                justify-center
                rounded-full
                bg-[#EFF6FF]
                text-[#2563EB]
              "
            >
              <ActivityIcon type={activity.type} />
            </div>


            {/* TEXT */}

            <div className="ml-[9px] min-w-0 flex-1">

              <p className="truncate text-[9px] font-semibold text-[#334155]">
                {activity.title}
              </p>

              <p className="mt-[2px] truncate text-[8px] text-[#94A3B8]">
                {activity.description}
              </p>

            </div>


            {/* TIME */}

            <span className="ml-[8px] whitespace-nowrap text-[8px] text-[#94A3B8]">
              {activity.time}
            </span>

          </div>
        ))}

      </div>

    </div>
  )
}

export default RecentActivity
import { useState } from "react"
