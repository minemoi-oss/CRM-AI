import type { Customer } from "../../Services/api"
import { deleteCustomer } from "../../Services/api"


interface ClientTableProps {

  customers: Customer[]

  onView: (
    customer: Customer
  ) => void

  onEdit: (
    customer: Customer
  ) => void

  onDeleted: () => void
}


function ClientTable({
  customers,
  onView,
  onEdit,
  onDeleted,
}: ClientTableProps) {


  async function handleDelete(
    customer: Customer
  ) {

    const confirmed =
      window.confirm(
        `Voulez-vous supprimer ${customer.first_name} ${customer.last_name} ?`
      )

    if (!confirmed) {
      return
    }


    try {

      await deleteCustomer(
        customer.id
      )

      onDeleted()

    } catch (error) {

      console.error(
        "Erreur suppression client :",
        error
      )

      alert(
        "Impossible de supprimer le client."
      )

    }
  }


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

      {/* HEADER */}

      <div
        className="
          grid
          grid-cols-[55px_1.4fr_1.6fr_1fr_100px_190px]
          border-b
          border-[#E2E8F0]
          bg-[#F8FAFC]
          px-[18px]
          py-[13px]
        "
      >

        <div className="text-[10px] font-semibold uppercase text-[#64748B]">
          ID
        </div>

        <div className="text-[10px] font-semibold uppercase text-[#64748B]">
          Client
        </div>

        <div className="text-[10px] font-semibold uppercase text-[#64748B]">
          Email
        </div>

        <div className="text-[10px] font-semibold uppercase text-[#64748B]">
          Téléphone
        </div>

        <div className="text-[10px] font-semibold uppercase text-[#64748B]">
          Entreprise
        </div>

        <div className="text-[10px] font-semibold uppercase text-[#64748B]">
          Actions
        </div>

      </div>


      {/* CLIENTS */}

      {customers.length === 0 ? (

        <div
          className="
            px-[18px]
            py-[30px]
            text-center
            text-[14px]
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
              grid-cols-[55px_1.4fr_1.6fr_1fr_100px_190px]
              items-center
              border-b
              border-[#E2E8F0]
              px-[18px]
              py-[14px]
              last:border-b-0
              hover:bg-[#F8FAFC]
            "
          >

            <div className="text-[12px] text-[#64748B]">
              #{customer.id}
            </div>


            <div className="text-[13px] font-medium text-[#0F172A]">
              {customer.first_name} {customer.last_name}
            </div>


            <div className="truncate text-[13px] text-[#64748B]">
              {customer.email}
            </div>


            <div className="text-[13px] text-[#64748B]">
              {customer.phone || "-"}
            </div>


            <div className="text-[13px] text-[#64748B]">
              {customer.company_id ?? "-"}
            </div>


            {/* ACTIONS */}

            <div className="flex items-center gap-[6px]">

              <button
                type="button"
                onClick={() =>
                  onView(customer)
                }
                className="
                  rounded-[5px]
                  border
                  border-[#CBD5E1]
                  bg-white
                  px-[8px]
                  py-[6px]
                  text-[11px]
                  font-medium
                  text-[#475569]
                  hover:bg-[#F1F5F9]
                "
              >
                Voir
              </button>


              <button
                type="button"
                onClick={() =>
                  onEdit(customer)
                }
                className="
                  rounded-[5px]
                  border
                  border-[#BFDBFE]
                  bg-[#EFF6FF]
                  px-[8px]
                  py-[6px]
                  text-[11px]
                  font-medium
                  text-[#2563EB]
                  hover:bg-[#DBEAFE]
                "
              >
                Modifier
              </button>


              <button
                type="button"
                onClick={() =>
                  handleDelete(customer)
                }
                className="
                  rounded-[5px]
                  border
                  border-red-200
                  bg-red-50
                  px-[8px]
                  py-[6px]
                  text-[11px]
                  font-medium
                  text-red-600
                  hover:bg-red-100
                "
              >
                Supprimer
              </button>

            </div>

          </div>

        ))

      )}

    </div>

  )
}


export default ClientTable