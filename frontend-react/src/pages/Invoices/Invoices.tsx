import { useState } from "react"


// ======================================================
// TYPE
// ======================================================

type Invoice = {
  id: number
  number: string
  client: string
  amount: number
  status: "Payée" | "En attente" | "En retard"
  payment: "Carte" | "Virement" | "—"
  dueDate: string
  issueDate: string
}


// ======================================================
// ICONS
// ======================================================

function PlusIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </svg>
  )
}


function CardIcon() {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
    >
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="M3 10h18" />
    </svg>
  )
}


function TransferIcon() {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M8 12h8" />
      <path d="m13 9 3 3-3 3" />
    </svg>
  )
}


function ErrorIcon() {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
    >
      <circle cx="12" cy="12" r="9" />
      <path d="m9 9 6 6" />
      <path d="m15 9-6 6" />
    </svg>
  )
}


function EyeIcon() {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
    >
      <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z" />
      <circle cx="12" cy="12" r="2.5" />
    </svg>
  )
}


function DownloadIcon() {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
    >
      <path d="M12 3v12" />
      <path d="m7 10 5 5 5-5" />
      <path d="M5 21h14" />
    </svg>
  )
}


function MoreIcon() {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="currentColor"
    >
      <circle cx="5" cy="12" r="1.5" />
      <circle cx="12" cy="12" r="1.5" />
      <circle cx="19" cy="12" r="1.5" />
    </svg>
  )
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


// ======================================================
// STATUS
// ======================================================

function StatusBadge({
  status,
}: {
  status: Invoice["status"]
}) {

  const styles = {
    "Payée": "bg-[#DCFCE7] text-[#16A34A]",
    "En attente": "bg-[#FEF3C7] text-[#D97706]",
    "En retard": "bg-[#FEE2E2] text-[#DC2626]",
  }

  return (
    <span
      className={`
        inline-flex
        min-w-[60px]
        justify-center
        rounded-full
        px-[9px]
        py-[4px]
        text-[8px]
        font-semibold
        ${styles[status]}
      `}
    >
      {status}
    </span>
  )
}


// ======================================================
// PAYMENT
// ======================================================

function PaymentMethod({
  payment,
}: {
  payment: Invoice["payment"]
}) {

  if (payment === "Carte") {
    return (
      <div className="flex items-center gap-[8px] text-[#64748B]">
        <CardIcon />
        <span className="text-[9px]">
          Carte
        </span>
      </div>
    )
  }

  if (payment === "Virement") {
    return (
      <div className="flex items-center gap-[8px] text-[#64748B]">
        <TransferIcon />
        <span className="text-[9px]">
          Virement
        </span>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-[8px] text-[#94A3B8]">
      <ErrorIcon />
      <span className="text-[9px]">
        —
      </span>
    </div>
  )
}


// ======================================================
// STAT CARD
// ======================================================

function StatCard({
  label,
  value,
  valueColor = "text-[#0F172A]",
}: {
  label: string
  value: string
  valueColor?: string
}) {

  return (
    <div
      className="
        h-[82px]
        rounded-[10px]
        border
        border-[#DCE5F0]
        bg-white
        px-[16px]
        py-[14px]
        shadow-[0_3px_10px_rgba(15,23,42,0.04)]
      "
    >

      <p className="text-[9px] text-[#64748B]">
        {label}
      </p>

      <p
        className={`
          mt-[11px]
          text-[18px]
          font-bold
          ${valueColor}
        `}
      >
        {value}
      </p>

    </div>
  )
}


// ======================================================
// INVOICE DETAILS
// ======================================================

function InvoiceDetails({
  invoice,
  onBack,
}: {
  invoice: Invoice
  onBack: () => void
}) {

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
            px-[15px]
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

      <div className="mt-[24px]">

        <p
          className="
            text-[10px]
            font-semibold
            uppercase
            tracking-[0.20em]
            text-[#2563EB]
          "
        >
          FACTURE
        </p>

        <h1
          className="
            mt-[8px]
            text-[30px]
            font-bold
            text-[#0F172A]
          "
        >
          {invoice.number}
        </h1>

        <p className="mt-[8px] text-[12px] text-[#64748B]">
          Détails et informations de la facture.
        </p>

      </div>


      {/* MAIN CARD */}

      <div
        className="
          mt-[24px]
          rounded-[10px]
          border
          border-[#DCE5F0]
          bg-white
          p-[22px]
          shadow-[0_3px_12px_rgba(15,23,42,0.04)]
        "
      >

        {/* TOP */}

        <div className="flex items-start justify-between">

          <div>

            <p className="text-[8px] font-semibold uppercase text-[#94A3B8]">
              NUMÉRO DE FACTURE
            </p>

            <p className="mt-[7px] text-[12px] font-semibold text-[#0F172A]">
              {invoice.number}
            </p>

          </div>


          <StatusBadge status={invoice.status} />

        </div>


        <div className="my-[22px] border-t border-[#E2E8F0]" />


        {/* INFORMATION */}

        <div className="grid grid-cols-3 gap-[30px]">

          <div>

            <p className="text-[8px] font-semibold uppercase text-[#94A3B8]">
              CLIENT
            </p>

            <p className="mt-[7px] text-[10px] font-semibold text-[#1E293B]">
              {invoice.client}
            </p>

          </div>


          <div>

            <p className="text-[8px] font-semibold uppercase text-[#94A3B8]">
              DATE D'ÉMISSION
            </p>

            <p className="mt-[7px] text-[10px] font-semibold text-[#1E293B]">
              {invoice.issueDate}
            </p>

          </div>


          <div>

            <p className="text-[8px] font-semibold uppercase text-[#94A3B8]">
              ÉCHÉANCE
            </p>

            <p className="mt-[7px] text-[10px] font-semibold text-[#1E293B]">
              {invoice.dueDate}
            </p>

          </div>

        </div>


        <div className="my-[22px] border-t border-[#E2E8F0]" />


        {/* PAYMENT */}

        <div className="grid grid-cols-3 gap-[30px]">

          <div>

            <p className="text-[8px] font-semibold uppercase text-[#94A3B8]">
              PAIEMENT
            </p>

            <div className="mt-[7px]">
              <PaymentMethod payment={invoice.payment} />
            </div>

          </div>


          <div>

            <p className="text-[8px] font-semibold uppercase text-[#94A3B8]">
              STATUT
            </p>

            <div className="mt-[5px]">
              <StatusBadge status={invoice.status} />
            </div>

          </div>


          <div>

            <p className="text-[8px] font-semibold uppercase text-[#94A3B8]">
              MONTANT
            </p>

            <p className="mt-[7px] text-[16px] font-bold text-[#0F172A]">
              {invoice.amount.toLocaleString("fr-FR", {
                style: "currency",
                currency: "EUR",
              })}
            </p>

          </div>

        </div>

      </div>


      {/* PAYMENT CARD */}

      <div
        className="
          mt-[15px]
          rounded-[10px]
          border
          border-[#DCE5F0]
          bg-white
          p-[20px]
        "
      >

        <h2 className="text-[11px] font-semibold text-[#1E293B]">
          Informations de paiement
        </h2>

        <p className="mt-[7px] text-[9px] text-[#64748B]">
          Cette facture est associée au mode de paiement suivant :
        </p>

        <div className="mt-[15px]">
          <PaymentMethod payment={invoice.payment} />
        </div>

      </div>

    </div>
  )
}


// ======================================================
// MAIN PAGE
// ======================================================

function Invoices() {

  const [selectedInvoice, setSelectedInvoice] =
    useState<Invoice | null>(null)


  // ====================================================
  // DATA
  // ====================================================

  const invoices: Invoice[] = [

    {
      id: 1,
      number: "#1042",
      client: "Atelier Dubois",
      amount: 2450,
      status: "Payée",
      payment: "Carte",
      dueDate: "28 juil. 2026",
      issueDate: "28 juin 2026",
    },

    {
      id: 2,
      number: "#1041",
      client: "Nova Industries",
      amount: 1800,
      status: "En attente",
      payment: "Virement",
      dueDate: "12 août 2026",
      issueDate: "12 juil. 2026",
    },

    {
      id: 3,
      number: "#1040",
      client: "Lumière & Co",
      amount: 5200,
      status: "Payée",
      payment: "Carte",
      dueDate: "05 juil. 2026",
      issueDate: "05 juin 2026",
    },

    {
      id: 4,
      number: "#1039",
      client: "Vertex Solutions",
      amount: 980,
      status: "En retard",
      payment: "—",
      dueDate: "30 juin 2026",
      issueDate: "30 mai 2026",
    },

    {
      id: 5,
      number: "#1038",
      client: "Riviera Consulting",
      amount: 3150,
      status: "Payée",
      payment: "Carte",
      dueDate: "18 juin 2026",
      issueDate: "18 mai 2026",
    },

  ]


  // ====================================================
  // DETAILS
  // ====================================================

  if (selectedInvoice) {

    return (
      <InvoiceDetails
        invoice={selectedInvoice}
        onBack={() => setSelectedInvoice(null)}
      />
    )
  }


  // ====================================================
  // LIST PAGE
  // ====================================================

  return (
    <div className="w-full">

      {/* ==================================================
          HEADER
      ================================================== */}

      <div>

        <p
          className="
            text-[10px]
            font-semibold
            uppercase
            tracking-[0.20em]
            text-[#2563EB]
          "
        >
          PAGES
        </p>


        <h1
          className="
            mt-[8px]
            text-[30px]
            font-bold
            leading-none
            text-[#0F172A]
          "
        >
          Factures
        </h1>


        <p
          className="
            mt-[10px]
            text-[13px]
            text-[#64748B]
          "
        >
          Liste, statut, paiement et montant de toutes les factures.
        </p>

      </div>


      {/* ==================================================
          TOTAL + BUTTON
      ================================================== */}

      <div
        className="
          mt-[15px]
          flex
          items-center
          justify-between
        "
      >

        <p className="text-[12px] text-[#64748B]">
          48 factures au total
        </p>


        <button
          type="button"
          className="
            flex
            h-[34px]
            w-[197px]
            items-center
            justify-center
            gap-[8px]
            rounded-[6px]
            bg-[#2563EB]
            text-[9px]
            font-semibold
            text-white
            hover:bg-[#1D4ED8]
          "
        >

          <PlusIcon />

          Nouvelle facture

        </button>

      </div>


      {/* ==================================================
          STATISTICS
      ================================================== */}

      <div
        className="
          mt-[20px]
          grid
          grid-cols-4
          gap-[19px]
        "
      >

        <StatCard
          label="Total facturé"
          value="142 800 €"
        />

        <StatCard
          label="Payé"
          value="118 200 €"
          valueColor="text-[#16A34A]"
        />

        <StatCard
          label="En attente"
          value="16 900 €"
          valueColor="text-[#D97706]"
        />

        <StatCard
          label="En retard"
          value="7 700 €"
          valueColor="text-[#DC2626]"
        />

      </div>


      {/* ==================================================
          TABLE
      ================================================== */}

      <div
        className="
          mt-[23px]
          overflow-hidden
          border
          border-[#DCE5F0]
          bg-white
        "
      >

        <table className="w-full border-collapse">

          <thead>

            <tr
              className="
                h-[37px]
                border-b
                border-[#DCE5F0]
                bg-[#F1F5F9]
              "
            >

              <th className="w-[12%] text-left text-[8px] font-semibold uppercase text-[#64748B]">
                Numéro
              </th>

              <th className="w-[27%] text-left text-[8px] font-semibold uppercase text-[#64748B]">
                Client
              </th>

              <th className="w-[12%] text-left text-[8px] font-semibold uppercase text-[#64748B]">
                Montant
              </th>

              <th className="w-[12%] text-left text-[8px] font-semibold uppercase text-[#64748B]">
                Statut
              </th>

              <th className="w-[12%] text-left text-[8px] font-semibold uppercase text-[#64748B]">
                Paiement
              </th>

              <th className="w-[15%] text-left text-[8px] font-semibold uppercase text-[#64748B]">
                Échéance
              </th>

              <th className="w-[10%] text-center text-[8px] font-semibold uppercase text-[#64748B]">
                Actions
              </th>

            </tr>

          </thead>


          <tbody>

            {invoices.map((invoice) => (

              <tr
                key={invoice.id}
                className="
                  h-[50px]
                  border-b
                  border-[#DCE5F0]
                  hover:bg-[#F8FAFC]
                "
              >

                {/* NUMERO */}

                <td className="text-[9px] font-semibold text-[#0F172A]">
                  {invoice.number}
                </td>


                {/* CLIENT */}

                <td className="text-[9px] text-[#1E293B]">
                  {invoice.client}
                </td>


                {/* MONTANT */}

                <td className="text-[9px] font-semibold text-[#1E293B]">

                  {invoice.amount.toLocaleString(
                    "fr-FR",
                    {
                      style: "currency",
                      currency: "EUR",
                    }
                  )}

                </td>


                {/* STATUS */}

                <td>
                  <StatusBadge status={invoice.status} />
                </td>


                {/* PAYMENT */}

                <td>
                  <PaymentMethod payment={invoice.payment} />
                </td>


                {/* DATE */}

                <td className="text-[8px] text-[#64748B]">
                  {invoice.dueDate}
                </td>


                {/* ACTIONS */}

                <td>

                  <div
                    className="
                      flex
                      items-center
                      justify-center
                      gap-[11px]
                      text-[#64748B]
                    "
                  >

                    {/* VIEW */}

                    <button
                      type="button"
                      title="Voir la facture"
                      onClick={() => {
                        setSelectedInvoice(invoice)
                      }}
                      className="
                        transition
                        hover:text-[#2563EB]
                      "
                    >
                      <EyeIcon />
                    </button>


                    {/* DOWNLOAD */}

                    <button
                      type="button"
                      title="Télécharger"
                      className="
                        transition
                        hover:text-[#2563EB]
                      "
                    >
                      <DownloadIcon />
                    </button>


                    {/* MORE */}

                    <button
                      type="button"
                      title="Plus"
                      className="
                        transition
                        hover:text-[#2563EB]
                      "
                    >
                      <MoreIcon />
                    </button>

                  </div>

                </td>

              </tr>

            ))}

          </tbody>

        </table>

      </div>

    </div>
  )
}


export default Invoices