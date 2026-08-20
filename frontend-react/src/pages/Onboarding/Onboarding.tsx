import { useState } from "react"
import { createCompany } from "../../Services/api"

function Onboarding({ onComplete }: { onComplete: () => void }) {
  const [form, setForm] = useState({ name: "", email: "", phone: "", website: "" })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    setLoading(true)
    setError(null)
    try {
      await createCompany({ ...form, website: form.website || null })
      onComplete()
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Création impossible")
    } finally {
      setLoading(false)
    }
  }

  const fieldClass = "h-[42px] w-full rounded-[6px] border border-[#CBD5E1] px-[12px] outline-none focus:border-[#2563EB]"
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F8FAFC] px-[16px]">
      <form onSubmit={submit} className="w-full max-w-[460px] rounded-[16px] border border-[#E2E8F0] bg-white p-[clamp(20px,5vw,32px)] shadow-[0_20px_50px_rgba(15,23,42,0.08)]">
        <div className="flex h-[42px] w-[42px] items-center justify-center rounded-[12px] bg-[#2563EB] text-[16px] font-bold text-white">M</div>
        <p className="mt-[24px] text-[10px] font-semibold uppercase tracking-[0.18em] text-[#2563EB]">Mine CRM AI</p>
        <h1 className="mt-[8px] text-[clamp(23px,5vw,28px)] font-bold leading-tight text-[#0F172A]">Configurez votre entreprise</h1>
        <p className="mt-[8px] text-[13px] text-[#64748B]">Personnalisez votre espace CRM en quelques secondes.</p>
        <div className="mt-[24px] space-y-[16px]">
          <div><label className="mb-[6px] block text-[12px] font-medium text-[#334155]">Nom de l'entreprise</label><input required minLength={2} value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} className={fieldClass} /></div>
          <div><label className="mb-[6px] block text-[12px] font-medium text-[#334155]">Email professionnel</label><input required type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} className={fieldClass} /></div>
          <div><label className="mb-[6px] block text-[12px] font-medium text-[#334155]">Téléphone</label><input required minLength={8} value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} className={fieldClass} /></div>
          <div><label className="mb-[6px] block text-[12px] font-medium text-[#334155]">Site web (optionnel)</label><input type="url" value={form.website} onChange={(event) => setForm({ ...form, website: event.target.value })} className={fieldClass} /></div>
        </div>
        {error && <div className="mt-[16px] rounded-[6px] bg-red-50 px-[12px] py-[10px] text-[12px] text-red-600">{error}</div>}
        <button disabled={loading} className="mt-[24px] h-[42px] w-full rounded-[8px] bg-[#2563EB] text-[13px] font-semibold text-white hover:bg-[#1D4ED8] disabled:opacity-50">{loading ? "Configuration..." : "Créer mon espace"}</button>
      </form>
    </div>
  )
}

export default Onboarding
