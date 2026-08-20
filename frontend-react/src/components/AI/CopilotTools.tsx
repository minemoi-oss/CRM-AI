import { useEffect, useRef, useState, type FormEvent } from "react"
import {
  createAIEmailDraft,
  searchAIClients,
  type AIClient,
  type AIEmailDraftInput,
  type AIEmailDraftResponse,
  type CopilotActiveEntity,
  type CopilotNavigationTarget,
} from "../../Services/ai"
import Icon from "../UI/Icon"

export type CopilotToolMode = "search" | "email" | null

interface CopilotToolsProps {
  mode: CopilotToolMode
  activeEntity: CopilotActiveEntity | null
  disabled?: boolean
  onModeChange: (mode: CopilotToolMode) => void
  onNavigate: (target: CopilotNavigationTarget) => void
  onEmailDraft: (draft: AIEmailDraftResponse) => void
}

function clientName(client: AIClient) {
  const composed = `${client.first_name ?? ""} ${client.last_name ?? ""}`.trim()
  return client.full_name?.trim() || composed || `Client #${client.id}`
}

function isAbortError(reason: unknown) {
  return reason instanceof DOMException && reason.name === "AbortError"
}

function readableError(reason: unknown) {
  return reason instanceof Error ? reason.message : "Cette action n'a pas pu être terminée."
}

export default function CopilotTools({
  mode,
  activeEntity,
  disabled = false,
  onModeChange,
  onNavigate,
  onEmailDraft,
}: CopilotToolsProps) {
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<AIClient[]>([])
  const [selectedClient, setSelectedClient] = useState<AIClient | null>(null)
  const [objective, setObjective] = useState("")
  const [tone, setTone] = useState<AIEmailDraftInput["tone"]>("professional")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const requestRef = useRef<AbortController | null>(null)

  useEffect(() => () => requestRef.current?.abort(), [])

  const activeClient: AIClient | null = activeEntity?.type === "customer"
    ? { id: activeEntity.id, full_name: activeEntity.label || `Client #${activeEntity.id}` }
    : null
  const emailClient = selectedClient ?? activeClient

  function changeMode(nextMode: CopilotToolMode) {
    requestRef.current?.abort()
    setBusy(false)
    setError(null)
    if (nextMode === "email") setSelectedClient(null)
    onModeChange(nextMode)
  }

  async function search(event: FormEvent) {
    event.preventDefault()
    const cleanQuery = query.trim()
    if (cleanQuery.length < 2) {
      setError("Saisissez au moins 2 caractères.")
      return
    }
    requestRef.current?.abort()
    const controller = new AbortController()
    requestRef.current = controller
    setBusy(true)
    setError(null)
    try {
      const response = await searchAIClients(cleanQuery, 10, controller.signal)
      setResults(response.items)
      if (response.items.length === 0) setError("Aucun client ne correspond à cette recherche.")
    } catch (reason) {
      if (!isAbortError(reason)) setError(readableError(reason))
    } finally {
      if (requestRef.current === controller) {
        requestRef.current = null
        setBusy(false)
      }
    }
  }

  async function createDraft(event: FormEvent) {
    event.preventDefault()
    const cleanObjective = objective.trim()
    if (!emailClient) {
      setError("Recherchez et sélectionnez d'abord un client.")
      return
    }
    if (cleanObjective.length < 2) {
      setError("Précisez l'objectif de l'email.")
      return
    }
    requestRef.current?.abort()
    const controller = new AbortController()
    requestRef.current = controller
    setBusy(true)
    setError(null)
    try {
      const draft = await createAIEmailDraft({
        customer_id: emailClient.id,
        objective: cleanObjective,
        tone,
        language: "fr",
      }, controller.signal)
      onEmailDraft(draft)
      setObjective("")
      onModeChange(null)
    } catch (reason) {
      if (!isAbortError(reason)) setError(readableError(reason))
    } finally {
      if (requestRef.current === controller) {
        requestRef.current = null
        setBusy(false)
      }
    }
  }

  function chooseForEmail(client: AIClient) {
    setSelectedClient(client)
    setError(null)
    onModeChange("email")
  }

  return (
    <section className="mb-[11px] rounded-[10px] border border-[#DBEAFE] bg-white p-[10px] shadow-[0_3px_12px_rgba(15,23,42,0.03)]" aria-label="Actions rapides de Mine Copilot">
      <div className="flex items-center gap-[6px]">
        <button type="button" disabled={disabled} onClick={() => changeMode(mode === "search" ? null : "search")} aria-pressed={mode === "search"} className={`flex h-[31px] flex-1 items-center justify-center gap-[6px] rounded-[7px] text-[8px] font-semibold transition disabled:opacity-50 ${mode === "search" ? "bg-[#2563EB] text-white" : "bg-[#EFF6FF] text-[#2563EB] hover:bg-[#DBEAFE]"}`}><Icon name="search" size={12} /> Trouver un client</button>
        <button type="button" disabled={disabled} onClick={() => changeMode(mode === "email" ? null : "email")} aria-pressed={mode === "email"} className={`flex h-[31px] flex-1 items-center justify-center gap-[6px] rounded-[7px] text-[8px] font-semibold transition disabled:opacity-50 ${mode === "email" ? "bg-[#2563EB] text-white" : "bg-[#EFF6FF] text-[#2563EB] hover:bg-[#DBEAFE]"}`}><Icon name="mail" size={12} /> Créer un email</button>
      </div>

      {mode === "search" && (
        <div className="mt-[9px] border-t border-[#E2E8F0] pt-[9px]">
          <form onSubmit={(event) => void search(event)} className="flex gap-[6px]">
            <label htmlFor="copilot-client-search" className="sr-only">Nom, email ou téléphone du client</label>
            <input id="copilot-client-search" value={query} onChange={(event) => setQuery(event.target.value)} autoComplete="off" placeholder="Nom, email ou téléphone..." className="h-[34px] min-w-0 flex-1 rounded-[7px] border border-[#CBD5E1] px-[9px] text-[9px] text-[#0F172A] outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-[#DBEAFE]" />
            <button type="submit" disabled={busy || disabled} className="h-[34px] rounded-[7px] bg-[#0F172A] px-[10px] text-[8px] font-semibold text-white disabled:opacity-50">{busy ? "Recherche..." : "Rechercher"}</button>
          </form>
          <p className="mt-[5px] text-[7px] text-[#94A3B8]">Recherche directe dans votre CRM · 0 jeton IA</p>
          {results.length > 0 && <div className="mt-[7px] max-h-[190px] space-y-[5px] overflow-y-auto">{results.map((client) => <article key={client.id} className="flex items-center gap-[7px] rounded-[7px] border border-[#E2E8F0] bg-[#F8FAFC] p-[8px]"><span className="flex h-[25px] w-[25px] shrink-0 items-center justify-center rounded-full bg-[#DBEAFE] text-[8px] font-bold text-[#2563EB]">{clientName(client).slice(0, 2).toUpperCase()}</span><div className="min-w-0 flex-1"><p className="truncate text-[9px] font-semibold text-[#0F172A]">{clientName(client)}</p><p className="mt-[2px] truncate text-[7px] text-[#64748B]">{client.email || client.phone || `Client #${client.id}`}</p></div><button type="button" onClick={() => chooseForEmail(client)} className="rounded-[6px] bg-[#EFF6FF] px-[7px] py-[5px] text-[7px] font-semibold text-[#2563EB]">Email</button><button type="button" onClick={() => onNavigate({ page: "clients", entity_type: "customer", entity_id: client.id, label: clientName(client) })} className="rounded-[6px] border border-[#CBD5E1] bg-white px-[7px] py-[5px] text-[7px] font-semibold text-[#475569]">Ouvrir</button></article>)}</div>}
        </div>
      )}

      {mode === "email" && (
        <form onSubmit={(event) => void createDraft(event)} className="mt-[9px] space-y-[8px] border-t border-[#E2E8F0] pt-[9px]">
          {emailClient ? <div className="flex items-center justify-between gap-[8px] rounded-[7px] bg-[#EFF6FF] px-[9px] py-[7px]"><div className="min-w-0"><p className="text-[7px] font-medium uppercase tracking-[0.06em] text-[#60A5FA]">Destinataire</p><p className="mt-[2px] truncate text-[9px] font-semibold text-[#1D4ED8]">{clientName(emailClient)}</p></div><button type="button" onClick={() => { setSelectedClient(null); setResults([]); setQuery(""); onModeChange("search") }} className="text-[7px] font-semibold text-[#2563EB] underline">Changer</button></div> : <button type="button" onClick={() => onModeChange("search")} className="flex w-full items-center justify-center gap-[5px] rounded-[7px] border border-dashed border-[#93C5FD] bg-[#EFF6FF] px-[9px] py-[8px] text-[8px] font-semibold text-[#2563EB]"><Icon name="search" size={11} /> Sélectionner un client</button>}
          <div><label htmlFor="copilot-email-objective" className="text-[8px] font-semibold text-[#475569]">Objectif de l'email</label><textarea id="copilot-email-objective" value={objective} onChange={(event) => setObjective(event.target.value)} maxLength={2000} rows={3} placeholder="Ex. Relancer cordialement la facture arrivée à échéance..." className="mt-[5px] w-full resize-y rounded-[7px] border border-[#CBD5E1] px-[9px] py-[7px] text-[9px] leading-[1.5] text-[#0F172A] outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-[#DBEAFE]" /></div>
          <div className="flex items-end gap-[7px]"><div className="min-w-0 flex-1"><label htmlFor="copilot-email-tone" className="text-[8px] font-semibold text-[#475569]">Ton</label><select id="copilot-email-tone" value={tone} onChange={(event) => setTone(event.target.value as AIEmailDraftInput["tone"])} className="mt-[5px] h-[32px] w-full rounded-[7px] border border-[#CBD5E1] bg-white px-[8px] text-[8px] text-[#334155] outline-none"><option value="professional">Professionnel</option><option value="friendly">Cordial</option><option value="concise">Concis</option></select></div><button type="submit" disabled={busy || disabled || !emailClient} className="flex h-[32px] items-center gap-[5px] rounded-[7px] bg-[#2563EB] px-[10px] text-[8px] font-semibold text-white disabled:opacity-50"><Icon name="mail" size={11} /> {busy ? "Création..." : "Créer le brouillon"}</button></div>
          <p className="text-[7px] text-[#94A3B8]">Le brouillon sera généré à votre demande, jamais envoyé automatiquement.</p>
        </form>
      )}

      {error && <p role="alert" className="mt-[7px] rounded-[6px] bg-[#FEF2F2] px-[8px] py-[6px] text-[8px] text-[#B91C1C]">{error}</p>}
    </section>
  )
}
