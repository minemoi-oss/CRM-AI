import { useEffect, useRef, useState, type FormEvent } from "react"

import {
  convertProspect,
  createProspect,
  deleteProspect,
  getProspects,
  updateProspect,
  type EditableProspectStatus,
  type Prospect,
  type ProspectInput,
  type ProspectPriority,
  type ProspectStatus,
} from "../../Services/api"

type ProspectFormState = {
  first_name: string
  last_name: string
  email: string
  phone: string
  organization: string
  notes: string
  status: EditableProspectStatus
  priority: ProspectPriority
}

type Confirmation = {
  action: "convert" | "delete"
  prospect: Prospect
}

const emptyForm: ProspectFormState = {
  first_name: "",
  last_name: "",
  email: "",
  phone: "",
  organization: "",
  notes: "",
  status: "new",
  priority: "medium",
}

const statusLabels: Record<ProspectStatus, string> = {
  new: "Nouveau",
  contacted: "Contacté",
  qualified: "Qualifié",
  lost: "Perdu",
  converted: "Converti",
}

const priorityLabels: Record<ProspectPriority, string> = {
  low: "Faible",
  medium: "Moyenne",
  high: "Haute",
}

const statusStyles: Record<ProspectStatus, string> = {
  new: "bg-[#EFF6FF] text-[#2563EB]",
  contacted: "bg-[#FFF7ED] text-[#C2410C]",
  qualified: "bg-[#F5F3FF] text-[#7C3AED]",
  lost: "bg-[#F1F5F9] text-[#64748B]",
  converted: "bg-[#F0FDF4] text-[#15803D]",
}

const priorityStyles: Record<ProspectPriority, string> = {
  low: "bg-[#94A3B8]",
  medium: "bg-[#F59E0B]",
  high: "bg-[#EF4444]",
}

const formatDate = (date: string) =>
  new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(date))

function ProspectFormModal({
  prospect,
  onClose,
  onSaved,
}: {
  prospect: Prospect | null
  onClose: () => void
  onSaved: (message: string) => void
}) {
  const [form, setForm] = useState<ProspectFormState>(
    prospect
      ? {
          first_name: prospect.first_name,
          last_name: prospect.last_name,
          email: prospect.email,
          phone: prospect.phone,
          organization: prospect.organization ?? "",
          notes: prospect.notes ?? "",
          status: prospect.status === "converted" ? "qualified" : prospect.status,
          priority: prospect.priority,
        }
      : emptyForm,
  )
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function updateField<K extends keyof ProspectFormState>(field: K, value: ProspectFormState[K]) {
    setForm((current) => ({ ...current, [field]: value }))
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaving(true)
    setError(null)

    const payload: ProspectInput = {
      first_name: form.first_name.trim(),
      last_name: form.last_name.trim(),
      email: form.email.trim(),
      phone: form.phone.trim(),
      organization: form.organization.trim() || null,
      notes: form.notes.trim() || null,
      status: form.status,
      priority: form.priority,
    }

    try {
      if (prospect) {
        await updateProspect(prospect.id, payload)
        onSaved("Le prospect a été mis à jour.")
      } else {
        await createProspect(payload)
        onSaved("Le prospect a été créé.")
      }
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Enregistrement impossible.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0F172A]/40 p-[16px]" role="dialog" aria-modal="true" aria-labelledby="prospect-form-title">
      <form onSubmit={save} className="max-h-[calc(100vh-32px)] w-full max-w-[620px] overflow-y-auto rounded-[14px] bg-white shadow-2xl">
        <div className="sticky top-0 z-10 flex items-start justify-between border-b border-[#E2E8F0] bg-white px-[24px] py-[20px]">
          <div>
            <h2 id="prospect-form-title" className="text-[20px] font-semibold text-[#0F172A]">
              {prospect ? "Modifier le prospect" : "Nouveau prospect"}
            </h2>
            <p className="mt-[5px] text-[12px] text-[#64748B]">
              Renseignez ses coordonnées et son niveau d’avancement commercial.
            </p>
          </div>
          <button type="button" onClick={onClose} disabled={saving} aria-label="Fermer" className="ml-[16px] text-[22px] leading-none text-[#64748B] hover:text-[#0F172A] disabled:opacity-50">
            ×
          </button>
        </div>

        <div className="space-y-[16px] px-[24px] py-[20px]">
          <div className="grid grid-cols-2 gap-[14px] max-sm:grid-cols-1">
            <label className="block text-[12px] font-medium text-[#334155]">
              Prénom <span className="text-[#EF4444]">*</span>
              <input autoFocus required minLength={2} maxLength={50} autoComplete="given-name" value={form.first_name} onChange={(event) => updateField("first_name", event.target.value)} className="mt-[6px] h-[40px] w-full rounded-[6px] border border-[#CBD5E1] px-[11px] text-[13px] outline-none focus:border-[#2563EB]" />
            </label>
            <label className="block text-[12px] font-medium text-[#334155]">
              Nom <span className="text-[#EF4444]">*</span>
              <input required minLength={2} maxLength={50} autoComplete="family-name" value={form.last_name} onChange={(event) => updateField("last_name", event.target.value)} className="mt-[6px] h-[40px] w-full rounded-[6px] border border-[#CBD5E1] px-[11px] text-[13px] outline-none focus:border-[#2563EB]" />
            </label>
          </div>

          <div className="grid grid-cols-2 gap-[14px] max-sm:grid-cols-1">
            <label className="block text-[12px] font-medium text-[#334155]">
              E-mail <span className="text-[#EF4444]">*</span>
              <input required type="email" maxLength={100} autoComplete="email" value={form.email} onChange={(event) => updateField("email", event.target.value)} className="mt-[6px] h-[40px] w-full rounded-[6px] border border-[#CBD5E1] px-[11px] text-[13px] outline-none focus:border-[#2563EB]" />
            </label>
            <label className="block text-[12px] font-medium text-[#334155]">
              Téléphone <span className="text-[#EF4444]">*</span>
              <input required minLength={8} maxLength={20} autoComplete="tel" value={form.phone} onChange={(event) => updateField("phone", event.target.value)} className="mt-[6px] h-[40px] w-full rounded-[6px] border border-[#CBD5E1] px-[11px] text-[13px] outline-none focus:border-[#2563EB]" />
            </label>
          </div>

          <label className="block text-[12px] font-medium text-[#334155]">
            Organisation
            <input maxLength={150} autoComplete="organization" placeholder="Entreprise ou organisation (facultatif)" value={form.organization} onChange={(event) => updateField("organization", event.target.value)} className="mt-[6px] h-[40px] w-full rounded-[6px] border border-[#CBD5E1] px-[11px] text-[13px] outline-none placeholder:text-[#94A3B8] focus:border-[#2563EB]" />
          </label>

          <div className="grid grid-cols-2 gap-[14px] max-sm:grid-cols-1">
            <label className="block text-[12px] font-medium text-[#334155]">
              Statut
              <select value={form.status} onChange={(event) => updateField("status", event.target.value as EditableProspectStatus)} className="mt-[6px] h-[40px] w-full rounded-[6px] border border-[#CBD5E1] bg-white px-[11px] text-[13px] outline-none focus:border-[#2563EB]">
                <option value="new">Nouveau</option>
                <option value="contacted">Contacté</option>
                <option value="qualified">Qualifié</option>
                <option value="lost">Perdu</option>
              </select>
            </label>
            <label className="block text-[12px] font-medium text-[#334155]">
              Priorité
              <select value={form.priority} onChange={(event) => updateField("priority", event.target.value as ProspectPriority)} className="mt-[6px] h-[40px] w-full rounded-[6px] border border-[#CBD5E1] bg-white px-[11px] text-[13px] outline-none focus:border-[#2563EB]">
                <option value="low">Faible</option>
                <option value="medium">Moyenne</option>
                <option value="high">Haute</option>
              </select>
            </label>
          </div>

          <label className="block text-[12px] font-medium text-[#334155]">
            Notes
            <textarea maxLength={5000} rows={4} placeholder="Contexte, besoin exprimé, prochaine action…" value={form.notes} onChange={(event) => updateField("notes", event.target.value)} className="mt-[6px] w-full resize-y rounded-[6px] border border-[#CBD5E1] px-[11px] py-[9px] text-[13px] outline-none placeholder:text-[#94A3B8] focus:border-[#2563EB]" />
          </label>

          {error && <div role="alert" className="rounded-[6px] border border-red-200 bg-red-50 px-[12px] py-[10px] text-[12px] text-red-700">{error}</div>}
        </div>

        <div className="sticky bottom-0 flex justify-end gap-[8px] border-t border-[#E2E8F0] bg-white px-[24px] py-[16px]">
          <button type="button" onClick={onClose} disabled={saving} className="h-[40px] rounded-[6px] border border-[#CBD5E1] px-[16px] text-[12px] font-medium text-[#475569] hover:bg-[#F8FAFC] disabled:opacity-50">Annuler</button>
          <button type="submit" disabled={saving} className="h-[40px] min-w-[126px] rounded-[6px] bg-[#2563EB] px-[18px] text-[12px] font-semibold text-white hover:bg-[#1D4ED8] disabled:opacity-60">
            {saving ? "Enregistrement…" : prospect ? "Mettre à jour" : "Créer le prospect"}
          </button>
        </div>
      </form>
    </div>
  )
}

function ConfirmationModal({
  confirmation,
  loading,
  error,
  onCancel,
  onConfirm,
}: {
  confirmation: Confirmation
  loading: boolean
  error: string | null
  onCancel: () => void
  onConfirm: () => void
}) {
  const isConversion = confirmation.action === "convert"
  const fullName = `${confirmation.prospect.first_name} ${confirmation.prospect.last_name}`

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0F172A]/40 p-[16px]" role="dialog" aria-modal="true" aria-labelledby="confirmation-title">
      <div className="w-full max-w-[440px] rounded-[14px] bg-white p-[24px] shadow-2xl">
        <div className={`flex h-[42px] w-[42px] items-center justify-center rounded-full ${isConversion ? "bg-[#F0FDF4] text-[#16A34A]" : "bg-[#FEF2F2] text-[#DC2626]"}`}>
          {isConversion ? (
            <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M19 8v6M16 11h6"/></svg>
          ) : (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 6h18M8 6V4h8v2M19 6l-1 15H6L5 6M10 11v6M14 11v6"/></svg>
          )}
        </div>
        <h2 id="confirmation-title" className="mt-[16px] text-[18px] font-semibold text-[#0F172A]">
          {isConversion ? "Convertir en client ?" : "Supprimer le prospect ?"}
        </h2>
        <p className="mt-[8px] text-[13px] leading-[1.55] text-[#64748B]">
          {isConversion
            ? `${fullName} sera ajouté à vos clients. Le prospect restera dans l’historique avec le statut « Converti » et ne pourra plus être modifié.`
            : `${fullName} sera définitivement supprimé de votre liste de prospects.`}
        </p>
        {error && <div role="alert" className="mt-[14px] rounded-[6px] border border-red-200 bg-red-50 px-[12px] py-[10px] text-[12px] text-red-700">{error}</div>}
        <div className="mt-[22px] flex justify-end gap-[8px]">
          <button type="button" onClick={onCancel} disabled={loading} className="h-[39px] rounded-[6px] border border-[#CBD5E1] px-[15px] text-[12px] font-medium text-[#475569] hover:bg-[#F8FAFC] disabled:opacity-50">Annuler</button>
          <button type="button" onClick={onConfirm} disabled={loading} className={`h-[39px] min-w-[116px] rounded-[6px] px-[16px] text-[12px] font-semibold text-white disabled:opacity-60 ${isConversion ? "bg-[#16A34A] hover:bg-[#15803D]" : "bg-[#DC2626] hover:bg-[#B91C1C]"}`}>
            {loading ? "Traitement…" : isConversion ? "Convertir" : "Supprimer"}
          </button>
        </div>
      </div>
    </div>
  )
}

function Prospects() {
  const [prospects, setProspects] = useState<Prospect[]>([])
  const [search, setSearch] = useState("")
  const [status, setStatus] = useState<ProspectStatus | "">("")
  const [priority, setPriority] = useState<ProspectPriority | "">("")
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [pages, setPages] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [editing, setEditing] = useState<Prospect | null>(null)
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null)
  const [mutationLoading, setMutationLoading] = useState(false)
  const [mutationError, setMutationError] = useState<string | null>(null)
  const latestRequest = useRef(0)

  async function load(
    pageNumber = page,
    values: { search?: string; status?: ProspectStatus | ""; priority?: ProspectPriority | "" } = {},
  ) {
    const requestId = ++latestRequest.current
    setLoading(true)
    setError(null)
    try {
      const data = await getProspects({
        search: values.search ?? search,
        status: values.status ?? status,
        priority: values.priority ?? priority,
        page: pageNumber,
        size: 10,
      })
      if (requestId !== latestRequest.current) return
      setProspects(data.items)
      setTotal(data.total)
      setPage(data.page)
      setPages(data.pages)
    } catch (reason) {
      if (requestId !== latestRequest.current) return
      setError(reason instanceof Error ? reason.message : "Impossible de charger les prospects.")
    } finally {
      if (requestId === latestRequest.current) setLoading(false)
    }
  }

  useEffect(() => {
    let active = true
    const requestId = ++latestRequest.current

    getProspects({ page: 1, size: 10 })
      .then((data) => {
        if (!active || requestId !== latestRequest.current) return
        setProspects(data.items)
        setTotal(data.total)
        setPage(data.page)
        setPages(data.pages)
      })
      .catch((reason: unknown) => {
        if (!active || requestId !== latestRequest.current) return
        setError(reason instanceof Error ? reason.message : "Impossible de charger les prospects.")
      })
      .finally(() => {
        if (active && requestId === latestRequest.current) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [])

  function resetFilters() {
    setSearch("")
    setStatus("")
    setPriority("")
    void load(1, { search: "", status: "", priority: "" })
  }

  async function confirmAction() {
    if (!confirmation) return
    setMutationLoading(true)
    setMutationError(null)
    try {
      if (confirmation.action === "convert") {
        await convertProspect(confirmation.prospect.id)
        setNotice(`${confirmation.prospect.first_name} ${confirmation.prospect.last_name} est maintenant client.`)
      } else {
        await deleteProspect(confirmation.prospect.id)
        setNotice("Le prospect a été supprimé.")
      }
      setConfirmation(null)
      const targetPage = confirmation.action === "delete" && prospects.length === 1 && page > 1 ? page - 1 : page
      await load(targetPage)
    } catch (reason) {
      setMutationError(reason instanceof Error ? reason.message : "Cette action n’a pas pu être effectuée.")
    } finally {
      setMutationLoading(false)
    }
  }

  function handleSaved(message: string) {
    setShowCreate(false)
    setEditing(null)
    setNotice(message)
    void load(editing ? page : 1)
  }

  const hasFilters = Boolean(search || status || priority)

  return (
    <div className="w-full">
      <div className="flex items-start justify-between gap-[20px] max-sm:flex-col">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.20em] text-[#2563EB]">PAGES</p>
          <h1 className="mt-[8px] text-[30px] font-bold leading-none text-[#0F172A]">Prospects</h1>
          <p className="mt-[10px] text-[13px] text-[#64748B]">Suivez vos opportunités avant de les convertir en clients.</p>
        </div>
        <button type="button" onClick={() => { setNotice(null); setShowCreate(true) }} className="mt-[5px] flex h-[38px] shrink-0 items-center gap-[7px] rounded-[6px] bg-[#2563EB] px-[16px] text-[11px] font-semibold text-white shadow-sm hover:bg-[#1D4ED8] active:scale-[0.98]">
          <span className="text-[17px] font-normal">+</span> Nouveau prospect
        </button>
      </div>

      {notice && (
        <div role="status" className="mt-[18px] flex items-center justify-between rounded-[7px] border border-emerald-200 bg-emerald-50 px-[13px] py-[10px] text-[11px] text-emerald-800">
          <span>{notice}</span>
          <button type="button" onClick={() => setNotice(null)} aria-label="Fermer la notification" className="ml-[12px] text-[16px] leading-none text-emerald-700">×</button>
        </div>
      )}

      <form onSubmit={(event) => { event.preventDefault(); void load(1) }} className="mt-[22px] flex flex-wrap items-end gap-[9px] rounded-[8px] border border-[#E2E8F0] bg-white p-[13px]">
        <label className="min-w-[220px] flex-1 text-[9px] font-semibold uppercase tracking-[0.08em] text-[#64748B]">
          Rechercher
          <div className="relative mt-[6px]">
            <svg className="absolute left-[11px] top-1/2 -translate-y-1/2 text-[#94A3B8]" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Nom, e-mail, organisation…" className="h-[38px] w-full rounded-[6px] border border-[#CBD5E1] pl-[34px] pr-[10px] text-[12px] font-normal normal-case tracking-normal text-[#0F172A] outline-none placeholder:text-[#94A3B8] focus:border-[#2563EB]" />
          </div>
        </label>
        <label className="w-[155px] text-[9px] font-semibold uppercase tracking-[0.08em] text-[#64748B] max-sm:w-full">
          Statut
          <select value={status} onChange={(event) => { const value = event.target.value as ProspectStatus | ""; setStatus(value); void load(1, { status: value }) }} className="mt-[6px] h-[38px] w-full rounded-[6px] border border-[#CBD5E1] bg-white px-[10px] text-[12px] font-normal normal-case tracking-normal text-[#334155] outline-none focus:border-[#2563EB]">
            <option value="">Tous les statuts</option>
            <option value="new">Nouveau</option>
            <option value="contacted">Contacté</option>
            <option value="qualified">Qualifié</option>
            <option value="lost">Perdu</option>
            <option value="converted">Converti</option>
          </select>
        </label>
        <label className="w-[155px] text-[9px] font-semibold uppercase tracking-[0.08em] text-[#64748B] max-sm:w-full">
          Priorité
          <select value={priority} onChange={(event) => { const value = event.target.value as ProspectPriority | ""; setPriority(value); void load(1, { priority: value }) }} className="mt-[6px] h-[38px] w-full rounded-[6px] border border-[#CBD5E1] bg-white px-[10px] text-[12px] font-normal normal-case tracking-normal text-[#334155] outline-none focus:border-[#2563EB]">
            <option value="">Toutes</option>
            <option value="low">Faible</option>
            <option value="medium">Moyenne</option>
            <option value="high">Haute</option>
          </select>
        </label>
        <button type="submit" disabled={loading} className="h-[38px] rounded-[6px] bg-[#2563EB] px-[15px] text-[11px] font-semibold text-white hover:bg-[#1D4ED8] disabled:opacity-60">Rechercher</button>
        {hasFilters && <button type="button" onClick={resetFilters} disabled={loading} className="h-[38px] rounded-[6px] border border-[#CBD5E1] px-[13px] text-[11px] font-medium text-[#475569] hover:bg-[#F8FAFC] disabled:opacity-60">Réinitialiser</button>}
      </form>

      <div className="mt-[14px] flex items-center justify-between">
        <p className="text-[11px] text-[#64748B]">{total} prospect{total > 1 ? "s" : ""} au total</p>
        {loading && <span className="text-[10px] text-[#2563EB]">Actualisation…</span>}
      </div>

      {error && !loading && (
        <div role="alert" className="mt-[14px] rounded-[7px] border border-red-200 bg-red-50 p-[16px] text-[12px] text-red-700">
          <p>{error}</p>
          <button type="button" onClick={() => void load(page)} className="mt-[8px] font-semibold text-red-800 underline">Réessayer</button>
        </div>
      )}

      <div className="mt-[10px] overflow-x-auto rounded-[8px] border border-[#DCE5F0] bg-white">
        <table className="w-full min-w-[920px] border-collapse">
          <thead>
            <tr className="h-[38px] border-b border-[#DCE5F0] bg-[#F1F5F9]">
              <th className="px-[14px] text-left text-[8px] font-semibold uppercase tracking-[0.08em] text-[#64748B]">Prospect</th>
              <th className="px-[10px] text-left text-[8px] font-semibold uppercase tracking-[0.08em] text-[#64748B]">Organisation</th>
              <th className="px-[10px] text-left text-[8px] font-semibold uppercase tracking-[0.08em] text-[#64748B]">Statut</th>
              <th className="px-[10px] text-left text-[8px] font-semibold uppercase tracking-[0.08em] text-[#64748B]">Priorité</th>
              <th className="px-[10px] text-left text-[8px] font-semibold uppercase tracking-[0.08em] text-[#64748B]">Créé le</th>
              <th className="px-[14px] text-right text-[8px] font-semibold uppercase tracking-[0.08em] text-[#64748B]">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading && prospects.length === 0 && (
              Array.from({ length: 5 }, (_, index) => (
                <tr key={index} className="h-[62px] border-b border-[#E2E8F0]">
                  <td colSpan={6} className="px-[14px]"><div className="h-[10px] animate-pulse rounded bg-[#E2E8F0]" style={{ width: `${62 + index * 4}%` }} /></td>
                </tr>
              ))
            )}
            {!error && !loading && prospects.length === 0 && (
              <tr>
                <td colSpan={6} className="px-[20px] py-[52px] text-center">
                  <div className="mx-auto flex h-[42px] w-[42px] items-center justify-center rounded-full bg-[#EFF6FF] text-[#2563EB]">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="9" cy="8" r="4"/><path d="M2.5 21a6.5 6.5 0 0 1 13 0M19 8v6M16 11h6"/></svg>
                  </div>
                  <p className="mt-[12px] text-[12px] font-semibold text-[#334155]">{hasFilters ? "Aucun résultat" : "Aucun prospect pour le moment"}</p>
                  <p className="mt-[4px] text-[10px] text-[#94A3B8]">{hasFilters ? "Modifiez vos critères de recherche." : "Ajoutez votre première opportunité commerciale."}</p>
                </td>
              </tr>
            )}
            {prospects.map((prospect) => {
              const converted = prospect.status === "converted"
              return (
                <tr key={prospect.id} className={`h-[62px] border-b border-[#E2E8F0] transition hover:bg-[#F8FAFC] ${converted ? "bg-[#FCFFFD]" : ""}`}>
                  <td className="px-[14px]">
                    <div className="flex items-center gap-[9px]">
                      <div className={`flex h-[31px] w-[31px] shrink-0 items-center justify-center rounded-full text-[9px] font-semibold ${converted ? "bg-[#DCFCE7] text-[#15803D]" : "bg-[#DBEAFE] text-[#2563EB]"}`}>{prospect.first_name.charAt(0)}{prospect.last_name.charAt(0)}</div>
                      <div className="min-w-0">
                        <p className="truncate text-[10px] font-semibold text-[#0F172A]">{prospect.first_name} {prospect.last_name}</p>
                        <p className="mt-[2px] truncate text-[8px] text-[#64748B]">{prospect.email} · {prospect.phone}</p>
                      </div>
                    </div>
                  </td>
                  <td className="max-w-[190px] px-[10px]">
                    <p className="truncate text-[9px] font-medium text-[#334155]">{prospect.organization || "—"}</p>
                    {prospect.notes && <p title={prospect.notes} className="mt-[2px] truncate text-[8px] text-[#94A3B8]">{prospect.notes}</p>}
                  </td>
                  <td className="px-[10px]"><span className={`inline-flex rounded-full px-[8px] py-[4px] text-[8px] font-semibold ${statusStyles[prospect.status]}`}>{statusLabels[prospect.status]}</span></td>
                  <td className="px-[10px]"><span className="inline-flex items-center gap-[6px] text-[9px] text-[#475569]"><span className={`h-[6px] w-[6px] rounded-full ${priorityStyles[prospect.priority]}`} />{priorityLabels[prospect.priority]}</span></td>
                  <td className="px-[10px] text-[9px] text-[#64748B]">{formatDate(prospect.created_at)}</td>
                  <td className="px-[14px]">
                    {converted ? (
                      <div className="text-right"><span className="text-[8px] font-medium text-[#15803D]">{prospect.customer_id ? `Client #${prospect.customer_id}` : "Conversion enregistrée"}</span></div>
                    ) : (
                      <div className="flex items-center justify-end gap-[10px] whitespace-nowrap">
                        <button type="button" onClick={() => { setNotice(null); setEditing(prospect) }} className="text-[9px] font-medium text-[#2563EB] hover:text-[#1D4ED8]">Modifier</button>
                        <button type="button" onClick={() => { setMutationError(null); setConfirmation({ action: "convert", prospect }) }} className="text-[9px] font-medium text-[#15803D] hover:text-[#166534]">Convertir</button>
                        <button type="button" onClick={() => { setMutationError(null); setConfirmation({ action: "delete", prospect }) }} className="text-[9px] font-medium text-[#DC2626] hover:text-[#B91C1C]">Supprimer</button>
                      </div>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {!error && pages > 0 && (
        <div className="mt-[18px] flex items-center justify-between gap-[12px] max-sm:flex-col">
          <p className="text-[10px] text-[#64748B]">Page {page} sur {pages}</p>
          <div className="flex items-center gap-[7px]">
            <button type="button" disabled={loading || page <= 1} onClick={() => void load(page - 1)} className="h-[34px] rounded-[6px] border border-[#CBD5E1] bg-white px-[13px] text-[10px] font-medium text-[#475569] hover:bg-[#F8FAFC] disabled:cursor-not-allowed disabled:opacity-40">Précédent</button>
            <span className="flex h-[34px] min-w-[34px] items-center justify-center rounded-[6px] bg-[#2563EB] px-[9px] text-[10px] font-semibold text-white">{page}</span>
            <button type="button" disabled={loading || page >= pages} onClick={() => void load(page + 1)} className="h-[34px] rounded-[6px] border border-[#CBD5E1] bg-white px-[13px] text-[10px] font-medium text-[#475569] hover:bg-[#F8FAFC] disabled:cursor-not-allowed disabled:opacity-40">Suivant</button>
          </div>
        </div>
      )}

      {showCreate && <ProspectFormModal prospect={null} onClose={() => setShowCreate(false)} onSaved={handleSaved} />}
      {editing && <ProspectFormModal prospect={editing} onClose={() => setEditing(null)} onSaved={handleSaved} />}
      {confirmation && <ConfirmationModal confirmation={confirmation} loading={mutationLoading} error={mutationError} onCancel={() => { if (!mutationLoading) setConfirmation(null) }} onConfirm={() => void confirmAction()} />}
    </div>
  )
}

export default Prospects
