import { useCallback, useEffect, useRef, useState, type FormEvent } from "react"
import Icon, { type IconName } from "../../components/UI/Icon"
import {
  askAI,
  createAIEmailDraft,
  getAIStatus,
  searchAIClients,
  summarizeAIClientHistory,
  type AIClient,
  type AIClientSearchResponse,
  type AIEmailDraftInput,
  type AIEmailDraftResponse,
  type AIHistorySummaryResponse,
  type AIQuestionResponse,
  type AIRequestUsage,
  type AISource,
  type AIStatus,
} from "../../Services/ai"

type AssistantAction = "question" | "search" | "email" | "summary"

type LastRun =
  | { kind: "question"; question: string }
  | { kind: "search"; query: string }
  | { kind: "email"; input: AIEmailDraftInput }
  | { kind: "summary"; customerId: number; focus: string }

type AssistantResult =
  | { kind: "question"; data: AIQuestionResponse }
  | { kind: "search"; data: AIClientSearchResponse }
  | { kind: "email"; data: AIEmailDraftResponse }
  | { kind: "summary"; data: AIHistorySummaryResponse }

const actions: Array<{
  id: AssistantAction
  title: string
  description: string
  icon: IconName
}> = [
  { id: "question", title: "Poser une question", description: "Interrogez les données de votre CRM.", icon: "ai" },
  { id: "search", title: "Retrouver un client", description: "Cherchez par nom, email ou téléphone.", icon: "search" },
  { id: "email", title: "Générer un email", description: "Préparez un brouillon prêt à relire.", icon: "mail" },
  { id: "summary", title: "Résumer un historique", description: "Obtenez les faits et points importants.", icon: "summary" },
]

function isAbortError(reason: unknown) {
  return reason instanceof DOMException && reason.name === "AbortError"
}

function errorMessage(reason: unknown) {
  return reason instanceof Error ? reason.message : "Une erreur inattendue est survenue."
}

function clientName(client: AIClient) {
  const composed = `${client.first_name ?? ""} ${client.last_name ?? ""}`.trim()
  return client.full_name?.trim() || composed || `Client #${client.id}`
}

function formatCost(
  cents?: number,
  microusd?: number,
) {
  const dollars = typeof microusd === "number"
    ? microusd / 1_000_000
    : typeof cents === "number"
      ? cents / 100
      : null

  if (dollars === null) return null
  if (dollars > 0 && dollars < 0.0001) return "< 0,0001 $US"
  return dollars.toLocaleString("fr-FR", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: dollars < 0.01 ? 4 : 2,
    maximumFractionDigits: dollars < 0.01 ? 6 : 2,
  })
}

function UsageLine({
  usage,
  provider,
  model,
}: {
  usage?: AIRequestUsage
  provider?: string
  model?: string | null
}) {
  const cost = formatCost(usage?.estimated_cost_cents, usage?.estimated_cost_microusd)
  const details = [
    provider,
    model,
    typeof usage?.total_tokens === "number" ? `${usage.total_tokens} jetons` : null,
    cost ? `coût estimé ${cost}` : null,
  ].filter(Boolean)

  if (details.length === 0) return null
  return <p className="mt-[14px] text-[9px] text-[#94A3B8]">{details.join(" · ")}</p>
}

function Sources({ sources }: { sources: AISource[] }) {
  if (sources.length === 0) return null
  return (
    <div className="mt-[16px] border-t border-[#E2E8F0] pt-[13px]">
      <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-[#64748B]">Sources CRM</p>
      <div className="mt-[8px] flex flex-wrap gap-[6px]">
        {sources.map((source, index) => (
          <span key={`${source.kind ?? source.entity_type ?? "source"}-${source.entity_id ?? index}`} className="rounded-full bg-[#F1F5F9] px-[9px] py-[5px] text-[9px] text-[#475569]">
            {source.label}
          </span>
        ))}
      </div>
    </div>
  )
}

function ClientPicker({
  selected,
  onSelect,
}: {
  selected: AIClient | null
  onSelect: (client: AIClient | null) => void
}) {
  const [query, setQuery] = useState("")
  const [clients, setClients] = useState<AIClient[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const controllerRef = useRef<AbortController | null>(null)

  useEffect(() => () => controllerRef.current?.abort(), [])

  async function handleSearch(event: FormEvent) {
    event.preventDefault()
    const cleanQuery = query.trim()
    if (cleanQuery.length < 2) {
      setError("Saisissez au moins 2 caractères.")
      return
    }

    controllerRef.current?.abort()
    const controller = new AbortController()
    controllerRef.current = controller
    setLoading(true)
    setError(null)
    try {
      const response = await searchAIClients(cleanQuery, 6, controller.signal)
      setClients(response.items)
      if (response.items.length === 0) setError("Aucun client ne correspond à cette recherche.")
    } catch (reason) {
      if (!isAbortError(reason)) setError(errorMessage(reason))
    } finally {
      if (controllerRef.current === controller) {
        controllerRef.current = null
        setLoading(false)
      }
    }
  }

  if (selected) {
    return (
      <div className="rounded-[9px] border border-[#BFDBFE] bg-[#EFF6FF] p-[12px]">
        <div className="flex items-center gap-[10px]">
          <div className="flex h-[32px] w-[32px] shrink-0 items-center justify-center rounded-full bg-[#DBEAFE] text-[10px] font-bold text-[#1D4ED8]">
            {clientName(selected).slice(0, 2).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[11px] font-semibold text-[#0F172A]">{clientName(selected)}</p>
            <p className="mt-[2px] truncate text-[9px] text-[#64748B]">{selected.email || selected.phone || `Client #${selected.id}`}</p>
          </div>
          <button type="button" onClick={() => { onSelect(null); setClients([]) }} className="rounded-[6px] px-[8px] py-[5px] text-[9px] font-semibold text-[#2563EB] hover:bg-white">
            Changer
          </button>
        </div>
      </div>
    )
  }

  return (
    <div>
      <form onSubmit={(event) => void handleSearch(event)} className="flex gap-[8px]">
        <label className="sr-only" htmlFor="ai-client-search">Rechercher un client</label>
        <div className="relative min-w-0 flex-1">
          <Icon name="search" size={14} className="pointer-events-none absolute left-[11px] top-1/2 -translate-y-1/2 text-[#94A3B8]" />
          <input
            id="ai-client-search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Nom, email ou téléphone..."
            autoComplete="off"
            className="h-[38px] w-full rounded-[7px] border border-[#CBD5E1] bg-white pl-[34px] pr-[11px] text-[10px] text-[#0F172A] outline-none transition placeholder:text-[#94A3B8] focus:border-[#2563EB] focus:ring-2 focus:ring-[#DBEAFE]"
          />
        </div>
        <button type="submit" disabled={loading} className="h-[38px] rounded-[7px] bg-[#0F172A] px-[13px] text-[10px] font-semibold text-white transition hover:bg-[#1E293B] disabled:opacity-50">
          {loading ? "Recherche..." : "Chercher"}
        </button>
      </form>

      <div aria-live="polite">
        {error && <p className="mt-[8px] text-[9px] text-[#DC2626]">{error}</p>}
        {clients.length > 0 && (
          <div className="mt-[8px] max-h-[190px] space-y-[5px] overflow-y-auto rounded-[8px] border border-[#E2E8F0] bg-white p-[5px]">
            {clients.map((client) => (
              <button key={client.id} type="button" onClick={() => onSelect(client)} className="flex w-full items-center gap-[9px] rounded-[6px] px-[9px] py-[8px] text-left transition hover:bg-[#F8FAFC]">
                <div className="flex h-[28px] w-[28px] shrink-0 items-center justify-center rounded-full bg-[#F1F5F9] text-[9px] font-bold text-[#475569]">{clientName(client).slice(0, 2).toUpperCase()}</div>
                <div className="min-w-0">
                  <p className="truncate text-[10px] font-semibold text-[#0F172A]">{clientName(client)}</p>
                  <p className="mt-[2px] truncate text-[8px] text-[#94A3B8]">{client.email || client.phone || `Client #${client.id}`}</p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function AssistantAI() {
  const [activeAction, setActiveAction] = useState<AssistantAction>("question")
  const [status, setStatus] = useState<AIStatus | null>(null)
  const [statusError, setStatusError] = useState<string | null>(null)
  const [question, setQuestion] = useState("")
  const [clientQuery, setClientQuery] = useState("")
  const [selectedClient, setSelectedClient] = useState<AIClient | null>(null)
  const [emailObjective, setEmailObjective] = useState("")
  const [emailTone, setEmailTone] = useState<AIEmailDraftInput["tone"]>("professional")
  const [summaryFocus, setSummaryFocus] = useState("")
  const [result, setResult] = useState<AssistantResult | null>(null)
  const [draftSubject, setDraftSubject] = useState("")
  const [draftBody, setDraftBody] = useState("")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [lastRun, setLastRun] = useState<LastRun | null>(null)
  const [copied, setCopied] = useState(false)
  const requestControllerRef = useRef<AbortController | null>(null)
  const statusControllerRef = useRef<AbortController | null>(null)
  const copyTimerRef = useRef<number | null>(null)

  const loadStatus = useCallback(async () => {
    statusControllerRef.current?.abort()
    const controller = new AbortController()
    statusControllerRef.current = controller
    try {
      const nextStatus = await getAIStatus(controller.signal)
      setStatusError(null)
      setStatus(nextStatus)
    } catch (reason) {
      if (!isAbortError(reason)) setStatusError(errorMessage(reason))
    } finally {
      if (statusControllerRef.current === controller) statusControllerRef.current = null
    }
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    statusControllerRef.current = controller
    getAIStatus(controller.signal)
      .then((nextStatus) => {
        setStatusError(null)
        setStatus(nextStatus)
      })
      .catch((reason: unknown) => {
        if (!isAbortError(reason)) setStatusError(errorMessage(reason))
      })
      .finally(() => {
        if (statusControllerRef.current === controller) statusControllerRef.current = null
      })
    return () => {
      requestControllerRef.current?.abort()
      controller.abort()
      if (copyTimerRef.current !== null) window.clearTimeout(copyTimerRef.current)
    }
  }, [])

  async function execute(run: LastRun) {
    requestControllerRef.current?.abort()
    const controller = new AbortController()
    requestControllerRef.current = controller
    setBusy(true)
    setError(null)
    setNotice(null)
    setResult(null)
    setLastRun(run)
    let refreshUsage = run.kind !== "search"

    try {
      if (run.kind === "question") {
        const data = await askAI(run.question, controller.signal)
        setResult({ kind: "question", data })
      } else if (run.kind === "search") {
        const data = await searchAIClients(run.query, 10, controller.signal)
        setResult({ kind: "search", data })
      } else if (run.kind === "email") {
        const data = await createAIEmailDraft(run.input, controller.signal)
        setDraftSubject(data.subject)
        setDraftBody(data.body)
        setResult({ kind: "email", data })
      } else {
        const data = await summarizeAIClientHistory(run.customerId, run.focus, controller.signal)
        setResult({ kind: "summary", data })
      }
    } catch (reason) {
      if (isAbortError(reason)) {
        refreshUsage = false
        setNotice("Demande annulée dans l'interface. Si la génération avait déjà commencé, elle peut compter dans votre usage.")
      } else {
        setError(errorMessage(reason))
      }
    } finally {
      if (refreshUsage) void loadStatus()
      if (requestControllerRef.current === controller) {
        requestControllerRef.current = null
        setBusy(false)
      }
    }
  }

  function selectAction(action: AssistantAction) {
    requestControllerRef.current?.abort()
    requestControllerRef.current = null
    setBusy(false)
    setError(null)
    setNotice(null)
    setResult(null)
    setActiveAction(action)
  }

  async function copyText(value: string) {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(true)
      if (copyTimerRef.current !== null) window.clearTimeout(copyTimerRef.current)
      copyTimerRef.current = window.setTimeout(() => setCopied(false), 1800)
    } catch {
      setError("La copie automatique est bloquée par votre navigateur.")
    }
  }

  const maxInputChars = Math.min(Math.max(status?.limits.max_input_chars ?? 2000, 200), 20_000)
  const aiUnavailable = Boolean(status && (!status.enabled || !status.ready))
  const localProvider = status ? ["mock", "local"].includes(status.provider.toLowerCase()) : false
  const statusCost = formatCost(
    status?.usage.estimated_cost_cents_this_month,
    status?.usage.estimated_cost_microusd_this_month,
  )

  function handleQuestion(event: FormEvent) {
    event.preventDefault()
    const cleanQuestion = question.trim()
    if (cleanQuestion.length < 3) {
      setError("Votre question doit contenir au moins 3 caractères.")
      return
    }
    void execute({ kind: "question", question: cleanQuestion })
  }

  function handleClientSearch(event: FormEvent) {
    event.preventDefault()
    const cleanQuery = clientQuery.trim()
    if (cleanQuery.length < 2) {
      setError("Saisissez au moins 2 caractères pour rechercher un client.")
      return
    }
    void execute({ kind: "search", query: cleanQuery })
  }

  function handleEmail(event: FormEvent) {
    event.preventDefault()
    if (!selectedClient) {
      setError("Sélectionnez d'abord le destinataire.")
      return
    }
    const objective = emailObjective.trim()
    if (objective.length < 3) {
      setError("Précisez l'objectif de l'email.")
      return
    }
    void execute({
      kind: "email",
      input: { customer_id: selectedClient.id, objective, tone: emailTone, language: "fr" },
    })
  }

  function handleSummary(event: FormEvent) {
    event.preventDefault()
    if (!selectedClient) {
      setError("Sélectionnez d'abord le client à résumer.")
      return
    }
    void execute({ kind: "summary", customerId: selectedClient.id, focus: summaryFocus.trim() })
  }

  return (
    <div className="w-full">
      <div className="flex flex-wrap items-end justify-between gap-[16px]">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.20em] text-[#2563EB]">Intelligence assistée</p>
          <h1 className="mt-[8px] text-[30px] font-bold leading-none text-[#0F172A]">Assistant IA</h1>
          <p className="mt-[10px] max-w-[650px] text-[13px] text-[#64748B]">Trouvez l'information utile, rédigez plus vite et gardez toujours le contrôle du résultat.</p>
        </div>
        <div aria-live="polite" className={`flex items-center gap-[8px] rounded-full border px-[11px] py-[7px] text-[9px] font-semibold ${status?.ready ? "border-[#BBF7D0] bg-[#F0FDF4] text-[#15803D]" : statusError ? "border-[#FECACA] bg-[#FEF2F2] text-[#B91C1C]" : "border-[#E2E8F0] bg-white text-[#64748B]"}`}>
          <span className={`h-[6px] w-[6px] rounded-full ${status?.ready ? "bg-[#22C55E]" : statusError ? "bg-[#EF4444]" : "animate-pulse bg-[#94A3B8]"}`} />
          {status
            ? localProvider
              ? "Mode local · zéro coût API"
              : status.ready
                ? `${status.provider}${status.model ? ` · ${status.model}` : ""}`
                : status.message || "Configuration requise"
            : statusError
              ? "Statut indisponible"
              : "Vérification du module..."}
        </div>
      </div>

      <div className="responsive-grid mt-[20px] grid grid-cols-3 gap-[10px]">
        <div className="rounded-[9px] border border-[#E2E8F0] bg-white px-[13px] py-[11px] shadow-[0_3px_12px_rgba(15,23,42,0.03)]">
          <p className="text-[8px] font-semibold uppercase tracking-[0.12em] text-[#94A3B8]">Requêtes aujourd'hui</p>
          <p className="mt-[5px] text-[15px] font-bold text-[#0F172A]">{status?.usage.requests_today ?? "—"}<span className="text-[9px] font-medium text-[#94A3B8]">{typeof status?.limits.daily_requests === "number" ? ` / ${status.limits.daily_requests}` : ""}</span></p>
        </div>
        <div className="rounded-[9px] border border-[#E2E8F0] bg-white px-[13px] py-[11px] shadow-[0_3px_12px_rgba(15,23,42,0.03)]">
          <p className="text-[8px] font-semibold uppercase tracking-[0.12em] text-[#94A3B8]">Restantes aujourd'hui</p>
          <p className="mt-[5px] text-[15px] font-bold text-[#0F172A]">{status?.usage.remaining_requests_today ?? "—"}</p>
        </div>
        <div className="rounded-[9px] border border-[#E2E8F0] bg-white px-[13px] py-[11px] shadow-[0_3px_12px_rgba(15,23,42,0.03)]">
          <p className="text-[8px] font-semibold uppercase tracking-[0.12em] text-[#94A3B8]">Coût estimé ce mois</p>
          <p className="mt-[5px] text-[15px] font-bold text-[#0F172A]">{statusCost ?? (localProvider ? "0,00 $US" : "—")}</p>
        </div>
      </div>

      {statusError && (
        <div role="alert" className="mt-[10px] flex items-center justify-between gap-[12px] rounded-[8px] border border-[#FECACA] bg-[#FEF2F2] px-[12px] py-[9px] text-[9px] text-[#B91C1C]">
          <span>Le statut IA n'a pas pu être chargé : {statusError}</span>
          <button type="button" onClick={() => void loadStatus()} className="shrink-0 font-semibold underline">Réessayer</button>
        </div>
      )}

      <div className="responsive-grid mt-[14px] grid grid-cols-[230px_minmax(0,1fr)] gap-[14px]">
        <aside className="rounded-[10px] border border-[#E2E8F0] bg-white p-[8px] shadow-[0_4px_18px_rgba(15,23,42,0.04)]" aria-label="Fonctions de l'assistant">
          <p className="px-[8px] pb-[7px] pt-[4px] text-[8px] font-semibold uppercase tracking-[0.15em] text-[#94A3B8]">Que voulez-vous faire ?</p>
          <div className="space-y-[4px]">
            {actions.map((action) => (
              <button key={action.id} type="button" onClick={() => selectAction(action.id)} aria-pressed={activeAction === action.id} className={`flex w-full items-start gap-[9px] rounded-[8px] px-[9px] py-[10px] text-left transition ${activeAction === action.id ? "bg-[#EFF6FF] text-[#1D4ED8]" : "text-[#475569] hover:bg-[#F8FAFC]"}`}>
                <span className={`mt-[1px] flex h-[28px] w-[28px] shrink-0 items-center justify-center rounded-[7px] ${activeAction === action.id ? "bg-[#DBEAFE]" : "bg-[#F1F5F9]"}`}><Icon name={action.icon} size={14} /></span>
                <span><strong className="block text-[10px] font-semibold">{action.title}</strong><span className={`mt-[3px] block text-[8px] leading-[1.45] ${activeAction === action.id ? "text-[#60A5FA]" : "text-[#94A3B8]"}`}>{action.description}</span></span>
              </button>
            ))}
          </div>
          <div className="mx-[4px] mt-[10px] rounded-[8px] bg-[#F8FAFC] p-[10px]">
            <div className="flex items-center gap-[6px] text-[9px] font-semibold text-[#475569]"><Icon name="shield" size={13} className="text-[#2563EB]" /> Session temporaire</div>
            <p className="mt-[5px] text-[8px] leading-[1.5] text-[#94A3B8]">Aucune conversation IA n'est enregistrée dans votre navigateur.</p>
          </div>
        </aside>

        <section className="min-w-0 overflow-hidden rounded-[10px] border border-[#E2E8F0] bg-white shadow-[0_4px_18px_rgba(15,23,42,0.04)]">
          <div className="border-b border-[#E2E8F0] px-[18px] py-[15px]">
            <div className="flex items-center gap-[10px]">
              <div className="flex h-[32px] w-[32px] items-center justify-center rounded-[8px] bg-[#EFF6FF] text-[#2563EB]"><Icon name={actions.find((item) => item.id === activeAction)?.icon ?? "ai"} size={16} /></div>
              <div><h2 className="text-[12px] font-semibold text-[#0F172A]">{actions.find((item) => item.id === activeAction)?.title}</h2><p className="mt-[2px] text-[9px] text-[#94A3B8]">L'assistant agit uniquement lorsque vous validez.</p></div>
            </div>
          </div>

          <div className="p-[18px]">
            {activeAction === "question" && (
              <form onSubmit={handleQuestion}>
                <label htmlFor="ai-question" className="text-[10px] font-semibold text-[#334155]">Votre question</label>
                <textarea id="ai-question" value={question} onChange={(event) => setQuestion(event.target.value)} maxLength={maxInputChars} rows={5} placeholder="Ex. Quel est le montant total restant à encaisser ?" className="mt-[7px] w-full resize-y rounded-[8px] border border-[#CBD5E1] bg-white px-[12px] py-[10px] text-[11px] leading-[1.6] text-[#0F172A] outline-none transition placeholder:text-[#94A3B8] focus:border-[#2563EB] focus:ring-2 focus:ring-[#DBEAFE]" />
                <div className="mt-[7px] flex items-center justify-between gap-[10px]"><p className="text-[8px] text-[#94A3B8]">Posez une question factuelle sur les données de votre entreprise.</p><span className="text-[8px] text-[#94A3B8]">{question.length}/{maxInputChars}</span></div>
                <button type="submit" disabled={busy || aiUnavailable} className="mt-[13px] flex h-[38px] items-center gap-[7px] rounded-[7px] bg-[#2563EB] px-[14px] text-[10px] font-semibold text-white transition hover:bg-[#1D4ED8] disabled:cursor-not-allowed disabled:opacity-50"><Icon name="ai" size={14} /> Obtenir une réponse</button>
              </form>
            )}

            {activeAction === "search" && (
              <form onSubmit={handleClientSearch}>
                <label htmlFor="ai-search" className="text-[10px] font-semibold text-[#334155]">Client à retrouver</label>
                <div className="mt-[7px] flex gap-[8px]">
                  <div className="relative min-w-0 flex-1"><Icon name="search" size={15} className="pointer-events-none absolute left-[11px] top-1/2 -translate-y-1/2 text-[#94A3B8]" /><input id="ai-search" value={clientQuery} onChange={(event) => setClientQuery(event.target.value)} autoComplete="off" placeholder="Nom, email ou téléphone..." className="h-[40px] w-full rounded-[8px] border border-[#CBD5E1] bg-white pl-[35px] pr-[12px] text-[11px] text-[#0F172A] outline-none transition placeholder:text-[#94A3B8] focus:border-[#2563EB] focus:ring-2 focus:ring-[#DBEAFE]" /></div>
                  <button type="submit" disabled={busy} className="h-[40px] rounded-[8px] bg-[#2563EB] px-[15px] text-[10px] font-semibold text-white transition hover:bg-[#1D4ED8] disabled:opacity-50">Rechercher</button>
                </div>
                <p className="mt-[7px] text-[8px] text-[#94A3B8]">Cette recherche CRM est déterministe et ne consomme pas de jetons IA.</p>
              </form>
            )}

            {activeAction === "email" && (
              <form onSubmit={handleEmail} className="space-y-[14px]">
                <div><label className="mb-[7px] block text-[10px] font-semibold text-[#334155]">Destinataire</label><ClientPicker selected={selectedClient} onSelect={setSelectedClient} /></div>
                <div><label htmlFor="ai-email-objective" className="text-[10px] font-semibold text-[#334155]">Objectif de l'email</label><textarea id="ai-email-objective" value={emailObjective} onChange={(event) => setEmailObjective(event.target.value)} maxLength={Math.min(maxInputChars, 2000)} rows={3} placeholder="Ex. Relancer poliment la facture arrivée à échéance..." className="mt-[7px] w-full resize-y rounded-[8px] border border-[#CBD5E1] px-[12px] py-[10px] text-[11px] leading-[1.6] outline-none transition placeholder:text-[#94A3B8] focus:border-[#2563EB] focus:ring-2 focus:ring-[#DBEAFE]" /></div>
                <div><label htmlFor="ai-email-tone" className="text-[10px] font-semibold text-[#334155]">Ton souhaité</label><select id="ai-email-tone" value={emailTone} onChange={(event) => setEmailTone(event.target.value as AIEmailDraftInput["tone"])} className="mt-[7px] h-[38px] w-full rounded-[7px] border border-[#CBD5E1] bg-white px-[10px] text-[10px] text-[#334155] outline-none focus:border-[#2563EB]"><option value="professional">Professionnel</option><option value="friendly">Cordial</option><option value="concise">Concis</option></select></div>
                <div className="flex flex-wrap items-center justify-between gap-[10px]"><p className="flex items-center gap-[6px] text-[8px] text-[#64748B]"><Icon name="shield" size={12} className="text-[#2563EB]" /> Un brouillon sera créé, jamais envoyé.</p><button type="submit" disabled={busy || aiUnavailable} className="flex h-[38px] items-center gap-[7px] rounded-[7px] bg-[#2563EB] px-[14px] text-[10px] font-semibold text-white hover:bg-[#1D4ED8] disabled:opacity-50"><Icon name="mail" size={14} /> Créer le brouillon</button></div>
              </form>
            )}

            {activeAction === "summary" && (
              <form onSubmit={handleSummary} className="space-y-[14px]">
                <div><label className="mb-[7px] block text-[10px] font-semibold text-[#334155]">Client à analyser</label><ClientPicker selected={selectedClient} onSelect={setSelectedClient} /></div>
                <div><label htmlFor="ai-summary-focus" className="text-[10px] font-semibold text-[#334155]">Point d'attention <span className="font-normal text-[#94A3B8]">(facultatif)</span></label><input id="ai-summary-focus" value={summaryFocus} onChange={(event) => setSummaryFocus(event.target.value)} maxLength={500} placeholder="Ex. Les factures impayées et les dernières relances" className="mt-[7px] h-[40px] w-full rounded-[8px] border border-[#CBD5E1] px-[12px] text-[11px] outline-none transition placeholder:text-[#94A3B8] focus:border-[#2563EB] focus:ring-2 focus:ring-[#DBEAFE]" /></div>
                <div className="flex justify-end"><button type="submit" disabled={busy || aiUnavailable} className="flex h-[38px] items-center gap-[7px] rounded-[7px] bg-[#2563EB] px-[14px] text-[10px] font-semibold text-white hover:bg-[#1D4ED8] disabled:opacity-50"><Icon name="summary" size={14} /> Générer le résumé</button></div>
              </form>
            )}

            <div aria-live="polite" aria-atomic="true">
              {busy && (
                <div className="mt-[16px] flex items-center justify-between gap-[12px] rounded-[9px] border border-[#BFDBFE] bg-[#EFF6FF] px-[13px] py-[11px]">
                  <span className="flex items-center gap-[8px] text-[9px] font-medium text-[#1D4ED8]"><span className="h-[11px] w-[11px] animate-spin rounded-full border-2 border-[#93C5FD] border-t-[#2563EB]" /> L'assistant prépare votre résultat...</span>
                  <button type="button" onClick={() => requestControllerRef.current?.abort()} className="flex items-center gap-[5px] rounded-[6px] bg-white px-[8px] py-[5px] text-[9px] font-semibold text-[#475569] shadow-sm"><Icon name="stop" size={11} /> Annuler</button>
                </div>
              )}
              {notice && <div className="mt-[16px] rounded-[8px] border border-[#E2E8F0] bg-[#F8FAFC] px-[12px] py-[10px] text-[9px] text-[#64748B]">{notice}</div>}
              {error && (
                <div role="alert" className="mt-[16px] flex flex-wrap items-center justify-between gap-[10px] rounded-[8px] border border-[#FECACA] bg-[#FEF2F2] px-[12px] py-[10px] text-[9px] text-[#B91C1C]">
                  <span>{error}</span>
                  {lastRun && <button type="button" onClick={() => void execute(lastRun)} className="flex items-center gap-[5px] font-semibold underline"><Icon name="refresh" size={11} /> Réessayer</button>}
                </div>
              )}
            </div>

            {result && !busy && (
              <div className="mt-[17px] min-w-0 break-words rounded-[10px] border border-[#E2E8F0] bg-[#FCFDFE] p-[15px] [overflow-wrap:anywhere]">
                {result.kind === "question" && (
                  <div>
                    <div className="flex items-center justify-between gap-[10px]"><h3 className="flex items-center gap-[7px] text-[11px] font-semibold text-[#0F172A]"><Icon name="ai" size={14} className="text-[#2563EB]" /> Réponse</h3><button type="button" onClick={() => void copyText(result.data.answer)} className="flex items-center gap-[5px] rounded-[6px] border border-[#E2E8F0] bg-white px-[8px] py-[5px] text-[9px] font-semibold text-[#475569] hover:bg-[#F8FAFC]"><Icon name="copy" size={11} /> {copied ? "Copié" : "Copier"}</button></div>
                    <p className="mt-[12px] whitespace-pre-wrap text-[11px] leading-[1.75] text-[#334155]">{result.data.answer}</p>
                    <Sources sources={result.data.sources} />
                    <UsageLine usage={result.data.usage} provider={result.data.provider} model={result.data.model} />
                  </div>
                )}

                {result.kind === "search" && (
                  <div>
                    <div className="flex items-center justify-between gap-[10px]"><h3 className="text-[11px] font-semibold text-[#0F172A]">{result.data.total} client{result.data.total > 1 ? "s" : ""} trouvé{result.data.total > 1 ? "s" : ""}</h3><span className="rounded-full bg-[#F0FDF4] px-[8px] py-[4px] text-[8px] font-semibold text-[#15803D]">0 jeton IA</span></div>
                    {result.data.items.length === 0 ? <p className="mt-[12px] text-[10px] text-[#64748B]">Aucun résultat. Essayez avec un autre nom, email ou numéro.</p> : <div className="mt-[10px] divide-y divide-[#E2E8F0]">{result.data.items.map((client) => (
                      <div key={client.id} className="flex flex-wrap items-center gap-[10px] py-[10px]">
                        <div className="flex h-[31px] w-[31px] shrink-0 items-center justify-center rounded-full bg-[#EFF6FF] text-[9px] font-bold text-[#2563EB]">{clientName(client).slice(0, 2).toUpperCase()}</div>
                        <div className="min-w-[140px] flex-1"><p className="text-[10px] font-semibold text-[#0F172A]">{clientName(client)}</p><p className="mt-[2px] text-[8px] text-[#94A3B8]">{client.email || "Email non renseigné"}{client.phone ? ` · ${client.phone}` : ""}</p></div>
                        <div className="flex gap-[5px]"><button type="button" onClick={() => { setSelectedClient(client); selectAction("email") }} className="rounded-[6px] border border-[#DBEAFE] bg-[#EFF6FF] px-[8px] py-[5px] text-[8px] font-semibold text-[#2563EB]">Email</button><button type="button" onClick={() => { setSelectedClient(client); selectAction("summary") }} className="rounded-[6px] border border-[#E2E8F0] bg-white px-[8px] py-[5px] text-[8px] font-semibold text-[#475569]">Résumer</button>{client.email && <button type="button" onClick={() => void copyText(client.email ?? "")} aria-label={`Copier l'email de ${clientName(client)}`} className="rounded-[6px] border border-[#E2E8F0] bg-white p-[5px] text-[#64748B]"><Icon name="copy" size={11} /></button>}</div>
                      </div>
                    ))}</div>}
                  </div>
                )}

                {result.kind === "email" && (
                  <div>
                    <div className="flex flex-wrap items-center justify-between gap-[10px]"><div><h3 className="flex items-center gap-[7px] text-[11px] font-semibold text-[#0F172A]"><Icon name="mail" size={14} className="text-[#2563EB]" /> Brouillon d'email</h3><p className="mt-[3px] text-[8px] text-[#94A3B8]">Pour {result.data.recipient.name}{result.data.recipient.email ? ` · ${result.data.recipient.email}` : ""}</p></div><span className="rounded-full bg-[#FFFBEB] px-[9px] py-[5px] text-[8px] font-semibold text-[#B45309]">Non envoyé</span></div>
                    <label htmlFor="ai-draft-subject" className="mt-[13px] block text-[9px] font-semibold text-[#475569]">Objet</label><input id="ai-draft-subject" value={draftSubject} onChange={(event) => setDraftSubject(event.target.value)} className="mt-[5px] h-[37px] w-full rounded-[7px] border border-[#CBD5E1] bg-white px-[10px] text-[10px] text-[#0F172A] outline-none focus:border-[#2563EB]" />
                    <label htmlFor="ai-draft-body" className="mt-[11px] block text-[9px] font-semibold text-[#475569]">Message</label><textarea id="ai-draft-body" value={draftBody} onChange={(event) => setDraftBody(event.target.value)} rows={11} className="mt-[5px] w-full resize-y rounded-[7px] border border-[#CBD5E1] bg-white px-[10px] py-[9px] text-[10px] leading-[1.65] text-[#0F172A] outline-none focus:border-[#2563EB]" />
                    <div className="mt-[10px] flex flex-wrap items-center justify-between gap-[10px]"><p className="text-[8px] text-[#64748B]">Relisez et adaptez le contenu avant de l'utiliser.</p><button type="button" onClick={() => void copyText(`Objet : ${draftSubject}\n\n${draftBody}`)} className="flex items-center gap-[6px] rounded-[7px] bg-[#0F172A] px-[10px] py-[7px] text-[9px] font-semibold text-white hover:bg-[#1E293B]"><Icon name="copy" size={12} /> {copied ? "Brouillon copié" : "Copier le brouillon"}</button></div>
                    <UsageLine usage={result.data.usage} provider={result.data.provider} model={result.data.model} />
                  </div>
                )}

                {result.kind === "summary" && (
                  <div>
                    <div className="flex items-center justify-between gap-[10px]"><div><h3 className="flex items-center gap-[7px] text-[11px] font-semibold text-[#0F172A]"><Icon name="summary" size={14} className="text-[#2563EB]" /> Synthèse de {result.data.customer.name}</h3>{result.data.customer.email && <p className="mt-[3px] text-[8px] text-[#94A3B8]">{result.data.customer.email}</p>}</div><button type="button" onClick={() => void copyText([result.data.summary, ...result.data.highlights.map((item) => `• ${item}`)].join("\n\n"))} className="flex items-center gap-[5px] rounded-[6px] border border-[#E2E8F0] bg-white px-[8px] py-[5px] text-[9px] font-semibold text-[#475569]"><Icon name="copy" size={11} /> {copied ? "Copié" : "Copier"}</button></div>
                    <p className="mt-[12px] whitespace-pre-wrap text-[11px] leading-[1.75] text-[#334155]">{result.data.summary}</p>
                    {result.data.highlights.length > 0 && <div className="mt-[14px] rounded-[8px] bg-white p-[11px]"><p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-[#64748B]">Points importants</p><ul className="mt-[8px] space-y-[7px]">{result.data.highlights.map((item, index) => <li key={`${item}-${index}`} className="flex gap-[7px] text-[10px] leading-[1.55] text-[#475569]"><Icon name="check" size={12} className="mt-[1px] shrink-0 text-[#22C55E]" />{item}</li>)}</ul></div>}
                    {result.data.warning && <p className="mt-[12px] rounded-[7px] bg-[#FFFBEB] px-[10px] py-[8px] text-[9px] text-[#92400E]">{result.data.warning}</p>}
                    <Sources sources={result.data.sources} />
                    <UsageLine usage={result.data.usage} provider={result.data.provider} model={result.data.model} />
                  </div>
                )}
              </div>
            )}
          </div>
        </section>
      </div>

      <div className="mt-[12px] flex items-start gap-[8px] rounded-[8px] border border-[#E2E8F0] bg-white px-[12px] py-[9px] text-[8px] leading-[1.5] text-[#64748B]">
        <Icon name="shield" size={13} className="mt-[1px] shrink-0 text-[#2563EB]" />
        <p>Les actions IA sont limitées aux seules données de votre entreprise. L'IA peut se tromper : vérifiez les montants, destinataires et formulations avant toute utilisation.</p>
      </div>
    </div>
  )
}

export default AssistantAI
