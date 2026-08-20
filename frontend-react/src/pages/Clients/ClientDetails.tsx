import type { Customer } from "../../Services/api"


interface ClientDetailsProps {

  customer: Customer

  onClose: () => void
}


function ClientDetails({
  customer,
  onClose,
}: ClientDetailsProps) {

  return (

    <div
      className="
        fixed
        inset-0
        z-50
        flex
        items-center
        justify-center
        bg-black/30
      "
    >

      <div
        className="
          w-[500px]
          rounded-[10px]
          bg-white
          p-[24px]
          shadow-xl
        "
      >

        {/* HEADER */}

        <div
          className="
            flex
            items-start
            justify-between
          "
        >

          <div>

            <p
              className="
                text-[12px]
                font-semibold
                uppercase
                tracking-[0.15em]
                text-[#2563EB]
              "
            >
              CLIENT
            </p>

            <h2
              className="
                mt-[6px]
                text-[22px]
                font-bold
                text-[#0F172A]
              "
            >
              {customer.first_name}{" "}
              {customer.last_name}
            </h2>

          </div>


          <button
            type="button"
            onClick={onClose}
            className="
              text-[22px]
              text-[#64748B]
              hover:text-[#0F172A]
            "
          >
            ×
          </button>

        </div>


        {/* INFORMATIONS */}

        <div
          className="
            mt-[24px]
            space-y-[16px]
          "
        >

          <div>

            <p className="text-[12px] text-[#64748B]">
              ID
            </p>

            <p className="mt-[3px] text-[14px] font-medium text-[#0F172A]">
              #{customer.id}
            </p>

          </div>


          <div>

            <p className="text-[12px] text-[#64748B]">
              Prénom
            </p>

            <p className="mt-[3px] text-[14px] font-medium text-[#0F172A]">
              {customer.first_name}
            </p>

          </div>


          <div>

            <p className="text-[12px] text-[#64748B]">
              Nom
            </p>

            <p className="mt-[3px] text-[14px] font-medium text-[#0F172A]">
              {customer.last_name}
            </p>

          </div>


          <div>

            <p className="text-[12px] text-[#64748B]">
              Email
            </p>

            <p className="mt-[3px] text-[14px] text-[#0F172A]">
              {customer.email}
            </p>

          </div>


          <div>

            <p className="text-[12px] text-[#64748B]">
              Téléphone
            </p>

            <p className="mt-[3px] text-[14px] text-[#0F172A]">
              {customer.phone || "-"}
            </p>

          </div>


          <div>

            <p className="text-[12px] text-[#64748B]">
              Entreprise
            </p>

            <p className="mt-[3px] text-[14px] text-[#0F172A]">
              {customer.company_id ?? "-"}
            </p>

          </div>

        </div>


        {/* FOOTER */}

        <div className="mt-[24px] flex justify-end">

          <button
            type="button"
            onClick={onClose}
            className="
              h-[40px]
              rounded-[6px]
              bg-[#2563EB]
              px-[18px]
              text-[13px]
              font-medium
              text-white
              hover:bg-[#1D4ED8]
            "
          >
            Fermer
          </button>

        </div>

      </div>

    </div>

  )
}


export default ClientDetails