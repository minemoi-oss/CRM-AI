import { useEffect, useState } from "react"
import { createProduct, deleteProduct, getProducts, updateProduct, type Product } from "../../Services/api"

const emptyForm = { name: "", description: "", price: "", stock: "0" }

function Products() {
  const [products, setProducts] = useState<Product[]>([])
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Product | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function loadProducts() {
    setProducts(await getProducts())
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadProducts().catch((reason) => setError(reason instanceof Error ? reason.message : "Chargement impossible"))
  }, [])

  function openCreate() {
    setEditing(null)
    setForm(emptyForm)
    setError(null)
    setShowForm(true)
  }

  function openEdit(product: Product) {
    setEditing(product)
    setForm({ name: product.name, description: product.description ?? "", price: String(product.price), stock: String(product.stock) })
    setError(null)
    setShowForm(true)
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setLoading(true)
    setError(null)
    const data = { name: form.name, description: form.description || null, price: Number(form.price), stock: Number(form.stock) }
    try {
      if (editing) await updateProduct(editing.id, data)
      else await createProduct(data)
      await loadProducts()
      setShowForm(false)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Enregistrement impossible")
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete(productId: number) {
    if (!window.confirm("Supprimer ce produit ?")) return
    try {
      await deleteProduct(productId)
      await loadProducts()
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Suppression impossible")
    }
  }

  return (
    <div className="w-full">
      <div><p className="text-[10px] font-semibold uppercase tracking-[0.20em] text-[#2563EB]">PAGES</p><h1 className="mt-[8px] text-[30px] font-bold leading-none text-[#0F172A]">Produits</h1><p className="mt-[10px] text-[13px] text-[#64748B]">Gérez les produits utilisés dans vos devis.</p></div>

      <div className="mt-[15px] flex items-center justify-between"><p className="text-[12px] text-[#64748B]">{products.length} produits au total</p><button type="button" onClick={openCreate} className="flex h-[34px] w-[197px] items-center justify-center rounded-[6px] bg-[#2563EB] text-[9px] font-semibold text-white hover:bg-[#1D4ED8]">+ Nouveau produit</button></div>
      {error && !showForm && <div className="mt-[16px] rounded-[6px] border border-red-200 bg-red-50 px-[12px] py-[10px] text-[9px] text-red-600">{error}</div>}

      <div className="mt-[23px] overflow-hidden border border-[#DCE5F0] bg-white">
        <table className="w-full border-collapse">
          <thead><tr className="h-[37px] border-b border-[#DCE5F0] bg-[#F1F5F9]"><th className="w-[25%] text-left text-[8px] font-semibold uppercase text-[#64748B]">Produit</th><th className="w-[30%] text-left text-[8px] font-semibold uppercase text-[#64748B]">Description</th><th className="w-[15%] text-left text-[8px] font-semibold uppercase text-[#64748B]">Prix</th><th className="w-[12%] text-left text-[8px] font-semibold uppercase text-[#64748B]">Stock</th><th className="w-[18%] text-center text-[8px] font-semibold uppercase text-[#64748B]">Actions</th></tr></thead>
          <tbody>
            {products.map((product) => <tr key={product.id} className="h-[50px] border-b border-[#DCE5F0] hover:bg-[#F8FAFC]"><td className="text-[9px] font-semibold text-[#0F172A]">{product.name}</td><td className="text-[9px] text-[#64748B]">{product.description || "—"}</td><td className="text-[9px] font-semibold text-[#1E293B]">{product.price.toLocaleString("fr-FR", { style: "currency", currency: "EUR" })}</td><td className="text-[9px] text-[#64748B]">{product.stock}</td><td><div className="flex justify-center gap-[12px]"><button type="button" onClick={() => openEdit(product)} className="text-[9px] font-medium text-[#2563EB]">Modifier</button><button type="button" onClick={() => handleDelete(product.id)} className="text-[9px] font-medium text-[#DC2626]">Supprimer</button></div></td></tr>)}
            {products.length === 0 && <tr><td colSpan={5} className="h-[80px] text-center text-[10px] text-[#94A3B8]">Aucun produit. Créez votre premier produit.</td></tr>}
          </tbody>
        </table>
      </div>

      {showForm && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30"><form onSubmit={handleSubmit} className="w-[460px] rounded-[10px] bg-white p-[24px] shadow-xl">
        <div className="flex items-start justify-between"><div><h2 className="text-[20px] font-semibold text-[#0F172A]">{editing ? "Modifier le produit" : "Nouveau produit"}</h2><p className="mt-[5px] text-[13px] text-[#64748B]">Renseignez les informations du produit.</p></div><button type="button" onClick={() => setShowForm(false)} className="text-[20px] text-[#64748B] hover:text-[#0F172A]">×</button></div>
        <div className="mt-[24px] space-y-[15px]">
          <div><label className="mb-[6px] block text-[13px] font-medium text-[#334155]">Nom</label><input required minLength={2} maxLength={100} value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} className="h-[40px] w-full rounded-[6px] border border-[#CBD5E1] px-[11px] text-[14px] outline-none focus:border-[#2563EB]" /></div>
          <div><label className="mb-[6px] block text-[13px] font-medium text-[#334155]">Description</label><textarea maxLength={255} value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} className="min-h-[76px] w-full rounded-[6px] border border-[#CBD5E1] px-[11px] py-[9px] text-[14px] outline-none focus:border-[#2563EB]" /></div>
          <div className="grid grid-cols-2 gap-[15px]"><div><label className="mb-[6px] block text-[13px] font-medium text-[#334155]">Prix</label><input required type="number" min="0.01" step="0.01" value={form.price} onChange={(event) => setForm({ ...form, price: event.target.value })} className="h-[40px] w-full rounded-[6px] border border-[#CBD5E1] px-[11px] text-[14px] outline-none focus:border-[#2563EB]" /></div><div><label className="mb-[6px] block text-[13px] font-medium text-[#334155]">Stock</label><input required type="number" min="0" value={form.stock} onChange={(event) => setForm({ ...form, stock: event.target.value })} className="h-[40px] w-full rounded-[6px] border border-[#CBD5E1] px-[11px] text-[14px] outline-none focus:border-[#2563EB]" /></div></div>
        </div>
        {error && <div className="mt-[15px] rounded-[6px] bg-red-50 px-[11px] py-[10px] text-[12px] text-red-600">{error}</div>}
        <div className="mt-[24px] flex justify-end gap-[8px]"><button type="button" onClick={() => setShowForm(false)} disabled={loading} className="h-[40px] rounded-[6px] border border-[#CBD5E1] px-[16px] text-[13px] font-medium text-[#475569] hover:bg-[#F8FAFC] disabled:opacity-50">Annuler</button><button type="submit" disabled={loading} className="h-[40px] rounded-[6px] bg-[#2563EB] px-[18px] text-[13px] font-medium text-white hover:bg-[#1D4ED8] disabled:opacity-50">{loading ? "Enregistrement..." : "Enregistrer"}</button></div>
      </form></div>}
    </div>
  )
}

export default Products
