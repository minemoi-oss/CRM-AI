import { useEffect, useState } from "react"
import { createService, deleteService, getServices, updateService, type Service, type ServiceInput } from "../../Services/api"

type ServiceForm = {
  name: string
  description: string
  pricing_type: "fixed" | "hourly"
  price: string
  duration: string
}

const emptyForm: ServiceForm = { name: "", description: "", pricing_type: "fixed", price: "", duration: "" }
const money = (value: number) => value.toLocaleString("fr-FR", { style: "currency", currency: "EUR" })

function Services() {
  const [services, setServices] = useState<Service[]>([])
  const [editing, setEditing] = useState<Service | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState<ServiceForm>(emptyForm)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function load() {
    setServices(await getServices())
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load().catch((reason) => setError(reason instanceof Error ? reason.message : "Chargement impossible"))
  }, [])

  function open(service?: Service) {
    setEditing(service ?? null)
    setForm(service ? {
      name: service.name,
      description: service.description ?? "",
      pricing_type: service.pricing_type,
      price: String(service.price),
      duration: service.duration === null ? "" : String(service.duration),
    } : emptyForm)
    setError(null)
    setShowForm(true)
  }

  async function save(event: React.FormEvent) {
    event.preventDefault()
    setLoading(true)
    setError(null)
    const data: ServiceInput = {
      name: form.name.trim(),
      description: form.description.trim() || null,
      pricing_type: form.pricing_type,
      price: Number(form.price),
      duration: form.duration.trim() ? Number(form.duration) : null,
    }
    try {
      if (editing) await updateService(editing.id, data)
      else await createService(data)
      await load()
      setShowForm(false)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Enregistrement impossible")
    } finally {
      setLoading(false)
    }
  }

  async function remove(id: number) {
    if (!window.confirm("Supprimer ce service ?")) return
    try {
      await deleteService(id)
      await load()
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Suppression impossible")
    }
  }

  return (
    <div className="w-full">
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-[0.20em] text-[#2563EB]">PAGES</p>
        <h1 className="mt-[8px] text-[30px] font-bold leading-none text-[#0F172A]">Services</h1>
        <p className="mt-[10px] text-[13px] text-[#64748B]">Gérez les prestations proposées par votre entreprise.</p>
      </div>

      <div className="mt-[15px] flex items-center justify-between gap-4">
        <p className="text-[12px] text-[#64748B]">{services.length} service{services.length > 1 ? "s" : ""} au total</p>
        <button type="button" onClick={() => open()} className="h-[34px] w-[197px] rounded-[6px] bg-[#2563EB] text-[9px] font-semibold text-white hover:bg-[#1D4ED8]">+ Nouveau service</button>
      </div>

      {error && !showForm && <div className="mt-[16px] rounded-[6px] border border-red-200 bg-red-50 px-[12px] py-[10px] text-[9px] text-red-600">{error}</div>}

      <div className="mt-[23px] overflow-x-auto rounded-[8px] border border-[#DCE5F0] bg-white">
        <table className="w-full border-collapse">
          <thead><tr className="h-[37px] border-b border-[#DCE5F0] bg-[#F1F5F9]"><th className="text-left text-[8px] font-semibold uppercase text-[#64748B]">Service</th><th className="text-left text-[8px] font-semibold uppercase text-[#64748B]">Description</th><th className="text-left text-[8px] font-semibold uppercase text-[#64748B]">Type</th><th className="text-left text-[8px] font-semibold uppercase text-[#64748B]">Tarif</th><th className="text-left text-[8px] font-semibold uppercase text-[#64748B]">Durée indicative</th><th className="text-center text-[8px] font-semibold uppercase text-[#64748B]">Actions</th></tr></thead>
          <tbody>
            {services.map((service) => <tr key={service.id} className="h-[50px] border-b border-[#DCE5F0] hover:bg-[#F8FAFC]"><td className="text-[9px] font-semibold text-[#0F172A]">{service.name}</td><td className="text-[9px] text-[#64748B]">{service.description || "—"}</td><td><span className={`rounded-full px-[8px] py-[4px] text-[8px] font-semibold ${service.pricing_type === "fixed" ? "bg-[#EFF6FF] text-[#2563EB]" : "bg-[#F5F3FF] text-[#7C3AED]"}`}>{service.pricing_type === "fixed" ? "Prix fixe" : "Horaire"}</span></td><td className="text-[9px] font-semibold text-[#1E293B]">{money(service.price)}{service.pricing_type === "hourly" ? " / h" : " / forfait"}</td><td className="text-[9px] text-[#64748B]">{service.duration === null ? "—" : `${service.duration} min`}</td><td><div className="flex justify-center gap-[12px]"><button type="button" onClick={() => open(service)} className="text-[9px] text-[#2563EB]">Modifier</button><button type="button" onClick={() => remove(service.id)} className="text-[9px] text-[#DC2626]">Supprimer</button></div></td></tr>)}
            {services.length === 0 && <tr><td colSpan={6} className="h-[80px] text-center text-[10px] text-[#94A3B8]">Aucun service pour le moment.</td></tr>}
          </tbody>
        </table>
      </div>

      {showForm && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-[16px]" role="dialog" aria-modal="true">
        <form onSubmit={save} className="w-full max-w-[500px] rounded-[16px] bg-white p-[24px] shadow-xl">
          <div className="flex justify-between gap-4"><div><h2 className="text-[20px] font-semibold text-[#0F172A]">{editing ? "Modifier le service" : "Nouveau service"}</h2><p className="mt-[5px] text-[13px] text-[#64748B]">Choisissez un prix fixe ou une facturation à l’heure.</p></div><button type="button" aria-label="Fermer" onClick={() => setShowForm(false)} className="text-[20px] text-[#64748B]">×</button></div>

          <div className="mt-[24px] space-y-[15px]">
            <div><label className="mb-[6px] block text-[13px] font-medium text-[#334155]">Nom</label><input required minLength={2} value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} className="h-[40px] w-full rounded-[6px] border border-[#CBD5E1] px-[11px] outline-none focus:border-[#2563EB]" /></div>
            <div><label className="mb-[6px] block text-[13px] font-medium text-[#334155]">Description</label><textarea value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} className="min-h-[76px] w-full rounded-[6px] border border-[#CBD5E1] px-[11px] py-[9px] outline-none focus:border-[#2563EB]" /></div>

            <fieldset><legend className="mb-[7px] text-[13px] font-medium text-[#334155]">Mode de facturation</legend><div className="grid grid-cols-2 rounded-[8px] bg-[#F1F5F9] p-[4px]">{(["fixed", "hourly"] as const).map((type) => <button key={type} type="button" onClick={() => setForm({ ...form, pricing_type: type })} className={`h-[36px] rounded-[6px] text-[11px] font-semibold transition ${form.pricing_type === type ? "bg-white text-[#2563EB] shadow-sm" : "text-[#64748B]"}`}>{type === "fixed" ? "Prix fixe" : "Tarif horaire"}</button>)}</div></fieldset>

            <div className="grid grid-cols-2 gap-[16px] max-sm:grid-cols-1">
              <div><label className="mb-[6px] block text-[13px] font-medium text-[#334155]">{form.pricing_type === "fixed" ? "Prix du forfait (€)" : "Tarif par heure (€)"}</label><input required type="number" min="0.01" step="0.01" value={form.price} onChange={(event) => setForm({ ...form, price: event.target.value })} className="h-[40px] w-full rounded-[6px] border border-[#CBD5E1] px-[11px] outline-none focus:border-[#2563EB]" /></div>
              <div><label className="mb-[6px] block text-[13px] font-medium text-[#334155]">Durée indicative (min)</label><input type="number" min="1" placeholder="Facultatif" value={form.duration} onChange={(event) => setForm({ ...form, duration: event.target.value })} className="h-[40px] w-full rounded-[6px] border border-[#CBD5E1] px-[11px] outline-none focus:border-[#2563EB]" /></div>
            </div>
            <p className="text-[10px] text-[#94A3B8]">La durée est informative. Le prix fixe reste inchangé ; un service horaire est multiplié par le nombre d’heures dans le devis.</p>
          </div>

          {error && <div className="mt-[15px] rounded-[6px] bg-red-50 px-[11px] py-[10px] text-[12px] text-red-600">{error}</div>}
          <div className="mt-[24px] flex justify-end gap-[8px]"><button type="button" onClick={() => setShowForm(false)} disabled={loading} className="h-[40px] rounded-[6px] border border-[#CBD5E1] px-[16px] text-[13px] disabled:opacity-50">Annuler</button><button type="submit" disabled={loading} className="h-[40px] rounded-[6px] bg-[#2563EB] px-[18px] text-[13px] text-white disabled:opacity-50">{loading ? "Enregistrement..." : "Enregistrer"}</button></div>
        </form>
      </div>}
    </div>
  )
}

export default Services
