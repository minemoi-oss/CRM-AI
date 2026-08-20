interface Client {
  id: number
  name: string
  email: string
  company: string
  status: "Actif" | "En attente" | "Inactif"
}

interface RecentClientsProps {
  clients: Client[]
  onViewAll: () => void
}

function RecentClients({
  clients,
  onViewAll,
}: RecentClientsProps) {
  return (
    <div className="rounded-[8px] border border-[#E2E8F0] bg-white p-[16px]">

      {/* Header */}

      <div className="flex items-center justify-between">

        <h3 className="text-[12px] font-semibold text-[#0F172A]">
          Clients récents
        </h3>

        <button
          type="button"
          onClick={onViewAll}
          className="text-[9px] font-medium text-[#2563EB]"
        >
          Voir tout
        </button>

      </div>

      {/* Table */}

      <div className="mt-[14px] overflow-hidden">

        {/* Table header */}

        <div
          className="
            grid
            grid-cols-[1.4fr_1.4fr_1fr_0.7fr]
            border-b
            border-[#E2E8F0]
            pb-[7px]
          "
        >

          <span className="text-[8px] font-semibold text-[#94A3B8]">
            CLIENT
          </span>

          <span className="text-[8px] font-semibold text-[#94A3B8]">
            EMAIL
          </span>

          <span className="text-[8px] font-semibold text-[#94A3B8]">
            ENTREPRISE
          </span>

          <span className="text-[8px] font-semibold text-[#94A3B8]">
            STATUT
          </span>

        </div>

        {/* Rows */}

        {clients.length === 0 && <p className="py-[24px] text-center text-[10px] text-[#94A3B8]">Aucun client pour le moment.</p>}
        {clients.map((client) => (
          <div
            key={client.id}
            className="
              grid
              grid-cols-[1.4fr_1.4fr_1fr_0.7fr]
              items-center
              border-b
              border-[#F1F5F9]
              py-[9px]
              last:border-0
            "
          >

            <div className="flex items-center">

              <div
                className="
                  flex
                  h-[24px]
                  w-[24px]
                  items-center
                  justify-center
                  rounded-full
                  bg-[#DBEAFE]
                  text-[8px]
                  font-semibold
                  text-[#2563EB]
                "
              >
                {client.name
                  .split(" ")
                  .map((name) => name[0])
                  .join("")
                  .slice(0, 2)}
              </div>

              <span className="ml-[7px] text-[9px] font-medium text-[#334155]">
                {client.name}
              </span>

            </div>

            <span className="truncate pr-2 text-[8px] text-[#64748B]">
              {client.email}
            </span>

            <span className="truncate pr-2 text-[8px] text-[#64748B]">
              {client.company}
            </span>

            <span
              className={`
                w-fit
                rounded-full
                px-[7px]
                py-[3px]
                text-[7px]
                font-semibold

                ${
                  client.status === "Actif"
                    ? "bg-[#DCFCE7] text-[#16A34A]"
                    : client.status === "En attente"
                      ? "bg-[#FEF3C7] text-[#D97706]"
                      : "bg-[#F1F5F9] text-[#64748B]"
                }
              `}
            >
              {client.status}
            </span>

          </div>
        ))}

      </div>

    </div>
  )
}

export default RecentClients
