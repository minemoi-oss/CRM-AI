import { useEffect, useState } from "react"
import {
  createQuoteWithItems,
  deleteQuote,
  getCustomers,
  getProducts,
  getQuotes,
  getServices,
  type Customer,
  type Product,
  type Quote,
  type QuoteLineInput,
  type Service,
} from "../../Services/api"

type ItemType = "product" | "service"
type DraftLine = { key: string; itemType: ItemType; itemId: string; quantity: number }

const money = (value: number) => value.toLocaleString("fr-FR", { style: "currency", currency: "EUR" })

function Quotes() {
  const [quotes, setQuotes] = useState<Quote[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [services, setServices] = useState<Service[]>([])
  const [showCreate, setShowCreate] = useState(false)
  const [customerId, setCustomerId] = useState("")
  const [lines, setLines] = useState<DraftLine[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function loadData() {
    const [quoteItems, customerData, productItems, serviceItems] = await Promise.all([
      getQuotes(),
      getCustomers("", 1, 100),
      getProducts(),
      getServices(),
    ])
    setQuotes(quoteItems)
    setCustomers(customerData.items)
    setProducts(productItems)
    setServices(serviceItems)
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadData().catch((reason) => setError(reason instanceof Error ? reason.message : "Chargement impossible"))
  }, [])

  function newLine(preferredType?: ItemType): DraftLine {
    const itemType = preferredType ?? (products.length > 0 ? "product" : "service")
    const catalog = itemType === "product" ? products : services
    return { key: `${Date.now()}-${Math.random()}`, itemType, itemId: catalog.length ? String(catalog[0].id) : "", quantity: 1 }
  }

  function openCreate() {
    setCustomerId(customers.length ? String(customers[0].id) : "")
    setLines([newLine()])
    setError(null)
    setShowCreate(true)
  }

  function updateLine(key: string, changes: Partial<DraftLine>) {
    setLines((items) => items.map((line) => line.key === key ? { ...line, ...changes } : line))
  }

  function changeLineType(line: DraftLine, itemType: ItemType) {
    const catalog = itemType === "product" ? products : services
    updateLine(line.key, { itemType, itemId: catalog.length ? String(catalog[0].id) : "", quantity: 1 })
  }

  function selectedItem(line: DraftLine): Product | Service | undefined {
    return line.itemType === "product"
      ? products.find((item) => item.id === Number(line.itemId))
      : services.find((item) => item.id === Number(line.itemId))
  }

  function unitPrice(line: DraftLine) {
    const item = selectedItem(line)
    return item ? ("price" in item ? item.price : 0) : 0
  }

  function isDecimalQuantity(line: DraftLine) {
    const item = selectedItem(line)
    return line.itemType === "service" && item && "pricing_type" in item && item.pricing_type === "hourly"
  }

  async function handleCreate(event: React.FormEvent) {
    event.preventDefault()
    if (!customerId || lines.length === 0 || lines.some((line) => !line.itemId || line.quantity <= 0)) return
    setLoading(true)
    setError(null)
    const items: QuoteLineInput[] = lines.map((line) => line.itemType === "product"
      ? { product_id: Number(line.itemId), quantity: line.quantity }
      : { service_id: Number(line.itemId), quantity: line.quantity })
    try {
      await createQuoteWithItems(Number(customerId), items)
      await loadData()
      setShowCreate(false)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Création impossible")
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete(quoteId: number) {
    if (!window.confirm("Supprimer ce devis ?")) return
    try {
      await deleteQuote(quoteId)
      await loadData()
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Suppression impossible")
    }
  }

  const customerName = (id: number) => {
    const customer = customers.find((item) => item.id === id)
    return customer ? `${customer.first_name} ${customer.last_name}` : `Client #${id}`
  }
  const estimatedTotal = lines.reduce((sum, line) => sum + unitPrice(line) * line.quantity, 0)
  const catalogAvailable = products.length > 0 || services.length > 0

  return (
    <div className="w-full">
      <div><p className="text-[10px] font-semibold uppercase tracking-[0.20em] text-[#2563EB]">PAGES</p><h1 className="mt-[8px] text-[30px] font-bold leading-none text-[#0F172A]">Devis</h1><p className="mt-[10px] text-[13px] text-[#64748B]">Créez des devis avec vos produits et vos services.</p></div>

      <div className="mt-[15px] flex items-center justify-between gap-4"><p className="text-[12px] text-[#64748B]">{quotes.length} devis au total</p><button type="button" onClick={openCreate} className="flex h-[34px] w-[197px] items-center justify-center gap-[8px] rounded-[6px] bg-[#2563EB] text-[9px] font-semibold text-white hover:bg-[#1D4ED8]">+ Nouveau devis</button></div>
      {error && !showCreate && <div className="mt-[16px] rounded-[6px] border border-red-200 bg-red-50 px-[12px] py-[10px] text-[9px] text-red-600">{error}</div>}

      <div className="mt-[23px] overflow-x-auto rounded-[8px] border border-[#DCE5F0] bg-white">
        <table className="w-full border-collapse"><thead><tr className="h-[37px] border-b border-[#DCE5F0] bg-[#F1F5F9]"><th className="w-[15%] text-left text-[8px] font-semibold uppercase text-[#64748B]">Numéro</th><th className="w-[30%] text-left text-[8px] font-semibold uppercase text-[#64748B]">Client</th><th className="w-[18%] text-left text-[8px] font-semibold uppercase text-[#64748B]">Montant</th><th className="w-[17%] text-left text-[8px] font-semibold uppercase text-[#64748B]">Statut</th><th className="w-[12%] text-left text-[8px] font-semibold uppercase text-[#64748B]">Date</th><th className="w-[8%] text-center text-[8px] font-semibold uppercase text-[#64748B]">Actions</th></tr></thead>
          <tbody>{quotes.map((quote) => <tr key={quote.id} className="h-[50px] border-b border-[#DCE5F0] hover:bg-[#F8FAFC]"><td className="text-[9px] font-semibold text-[#0F172A]">DEV-{quote.id}</td><td className="text-[9px] text-[#1E293B]">{customerName(quote.customer_id)}</td><td className="text-[9px] font-semibold text-[#1E293B]">{money(quote.total)}</td><td><span className="inline-flex min-w-[60px] justify-center rounded-full bg-[#FEF3C7] px-[9px] py-[4px] text-[8px] font-semibold text-[#D97706]">{quote.status}</span></td><td className="text-[8px] text-[#64748B]">{new Date(quote.created_at).toLocaleDateString("fr-FR")}</td><td className="text-center"><button type="button" onClick={() => handleDelete(quote.id)} className="text-[9px] font-medium text-[#DC2626] hover:text-[#991B1B]">Supprimer</button></td></tr>)}{quotes.length === 0 && <tr><td colSpan={6} className="h-[80px] text-center text-[10px] text-[#94A3B8]">Aucun devis pour le moment.</td></tr>}</tbody>
        </table>
      </div>

      {showCreate && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-[16px]" role="dialog" aria-modal="true">
        <form onSubmit={handleCreate} className="max-h-[calc(100vh-32px)] w-full max-w-[720px] overflow-y-auto rounded-[12px] bg-white p-[24px] shadow-xl">
          <div className="flex items-start justify-between gap-4"><div><h2 className="text-[20px] font-semibold text-[#0F172A]">Nouveau devis</h2><p className="mt-[5px] text-[13px] text-[#64748B]">Ajoutez une ou plusieurs lignes de produits et services.</p></div><button type="button" aria-label="Fermer" onClick={() => setShowCreate(false)} className="text-[20px] text-[#64748B] hover:text-[#0F172A]">×</button></div>

          <div className="mt-[22px]"><label className="mb-[6px] block text-[12px] font-medium text-[#334155]">Client</label><select value={customerId} onChange={(event) => setCustomerId(event.target.value)} className="h-[40px] w-full rounded-[6px] border border-[#CBD5E1] bg-white px-[11px] text-[13px] outline-none focus:border-[#2563EB]">{customers.map((customer) => <option key={customer.id} value={customer.id}>{customer.first_name} {customer.last_name}</option>)}</select></div>

          <div className="mt-[20px] space-y-[10px]">
            {lines.map((line, index) => {
              const item = selectedItem(line)
              const catalog = line.itemType === "product" ? products : services
              const hourly = isDecimalQuantity(line)
              return <div key={line.key} className="rounded-[9px] border border-[#E2E8F0] bg-[#F8FAFC] p-[13px]">
                <div className="mb-[10px] flex items-center justify-between"><span className="text-[10px] font-semibold text-[#475569]">Ligne {index + 1}</span>{lines.length > 1 && <button type="button" onClick={() => setLines((items) => items.filter((item) => item.key !== line.key))} className="text-[9px] font-semibold text-[#DC2626]">Retirer</button>}</div>
                <div className="grid grid-cols-[150px_1fr_120px_110px] gap-[10px] max-md:grid-cols-2">
                  <div><label className="mb-[5px] block text-[9px] font-medium text-[#64748B]">Type</label><select value={line.itemType} onChange={(event) => changeLineType(line, event.target.value as ItemType)} className="h-[38px] w-full rounded-[6px] border border-[#CBD5E1] bg-white px-[9px] text-[11px]"><option value="product" disabled={products.length === 0}>Produit</option><option value="service" disabled={services.length === 0}>Service</option></select></div>
                  <div><label className="mb-[5px] block text-[9px] font-medium text-[#64748B]">{line.itemType === "product" ? "Produit" : "Service"}</label><select value={line.itemId} onChange={(event) => updateLine(line.key, { itemId: event.target.value, quantity: 1 })} className="h-[38px] w-full rounded-[6px] border border-[#CBD5E1] bg-white px-[9px] text-[11px]"><option value="" disabled>Sélectionner</option>{catalog.map((catalogItem) => <option key={catalogItem.id} value={catalogItem.id}>{catalogItem.name}</option>)}</select></div>
                  <div><label className="mb-[5px] block text-[9px] font-medium text-[#64748B]">{hourly ? "Nombre d’heures" : "Quantité"}</label><input type="number" min={hourly ? 0.25 : 1} step={hourly ? 0.25 : 1} value={line.quantity} onChange={(event) => updateLine(line.key, { quantity: Math.max(hourly ? 0.25 : 1, Number(event.target.value)) })} className="h-[38px] w-full rounded-[6px] border border-[#CBD5E1] bg-white px-[9px] text-[11px]" /></div>
                  <div><label className="mb-[5px] block text-[9px] font-medium text-[#64748B]">Sous-total</label><div className="flex h-[38px] items-center rounded-[6px] bg-white px-[9px] text-[11px] font-semibold text-[#0F172A]">{money(unitPrice(line) * line.quantity)}</div></div>
                </div>
                {item && line.itemType === "service" && "pricing_type" in item && <p className="mt-[8px] text-[9px] text-[#64748B]">{item.pricing_type === "hourly" ? `${money(item.price)} par heure` : `${money(item.price)} par forfait`}{item.duration ? ` · durée indicative ${item.duration} min` : ""}</p>}
              </div>
            })}
          </div>

          {catalogAvailable && <button type="button" onClick={() => setLines((items) => [...items, newLine()])} className="mt-[11px] h-[34px] rounded-[6px] border border-[#BFDBFE] bg-[#EFF6FF] px-[13px] text-[10px] font-semibold text-[#2563EB] hover:bg-[#DBEAFE]">+ Ajouter une ligne</button>}
          {(customers.length === 0 || !catalogAvailable) && <div className="mt-[15px] rounded-[6px] bg-amber-50 px-[11px] py-[10px] text-[12px] text-[#D97706]">Il faut au moins un client et un produit ou service.</div>}
          {error && <div className="mt-[15px] rounded-[6px] bg-red-50 px-[11px] py-[10px] text-[12px] text-red-600">{error}</div>}

          <div className="mt-[22px] flex items-center justify-between border-t border-[#E2E8F0] pt-[18px]"><div><span className="text-[10px] text-[#64748B]">Total estimé</span><p className="mt-[3px] text-[20px] font-bold text-[#0F172A]">{money(estimatedTotal)}</p></div><div className="flex gap-[8px]"><button type="button" onClick={() => setShowCreate(false)} disabled={loading} className="h-[40px] rounded-[6px] border border-[#CBD5E1] px-[16px] text-[13px] font-medium text-[#475569] hover:bg-[#F8FAFC] disabled:opacity-50">Annuler</button><button type="submit" disabled={loading || !customerId || !catalogAvailable || lines.some((line) => !line.itemId)} className="h-[40px] rounded-[6px] bg-[#2563EB] px-[18px] text-[13px] font-medium text-white hover:bg-[#1D4ED8] disabled:cursor-not-allowed disabled:opacity-50">{loading ? "Création..." : "Créer le devis"}</button></div></div>
        </form>
      </div>}
    </div>
  )
}

export default Quotes
