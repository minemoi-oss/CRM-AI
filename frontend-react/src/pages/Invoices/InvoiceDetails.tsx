import type { Invoice } from "./InvoiceTable"


interface InvoiceDetailsProps {
  invoice: Invoice
  onBack: () => void
}


function ArrowLeftIcon() {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <path d="M19 12H5" />
      <path d="m12 19-7-7 7-7" />
    </svg>
  )
}


function FileIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
    >
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" />
      <path d="M14 2v6h6" />
      <path d="M8 13h8" />
      <path d="M8 17h5" />
    </svg>
  )
}


function InvoiceDetails({
  invoice,
  onBack,
}: InvoiceDetailsProps) {

  const formattedAmount = invoice.amount.toLocaleString(
    "fr-FR",
    {
      style: "currency",
      currency: "EUR",
    }
  )


  return (
    <div className="w-full">

      {/* HEADER */}

      <div className="flex items-center justify-between">

        <button
          type="button"
          onClick={onBack}
          className="
            flex
            items-center
            gap-[7px]
            text-[9px]
            font-medium
            text-[#64748B]
            hover:text-[#2563EB]
          "
        >
          <ArrowLeftIcon />
          Retour aux factures
        </button>


        <button
          type="button"
          className="
            h-[34px]
            rounded-[6px]
            bg-[#2563EB]
            px-[13px]
            text-[9px]
            font-semibold
            text-white
            hover:bg-[#1D4ED8]
          "
        >
          Télécharger
        </button>

      </div>


      {/* TITLE */}

      <div className="mt-[18px]">

        <p
          className="
            text-[10px]
            font-semibold
            uppercase
            tracking-[0.18em]
            text-[#2563EB]
          "
        >
          FACTURE
        </p>

        <h1 className="mt-[7px] text-[24px] font-bold text-[#0F172A]">
          {invoice.number}
        </h1>

      </div>


      {/* MAIN CARD */}

      <div
        className="
          mt-[20px]
          rounded-[12px]
          border
          border-[#DCE5F0]
          bg-white
          p-[22px]
          shadow-[0_4px_14px_rgba(15,23,42,0.05)]
        "
      >

        {/* TOP */}

        <div className="flex items-start justify-between">

          <div className="flex items-center gap-[12px]">

            <div
              className="
                flex
                h-[45px]
                w-[45px]
                items-center
                justify-center
                rounded-[8px]
                bg-[#EFF6FF]
                text-[#2563EB]
              "
            >
              <FileIcon />
            </div>

            <div>

              <p className="text-[11px] font-semibold text-[#1E293B]">
                {invoice.number}
              </p>

              <p className="mt-[4px] text-[8px] text-[#94A3B8]">
                Créée le {invoice.date}
              </p>

            </div>

          </div>


          <span
            className={`
              rounded-full
              px-[10px]
              py-[5px]
              text-[8px]
              font-semibold
              ${
                invoice.status === "Payée"
                  ? "bg-[#DCFCE7] text-[#16A34A]"
                  : invoice.status === "En retard"
                    ? "bg-[#FEE2E2] text-[#DC2626]"
                    : "bg-[#FEF3C7] text-[#D97706]"
              }
            `}
          >
            {invoice.status}
          </span>

        </div>


        <div className="my-[22px] border-t border-[#E2E8F0]" />


        {/* CLIENT */}

        <div className="grid grid-cols-3 gap-[25px]">

          <div>

            <p className="text-[8px] font-semibold uppercase text-[#94A3B8]">
              CLIENT
            </p>

            <p className="mt-[7px] text-[10px] font-semibold text-[#1E293B]">
              {invoice.client}
            </p>

            <p className="mt-[3px] text-[8px] text-[#64748B]">
              {invoice.company}
            </p>

          </div>


          <div>

            <p className="text-[8px] font-semibold uppercase text-[#94A3B8]">
              DATE D'ÉMISSION
            </p>

            <p className="mt-[7px] text-[10px] font-semibold text-[#1E293B]">
              {invoice.date}
            </p>

          </div>


          <div>

            <p className="text-[8px] font-semibold uppercase text-[#94A3B8]">
              DATE D'ÉCHÉANCE
            </p>

            <p className="mt-[7px] text-[10px] font-semibold text-[#1E293B]">
              {invoice.dueDate}
            </p>

          </div>

        </div>


        <div className="my-[22px] border-t border-[#E2E8F0]" />


        {/* AMOUNT */}

        <div className="flex items-center justify-between">

          <p className="text-[11px] font-semibold text-[#334155]">
            Total
          </p>

          <p className="text-[20px] font-bold text-[#0F172A]">
            {formattedAmount}
          </p>

        </div>

      </div>


      {/* PAYMENT */}

      <div
        className="
          mt-[15px]
          rounded-[10px]
          border
          border-[#DCE5F0]
          bg-white
          p-[18px]
        "
      >

        <h2 className="text-[12px] font-semibold text-[#1E293B]">
          Paiement
        </h2>

        <p className="mt-[7px] text-[9px] text-[#64748B]">
          Informations relatives au paiement de cette facture.
        </p>

      </div>

    </div>
  )
}

export default InvoiceDetails