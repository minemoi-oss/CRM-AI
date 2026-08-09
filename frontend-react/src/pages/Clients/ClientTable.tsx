import type { Customer } from "../../Services/api"


interface ClientTableProps {
  customers: Customer[]
}


function ClientTable({
  customers,
}: ClientTableProps) {


  return (

    <div
      className="
        overflow-hidden
        rounded-[10px]
        border
        border-[#DCE5F0]
        bg-white
        shadow-[0_3px_10px_rgba(15,23,42,0.04)]
      "
    >

      {/* HEADER TABLE */}

      <div
        className="
          grid
          grid-cols-[60px_1.5fr_1.5fr_1fr_120px]
          border-b
          border-[#E2E8F0]
          bg-[#F8FAFC]
          px-[18px]
          py-[12px]
        "
      >

        <div className="text-[8px] font-semibold uppercase text-[#64748B]">
          ID
        </div>

        <div className="text-[8px] font-semibold uppercase text-[#64748B]">
          Client
        </div>

        <div className="text-[8px] font-semibold uppercase text-[#64748B]">
          Email
        </div>

        <div className="text-[8px] font-semibold uppercase text-[#64748B]">
          Téléphone
        </div>

        <div className="text-[8px] font-semibold uppercase text-[#64748B]">
          Entreprise
        </div>

      </div>


      {/* CLIENTS */}

      {customers.length === 0 ? (

        <div
          className="
            px-[18px]
            py-[30px]
            text-center
            text-[10px]
            text-[#64748B]
          "
        >
          Aucun client trouvé.
        </div>

      ) : (

        customers.map((customer) => (

          <div
            key={customer.id}
            className="
              grid
              grid-cols-[60px_1.5fr_1.5fr_1fr_120px]
              items-center
              border-b
              border-[#E2E8F0]
              px-[18px]
              py-[13px]
              last:border-b-0
              hover:bg-[#F8FAFC]
            "
          >

            {/* ID */}

            <div className="text-[9px] text-[#64748B]">
              #{customer.id}
            </div>


            {/* NOM */}

            <div className="text-[9px] font-medium text-[#0F172A]">
              {customer.name}
            </div>


            {/* EMAIL */}

            <div className="text-[9px] text-[#64748B]">
              {customer.email}
            </div>


            {/* TELEPHONE */}

            <div className="text-[9px] text-[#64748B]">
              {customer.phone || "-"}
            </div>


            {/* ENTREPRISE */}

            <div className="text-[9px] text-[#64748B]">
              {customer.company_id ?? "-"}
            </div>

          </div>

        ))

      )}

    </div>

  )
}


export default ClientTable