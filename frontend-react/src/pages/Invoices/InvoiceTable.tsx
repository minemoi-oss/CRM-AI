// ======================================================
// TYPES
// ======================================================

export interface Invoice {
  id: number
  number: string
  client: string
  company: string
  date: string
  dueDate: string
  amount: number
  status: "Payée" | "En attente" | "En retard"
}


// ======================================================
// PROPS
// ======================================================

interface InvoiceTableProps {
  invoices: Invoice[]
  onInvoiceClick: (invoice: Invoice) => void
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
    Payée: "bg-[#DCFCE7] text-[#16A34A]",
    "En attente": "bg-[#FEF3C7] text-[#D97706]",
    "En retard": "bg-[#FEE2E2] text-[#DC2626]",
  }

  return (
    <span
      className={`
        inline-flex
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
// COMPONENT
// ======================================================

function InvoiceTable({
  invoices,
  onInvoiceClick,
}: InvoiceTableProps) {
  return (
    <div
      className="
        overflow-hidden
        rounded-[10px]
        border
        border-[#DCE5F0]
        bg-white
        shadow-[0_3px_12px_rgba(15,23,42,0.04)]
      "
    >

      <table className="w-full border-collapse">

        <thead>

          <tr className="border-b border-[#E2E8F0] bg-[#F8FAFC]">

            <th className="px-[16px] py-[13px] text-left text-[8px] font-semibold uppercase tracking-[0.05em] text-[#64748B]">
              Facture
            </th>

            <th className="px-[16px] py-[13px] text-left text-[8px] font-semibold uppercase tracking-[0.05em] text-[#64748B]">
              Client
            </th>

            <th className="px-[16px] py-[13px] text-left text-[8px] font-semibold uppercase tracking-[0.05em] text-[#64748B]">
              Date
            </th>

            <th className="px-[16px] py-[13px] text-left text-[8px] font-semibold uppercase tracking-[0.05em] text-[#64748B]">
              Échéance
            </th>

            <th className="px-[16px] py-[13px] text-right text-[8px] font-semibold uppercase tracking-[0.05em] text-[#64748B]">
              Montant
            </th>

            <th className="px-[16px] py-[13px] text-left text-[8px] font-semibold uppercase tracking-[0.05em] text-[#64748B]">
              Statut
            </th>

          </tr>

        </thead>


        <tbody>

          {invoices.length === 0 ? (

            <tr>

              <td
                colSpan={6}
                className="
                  px-[16px]
                  py-[45px]
                  text-center
                  text-[9px]
                  text-[#94A3B8]
                "
              >
                Aucune facture trouvée
              </td>

            </tr>

          ) : (

            invoices.map((invoice) => (

              <tr
                key={invoice.id}
                onClick={() => onInvoiceClick(invoice)}
                className="
                  cursor-pointer
                  border-b
                  border-[#F1F5F9]
                  transition
                  hover:bg-[#F8FAFC]
                "
              >

                <td className="px-[16px] py-[14px]">

                  <p className="text-[9px] font-semibold text-[#1E293B]">
                    {invoice.number}
                  </p>

                </td>


                <td className="px-[16px] py-[14px]">

                  <p className="text-[9px] font-semibold text-[#334155]">
                    {invoice.client}
                  </p>

                  <p className="mt-[3px] text-[7px] text-[#94A3B8]">
                    {invoice.company}
                  </p>

                </td>


                <td className="px-[16px] py-[14px] text-[8px] text-[#64748B]">
                  {invoice.date}
                </td>


                <td className="px-[16px] py-[14px] text-[8px] text-[#64748B]">
                  {invoice.dueDate}
                </td>


                <td className="px-[16px] py-[14px] text-right text-[9px] font-semibold text-[#1E293B]">
                  {invoice.amount.toLocaleString("fr-FR", {
                    style: "currency",
                    currency: "EUR",
                  })}
                </td>


                <td className="px-[16px] py-[14px]">
                  <StatusBadge status={invoice.status} />
                </td>

              </tr>

            ))

          )}

        </tbody>

      </table>

    </div>
  )
}

export default InvoiceTable