interface RevenueData {
  month: string
  value: number
}

interface RevenueChartProps {
  data: RevenueData[]
}

function RevenueChart({ data }: RevenueChartProps) {
  const maxValue = Math.max(...data.map((item) => item.value))

  return (
    <div className="rounded-[8px] border border-[#E2E8F0] bg-white p-[16px]">

      {/* Header */}

      <div className="flex items-center justify-between">

        <div>
          <h3 className="text-[12px] font-semibold text-[#0F172A]">
            Revenus mensuels
          </h3>

          <p className="mt-[3px] text-[9px] text-[#94A3B8]">
            Évolution des revenus
          </p>
        </div>

        <select
          className="
            h-[28px]
            rounded-[5px]
            border
            border-[#E2E8F0]
            bg-white
            px-[8px]
            text-[9px]
            text-[#64748B]
            outline-none
          "
          defaultValue="6"
        >
          <option value="6">6 derniers mois</option>
          <option value="12">12 derniers mois</option>
        </select>

      </div>

      {/* Chart */}

      <div className="relative mt-[18px] h-[190px]">

        {/* Grid */}

        <div className="absolute inset-0 flex flex-col justify-between">

          {[0, 1, 2, 3, 4].map((line) => (
            <div
              key={line}
              className="border-t border-[#F1F5F9]"
            />
          ))}

        </div>

        {/* Bars */}

        <div className="absolute inset-0 flex items-end justify-between px-[10px]">

          {data.map((item) => {

            const height =
              maxValue > 0
                ? (item.value / maxValue) * 160
                : 0

            return (
              <div
                key={item.month}
                className="flex h-full flex-1 flex-col items-center justify-end"
              >

                <div
                  className="
                    w-[24px]
                    rounded-t-[4px]
                    bg-[#2563EB]
                    transition-all
                  "
                  style={{
                    height: `${height}px`,
                  }}
                />

                <span className="mt-[8px] text-[8px] text-[#94A3B8]">
                  {item.month}
                </span>

              </div>
            )
          })}

        </div>

      </div>

    </div>
  )
}

export default RevenueChart