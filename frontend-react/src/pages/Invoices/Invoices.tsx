import { useEffect, useState } from "react"
import { createInvoice, createPayment, getInvoices, getPayments, getQuotes, type Invoice as ApiInvoice, type Payment, type Quote } from "../../Services/api"
import type { CopilotActiveEntity } from "../../Services/ai"


// ======================================================
// TYPE
// ======================================================

type Invoice = {
  id: number
  quoteId: number
  number: string
  client: string
  amount: number
  status: "Payée" | "En attente" | "En retard"
  payment: "Carte" | "Virement" | "Espèces" | "Chèque" | "—"
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

  if (payment !== "—") {
    return (
      <div className="flex items-center gap-[8px] text-[#64748B]">
        <TransferIcon />
        <span className="text-[9px]">
          {payment}
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


function escapeHtml(value: string) {
  const entities: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }
  return value.replace(/[&<>'"]/g, (character) => entities[character])
}

function printInvoice(invoice: Invoice, payments: Payment[]) {
  const popup = window.open("", "_blank", "width=900,height=720")
  if (!popup) {
    window.alert("Le navigateur a bloqué le document. Autorisez les fenêtres pop-up pour imprimer la facture.")
    return
  }

  popup.opener = null
  const paid = payments.reduce((sum, payment) => sum + payment.amount, 0)
  const balance = Math.max(invoice.amount - paid, 0)
  const money = (value: number) => value.toLocaleString("fr-FR", { style: "currency", currency: "EUR" })

  popup.document.write(`<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>${escapeHtml(invoice.number)}</title><style>body{font-family:Inter,Arial,sans-serif;color:#0f172a;margin:48px}header{display:flex;justify-content:space-between;border-bottom:2px solid #2563eb;padding-bottom:22px}.brand{font-size:22px;font-weight:800;color:#2563eb}.muted{color:#64748b;font-size:12px}.grid{display:grid;grid-template-columns:repeat(3,1fr);gap:24px;margin:34px 0}.label{text-transform:uppercase;font-size:10px;color:#94a3b8;font-weight:700}.value{font-size:14px;font-weight:600;margin-top:7px}.total{margin-left:auto;width:300px;border-top:1px solid #e2e8f0;padding-top:18px}.row{display:flex;justify-content:space-between;margin:10px 0}.grand{font-size:20px;font-weight:800;border-top:2px solid #0f172a;padding-top:12px}@media print{body{margin:22mm}.no-print{display:none}}</style></head><body><header><div><div class="brand">Mine CRM AI</div><div class="muted">Document de facturation</div></div><div style="text-align:right"><div class="label">Facture</div><div style="font-size:20px;font-weight:800;margin-top:6px">${escapeHtml(invoice.number)}</div></div></header><section class="grid"><div><div class="label">Client</div><div class="value">${escapeHtml(invoice.client)}</div></div><div><div class="label">Date d'émission</div><div class="value">${escapeHtml(invoice.issueDate)}</div></div><div><div class="label">Échéance</div><div class="value">${escapeHtml(invoice.dueDate)}</div></div></section><div class="total"><div class="row"><span>Total facturé</span><strong>${money(invoice.amount)}</strong></div><div class="row"><span>Déjà payé</span><strong>${money(paid)}</strong></div><div class="row grand"><span>Solde</span><span>${money(balance)}</span></div></div><p class="muted" style="margin-top:50px">Statut : ${escapeHtml(invoice.status)} · Paiement : ${escapeHtml(invoice.payment)}</p><button class="no-print" onclick="window.print()" style="margin-top:30px;background:#2563eb;color:white;border:0;border-radius:8px;padding:12px 18px;font-weight:700;cursor:pointer">Imprimer / Enregistrer en PDF</button></body></html>`)
  popup.document.close()
  popup.focus()
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
  payments,
  onAddPayment,
  onPrint,
}: {
  invoice: Invoice
  onBack: () => void
  payments: Payment[]
  onAddPayment: () => void
  onPrint: () => void
}) {

  const paidAmount = payments.reduce((sum, payment) => sum + payment.amount, 0)
  const remainingAmount = Math.max(invoice.amount - paidAmount, 0)

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
          onClick={onPrint}
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
          Imprimer / PDF
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

        <div className="mt-[15px] space-y-[8px]">
          {payments.map((payment) => (
            <div key={payment.id} className="flex items-center justify-between border-t border-[#E2E8F0] pt-[8px]">
              <span className="text-[9px] text-[#64748B]">{payment.payment_method} · {new Date(payment.created_at).toLocaleDateString("fr-FR")}</span>
              <span className="text-[9px] font-semibold text-[#16A34A]">{payment.amount.toLocaleString("fr-FR", { style: "currency", currency: "EUR" })}</span>
            </div>
          ))}
        </div>

        {remainingAmount > 0 ? (
          <button type="button" onClick={onAddPayment} className="mt-[15px] h-[32px] rounded-[6px] bg-[#2563EB] px-[15px] text-[9px] font-semibold text-white hover:bg-[#1D4ED8]">
            Ajouter un paiement · reste {remainingAmount.toLocaleString("fr-FR", { style: "currency", currency: "EUR" })}
          </button>
        ) : (
          <div className="mt-[15px] inline-flex h-[32px] items-center rounded-[6px] bg-[#DCFCE7] px-[15px] text-[9px] font-semibold text-[#15803D]">
            Facture entièrement réglée
          </div>
        )}

      </div>

    </div>
  )
}


function PaymentModal({ amount, method, loading, error, onAmountChange, onMethodChange, onClose, onSubmit }: {
  amount: string
  method: string
  loading: boolean
  error: string | null
  onAmountChange: (value: string) => void
  onMethodChange: (value: string) => void
  onClose: () => void
  onSubmit: (event: React.FormEvent) => void
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
      <form onSubmit={onSubmit} className="w-[460px] rounded-[10px] bg-white p-[24px] shadow-xl">
        <div className="flex items-start justify-between"><div><h2 className="text-[20px] font-semibold text-[#0F172A]">Ajouter un paiement</h2><p className="mt-[5px] text-[13px] text-[#64748B]">Enregistrez le règlement de cette facture.</p></div><button type="button" onClick={onClose} className="text-[20px] text-[#64748B] hover:text-[#0F172A]">×</button></div>
        <div className="mt-[24px] space-y-[15px]">
          <div><label className="mb-[6px] block text-[13px] font-medium text-[#334155]">Montant</label><input required type="number" min="0.01" step="0.01" value={amount} onChange={(event) => onAmountChange(event.target.value)} className="h-[40px] w-full rounded-[6px] border border-[#CBD5E1] px-[11px] text-[14px] outline-none focus:border-[#2563EB]" /></div>
          <div><label className="mb-[6px] block text-[13px] font-medium text-[#334155]">Mode de paiement</label><select value={method} onChange={(event) => onMethodChange(event.target.value)} className="h-[40px] w-full rounded-[6px] border border-[#CBD5E1] bg-white px-[11px] text-[14px] outline-none focus:border-[#2563EB]"><option value="Carte">Carte</option><option value="Virement">Virement</option><option value="Espèces">Espèces</option><option value="Chèque">Chèque</option></select></div>
        </div>
        {error && <div className="mt-[15px] rounded-[6px] bg-red-50 px-[11px] py-[10px] text-[12px] text-red-600">{error}</div>}
        <div className="mt-[24px] flex justify-end gap-[8px]"><button type="button" onClick={onClose} disabled={loading} className="h-[40px] rounded-[6px] border border-[#CBD5E1] px-[16px] text-[13px] font-medium text-[#475569] hover:bg-[#F8FAFC] disabled:opacity-50">Annuler</button><button type="submit" disabled={loading || Number(amount) <= 0} className="h-[40px] rounded-[6px] bg-[#2563EB] px-[18px] text-[13px] font-medium text-white hover:bg-[#1D4ED8] disabled:opacity-50">{loading ? "Enregistrement..." : "Enregistrer le paiement"}</button></div>
      </form>
    </div>
  )
}


// ======================================================
// MAIN PAGE
// ======================================================

interface InvoicesProps {
  onNavigateQuotes: () => void
  focusInvoiceId?: number
  onFocusConsumed?: () => void
  onActiveEntityChange?: (entity: CopilotActiveEntity | null) => void
}

function Invoices({ onNavigateQuotes, focusInvoiceId, onFocusConsumed, onActiveEntityChange }: InvoicesProps) {

  const [selectedInvoice, setSelectedInvoice] =
    useState<Invoice | null>(null)

  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [error, setError] = useState<string | null>(null)
  const [showCreateInvoice, setShowCreateInvoice] = useState(false)
  const [quotes, setQuotes] = useState<Quote[]>([])
  const [selectedQuoteId, setSelectedQuoteId] = useState("")
  const [creating, setCreating] = useState(false)
  const [payments, setPayments] = useState<Payment[]>([])
  const [showPayment, setShowPayment] = useState(false)
  const [paymentAmount, setPaymentAmount] = useState("")
  const [paymentMethod, setPaymentMethod] = useState("Carte")
  const [paying, setPaying] = useState(false)


  // ====================================================
  // DATA
  // ====================================================

  const mapInvoice = (invoice: ApiInvoice): Invoice => {
      const rawStatus = invoice.status.toLowerCase()
      const dueDate = new Date(invoice.due_date)
      const status: Invoice["status"] = rawStatus === "paid" || rawStatus === "payée"
        ? "Payée"
        : dueDate.getTime() < Date.now()
          ? "En retard"
          : "En attente"
      const rawPayment = invoice.payment_method?.toLowerCase() ?? ""
      const payment: Invoice["payment"] = rawPayment.includes("card") || rawPayment.includes("carte")
        ? "Carte"
        : rawPayment.includes("esp")
          ? "Espèces"
          : rawPayment.includes("ch")
            ? "Chèque"
            : rawPayment
              ? "Virement"
              : "—"
      return {
        id: invoice.id,
        quoteId: invoice.quote_id,
        number: invoice.invoice_number,
        client: invoice.customer_name,
        amount: invoice.total,
        status,
        payment,
        dueDate: dueDate.toLocaleDateString("fr-FR"),
        issueDate: new Date(invoice.created_at).toLocaleDateString("fr-FR"),
      }
  }

  function loadInvoices() {
    return getInvoices().then((items) => setInvoices(items.map(mapInvoice)))
  }

  function loadPayments() {
    return getPayments().then(setPayments)
  }

  useEffect(() => {
    Promise.all([loadInvoices(), loadPayments()]).catch((reason) => setError(reason instanceof Error ? reason.message : "Chargement impossible"))
    // loadInvoices is intentionally called once when the page opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!focusInvoiceId) return
    let active = true
    getInvoices()
      .then((items) => {
        if (!active) return
        const mapped = items.map(mapInvoice)
        const invoice = mapped.find((item) => item.id === focusInvoiceId)
        setInvoices(mapped)
        if (invoice) {
          setSelectedInvoice(invoice)
          onActiveEntityChange?.({ type: "invoice", id: invoice.id, label: invoice.number })
        } else {
          setError("Cette facture est introuvable ou n'est plus accessible.")
          onActiveEntityChange?.(null)
        }
        onFocusConsumed?.()
      })
      .catch((reason: unknown) => {
        if (!active) return
        setError(reason instanceof Error ? reason.message : "Impossible d'ouvrir cette facture.")
        onActiveEntityChange?.(null)
        onFocusConsumed?.()
      })
    return () => {
      active = false
    }
  }, [focusInvoiceId, onActiveEntityChange, onFocusConsumed])

  function openInvoiceDetails(invoice: Invoice) {
    setSelectedInvoice(invoice)
    onActiveEntityChange?.({ type: "invoice", id: invoice.id, label: invoice.number })
  }

  function closeInvoiceDetails() {
    setSelectedInvoice(null)
    onActiveEntityChange?.(null)
  }

  async function openCreateInvoice() {
    setError(null)
    try {
      const items = await getQuotes()
      const invoicedQuoteIds = new Set(invoices.map((invoice) => invoice.quoteId))
      const availableItems = items.filter((quote) => !invoicedQuoteIds.has(quote.id))
      setQuotes(availableItems)
      setSelectedQuoteId(availableItems.length ? String(availableItems[0].id) : "")
      setShowCreateInvoice(true)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Impossible de charger les devis")
    }
  }

  async function handleCreateInvoice(event: React.FormEvent) {
    event.preventDefault()
    if (!selectedQuoteId) return
    setCreating(true)
    setError(null)
    try {
      await createInvoice(Number(selectedQuoteId))
      await loadInvoices()
      setShowCreateInvoice(false)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Impossible de créer la facture")
    } finally {
      setCreating(false)
    }
  }

  function openPayment() {
    if (!selectedInvoice) return
    const alreadyPaid = payments.filter((payment) => payment.invoice_id === selectedInvoice.id).reduce((sum, payment) => sum + payment.amount, 0)
    setPaymentAmount(String(Math.max(selectedInvoice.amount - alreadyPaid, 0)))
    setPaymentMethod("Carte")
    setError(null)
    setShowPayment(true)
  }

  async function handlePayment(event: React.FormEvent) {
    event.preventDefault()
    if (!selectedInvoice) return
    setPaying(true)
    setError(null)
    try {
      await createPayment(selectedInvoice.id, Number(paymentAmount), paymentMethod)
      const [invoiceItems] = await Promise.all([getInvoices(), loadPayments()])
      const mapped = invoiceItems.map(mapInvoice)
      setInvoices(mapped)
      setSelectedInvoice(mapped.find((invoice) => invoice.id === selectedInvoice.id) ?? null)
      setShowPayment(false)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Paiement impossible")
    } finally {
      setPaying(false)
    }
  }

  const totalInvoiced = invoices.reduce((sum, invoice) => sum + invoice.amount, 0)
  const totalPaid = payments.reduce((sum, payment) => sum + payment.amount, 0)
  const totalPending = invoices.filter((invoice) => invoice.status === "En attente").reduce((sum, invoice) => sum + invoice.amount, 0)
  const totalOverdue = invoices.filter((invoice) => invoice.status === "En retard").reduce((sum, invoice) => sum + invoice.amount, 0)


  // ====================================================
  // DETAILS
  // ====================================================

  if (selectedInvoice) {

    return (
      <>
        <InvoiceDetails
          invoice={selectedInvoice}
          onBack={closeInvoiceDetails}
          payments={payments.filter((payment) => payment.invoice_id === selectedInvoice.id)}
          onAddPayment={openPayment}
          onPrint={() => printInvoice(selectedInvoice, payments.filter((payment) => payment.invoice_id === selectedInvoice.id))}
        />
        {showPayment && <PaymentModal amount={paymentAmount} method={paymentMethod} loading={paying} error={error} onAmountChange={setPaymentAmount} onMethodChange={setPaymentMethod} onClose={() => setShowPayment(false)} onSubmit={handlePayment} />}
      </>
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
          {invoices.length} factures au total
        </p>


        <button
          type="button"
          onClick={openCreateInvoice}
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
          max-md:grid-cols-2
          gap-[19px]
        "
      >

        <StatCard
          label="Total facturé"
          value={totalInvoiced.toLocaleString("fr-FR", { style: "currency", currency: "EUR" })}
        />

        <StatCard
          label="Payé"
          value={totalPaid.toLocaleString("fr-FR", { style: "currency", currency: "EUR" })}
          valueColor="text-[#16A34A]"
        />

        <StatCard
          label="En attente"
          value={totalPending.toLocaleString("fr-FR", { style: "currency", currency: "EUR" })}
          valueColor="text-[#D97706]"
        />

        <StatCard
          label="En retard"
          value={totalOverdue.toLocaleString("fr-FR", { style: "currency", currency: "EUR" })}
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

        {error && (
          <div className="border-b border-red-200 bg-red-50 px-[16px] py-[10px] text-[9px] text-red-600">
            {error}
          </div>
        )}

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
                      onClick={() => openInvoiceDetails(invoice)}
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
                      title="Imprimer ou enregistrer en PDF"
                      onClick={() => printInvoice(invoice, payments.filter((payment) => payment.invoice_id === invoice.id))}
                      className="
                        transition
                        hover:text-[#2563EB]
                      "
                    >
                      <DownloadIcon />
                    </button>

                  </div>

                </td>

              </tr>

            ))}

          </tbody>

        </table>

      </div>

      {showCreateInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <form onSubmit={handleCreateInvoice} className="w-[460px] rounded-[10px] bg-white p-[24px] shadow-xl">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-[20px] font-semibold text-[#0F172A]">Nouvelle facture</h2>
                <p className="mt-[5px] text-[13px] text-[#64748B]">Créez une facture à partir d'un devis.</p>
              </div>
              <button type="button" onClick={() => setShowCreateInvoice(false)} className="text-[20px] text-[#64748B] hover:text-[#0F172A]">×</button>
            </div>

            <div className="mt-[24px]">
              <label className="mb-[6px] block text-[13px] font-medium text-[#334155]">Devis</label>
              <select value={selectedQuoteId} onChange={(event) => setSelectedQuoteId(event.target.value)} className="h-[40px] w-full rounded-[6px] border border-[#CBD5E1] bg-white px-[11px] text-[14px] outline-none focus:border-[#2563EB]">
                {quotes.map((quote) => (
                  <option key={quote.id} value={quote.id}>Devis #{quote.id} — {quote.total.toLocaleString("fr-FR", { style: "currency", currency: "EUR" })}</option>
                ))}
              </select>
              {quotes.length === 0 && <div className="mt-[10px] rounded-[7px] bg-[#FFFBEB] p-[11px]"><p className="text-[12px] text-[#92400E]">Aucun devis non facturé n’est disponible.</p><button type="button" onClick={() => { setShowCreateInvoice(false); onNavigateQuotes() }} className="mt-[8px] text-[11px] font-semibold text-[#2563EB] hover:text-[#1D4ED8]">Accéder aux devis →</button></div>}
            </div>

            {error && <div className="mt-[15px] rounded-[6px] bg-red-50 px-[11px] py-[10px] text-[13px] text-red-600">{error}</div>}

            <div className="mt-[24px] flex justify-end gap-[8px]">
              <button type="button" onClick={() => setShowCreateInvoice(false)} disabled={creating} className="h-[40px] rounded-[6px] border border-[#CBD5E1] px-[16px] text-[13px] font-medium text-[#475569] hover:bg-[#F8FAFC] disabled:opacity-50">Annuler</button>
              <button type="submit" disabled={creating || quotes.length === 0} className="h-[40px] rounded-[6px] bg-[#2563EB] px-[18px] text-[13px] font-medium text-white hover:bg-[#1D4ED8] disabled:cursor-not-allowed disabled:opacity-50">{creating ? "Création..." : "Créer la facture"}</button>
            </div>
          </form>
        </div>
      )}

    </div>
  )
}


export default Invoices
