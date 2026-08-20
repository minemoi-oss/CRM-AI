import { useEffect, useId, useRef, useState, type FormEvent } from "react"
import CopilotTools, { type CopilotToolMode } from "./CopilotTools"
import Icon from "../UI/Icon"
import {
  askCopilot,
  clearCopilotHistory,
  confirmCopilotProposal,
  getCopilotHistory,
  type CopilotActiveEntity,
  type CopilotBlock,
  type CopilotEntityCard,
  type CopilotEntityType,
  type CopilotNavigationTarget,
  type CopilotPage,
  type CopilotProposal,
  type CopilotResponse,
  type CopilotSuggestion,
  type CopilotTableRow,
  type AIEmailDraftResponse,
} from "../../Services/ai"

interface CopilotDrawerProps {
  currentPage: CopilotPage
  activeEntity: CopilotActiveEntity | null
  onNavigate: (target: CopilotNavigationTarget) => void
}

interface ChatMessage {
  id: string
  role: "user" | "assistant"
  content: string
  page?: CopilotPage
  response?: CopilotResponse
  emailDraft?: AIEmailDraftResponse
}

type ConfirmationState =
  | { kind: "proposal"; proposal: CopilotProposal }
  | { kind: "clear" }

const pageLabels: Record<CopilotPage, string> = {
  dashboard: "Dashboard",
  ai: "Assistant IA",
  clients: "Clients",
  prospects: "Prospects",
  products: "Produits",
  services: "Services",
  quotes: "Devis",
  invoices: "Factures",
  reports: "Rapports",
  settings: "Paramètres",
}

const pageSuggestions: Record<CopilotPage, CopilotSuggestion[]> = {
  dashboard: [
    { id: "dashboard-summary", label: "Résumer mon activité", prompt: "Résume les indicateurs importants de mon activité et les points à surveiller." },
    { id: "dashboard-priorities", label: "Mes priorités du jour", prompt: "Quelles sont les trois priorités commerciales ou financières à traiter aujourd'hui ?" },
    { id: "dashboard-risks", label: "Détecter les risques", prompt: "Détecte les retards, impayés ou anomalies qui nécessitent mon attention." },
  ],
  clients: [
    { id: "clients-find", label: "Retrouver un client", prompt: "Aide-moi à retrouver un client à partir de son nom ou de ses coordonnées." },
    { id: "clients-recent", label: "Clients récents", prompt: "Montre-moi les clients ajoutés récemment sous forme de cartes." },
    { id: "clients-followup", label: "Clients à relancer", prompt: "Quels clients devraient être relancés en priorité et pourquoi ?" },
  ],
  prospects: [
    { id: "prospects-priority", label: "Prioriser les prospects", prompt: "Classe les prospects à contacter en priorité et explique brièvement pourquoi." },
    { id: "prospects-followup", label: "Relances à préparer", prompt: "Quels prospects ont besoin d'une relance aujourd'hui ?" },
    { id: "prospects-conversion", label: "Opportunités de conversion", prompt: "Identifie les prospects les plus proches d'une conversion en client." },
  ],
  products: [
    { id: "products-overview", label: "Analyser le catalogue", prompt: "Résume mon catalogue produits et signale les points qui méritent mon attention." },
    { id: "products-stock", label: "Surveiller les stocks", prompt: "Quels produits ont un stock faible ou inhabituel ?" },
  ],
  services: [
    { id: "services-overview", label: "Analyser les services", prompt: "Résume mes services, leurs prix et les éventuelles incohérences." },
    { id: "services-pricing", label: "Comparer les tarifs", prompt: "Compare les tarifs fixes et horaires de mes services dans un tableau." },
  ],
  quotes: [
    { id: "quotes-pending", label: "Devis en attente", prompt: "Liste les devis en attente et ceux à relancer en priorité." },
    { id: "quotes-performance", label: "Analyser les conversions", prompt: "Analyse la conversion des devis en factures et résume les tendances." },
  ],
  invoices: [
    { id: "invoices-overdue", label: "Factures en retard", prompt: "Affiche les factures en retard avec leur client, montant et priorité." },
    { id: "invoices-balance", label: "Reste à encaisser", prompt: "Quel montant reste à encaisser et quelles factures dois-je traiter d'abord ?" },
    { id: "invoices-table", label: "Tableau des échéances", prompt: "Prépare un tableau clair des prochaines échéances de factures." },
  ],
  reports: [
    { id: "reports-summary", label: "Expliquer les résultats", prompt: "Explique simplement les principaux résultats de cette période." },
    { id: "reports-trends", label: "Détecter les tendances", prompt: "Quelles tendances commerciales et financières ressortent des rapports ?" },
  ],
  settings: [
    { id: "settings-security", label: "Vérifier la sécurité", prompt: "Explique les réglages de sécurité importants de mon compte sans rien modifier." },
    { id: "settings-help", label: "Comprendre un réglage", prompt: "Aide-moi à comprendre les paramètres disponibles sur cette page." },
  ],
  ai: [
    { id: "ai-capabilities", label: "Que peux-tu faire ?", prompt: "Présente tes capacités CRM actuelles avec des exemples concrets." },
    { id: "ai-cost", label: "Comprendre l'usage IA", prompt: "Explique mon utilisation IA actuelle et comment limiter les coûts." },
  ],
}

function makeId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}`
}

function isAbortError(reason: unknown) {
  return reason instanceof DOMException && reason.name === "AbortError"
}

function readableError(reason: unknown) {
  return reason instanceof Error ? reason.message : "Le copilote n'a pas pu répondre."
}

function displayValue(value: unknown) {
  if (value === null || value === undefined || value === "") return "—"
  if (typeof value === "boolean") return value ? "Oui" : "Non"
  if (typeof value === "number") return value.toLocaleString("fr-FR")
  if (typeof value === "string") return value
  return JSON.stringify(value)
}

function displayMetricValue(value: string | number, format?: "number" | "currency" | "percent" | "text") {
  if (format === "currency" && typeof value === "number") {
    return value.toLocaleString("fr-FR", { style: "currency", currency: "EUR" })
  }
  if (format === "percent") return `${typeof value === "number" ? value.toLocaleString("fr-FR") : value}%`
  if (format === "number" && typeof value === "number") return value.toLocaleString("fr-FR")
  return String(value)
}

function displayTableValue(key: string, value: unknown) {
  if (typeof value !== "number") return displayValue(value)
  if (/(?:amount|total|outstanding|balance|price|revenue|paid)/i.test(key)) {
    return value.toLocaleString("fr-FR", { style: "currency", currency: "EUR" })
  }
  if (/(?:percent|rate)/i.test(key)) return `${value.toLocaleString("fr-FR")}%`
  return value.toLocaleString("fr-FR")
}

function inferPage(entityType?: string): CopilotPage | undefined {
  const normalized = entityType?.toLowerCase()
  if (normalized === "customer" || normalized === "client") return "clients"
  if (normalized === "invoice" || normalized === "facture") return "invoices"
  if (normalized === "quote" || normalized === "devis") return "quotes"
  if (normalized === "prospect") return "prospects"
  if (normalized === "product" || normalized === "produit") return "products"
  if (normalized === "service") return "services"
  return undefined
}

function entityLink(card: CopilotEntityCard, parentEntityType?: CopilotEntityType): CopilotNavigationTarget | null {
  if (card.link?.page) return {
    ...card.link,
    entity_type: card.link.entity_type ?? card.entity_type ?? parentEntityType,
    entity_id: card.link.entity_id ?? card.entity_id ?? card.id,
    label: card.link.label ?? card.title ?? card.label,
  }
  const entityType = card.entity_type ?? parentEntityType
  const page = inferPage(entityType)
  const entityId = card.entity_id ?? card.id
  if (!page) return null
  return {
    page,
    entity_type: entityType,
    entity_id: entityId,
    label: card.title ?? card.label,
  }
}

function contextualSuggestions(page: CopilotPage, entity: CopilotActiveEntity | null) {
  const suggestions = [...(pageSuggestions[page] ?? pageSuggestions.dashboard)]
  if (!entity) return suggestions.slice(0, 3)

  const entityName = entity.label || `${entity.type} #${entity.id}`
  const type = entity.type.toLowerCase()
  if (type === "customer" || type === "client") {
    return [
      { id: `customer-summary-${entity.id}`, label: "Résumer cet historique", prompt: `Résume l'historique du client ${entityName} et souligne les points importants.` },
      { id: `customer-email-${entity.id}`, label: "Préparer un email", prompt: `Prépare un brouillon d'email professionnel pour ${entityName}, sans l'envoyer.` },
      ...suggestions,
    ].slice(0, 4)
  }
  if (type === "invoice" || type === "facture") {
    return [
      { id: `invoice-explain-${entity.id}`, label: "Expliquer cette facture", prompt: `Explique le statut, les montants et les échéances de ${entityName}.` },
      { id: `invoice-reminder-${entity.id}`, label: "Préparer une relance", prompt: `Prépare un brouillon de relance adapté à ${entityName}, sans rien envoyer.` },
      ...suggestions,
    ].slice(0, 4)
  }
  return [
    { id: `entity-explain-${entity.id}`, label: "Analyser cette fiche", prompt: `Analyse ${entityName} et résume les informations utiles sans rien modifier.` },
    ...suggestions,
  ].slice(0, 4)
}

function requestCost(response: CopilotResponse) {
  const usage = response.usage
  if (!usage) return null
  const dollars = typeof usage.estimated_cost_microusd === "number"
    ? usage.estimated_cost_microusd / 1_000_000
    : typeof usage.estimated_cost_cents === "number"
      ? usage.estimated_cost_cents / 100
      : null
  if (dollars === null) return null
  if (dollars > 0 && dollars < 0.0001) return "< 0,0001 $US"
  return dollars.toLocaleString("fr-FR", { style: "currency", currency: "USD", maximumFractionDigits: dollars < 0.01 ? 6 : 2 })
}

function MessageContextBadge({ page, currentPage }: { page?: CopilotPage; currentPage: CopilotPage }) {
  if (!page) return null
  return (
    <span className={`mb-[7px] inline-flex rounded-full px-[7px] py-[3px] text-[7px] font-semibold ${page === currentPage ? "bg-[#F1F5F9] text-[#64748B]" : "bg-[#FFFBEB] text-[#B45309]"}`}>
      Contexte : {pageLabels[page] ?? page}
    </span>
  )
}

function EmailDraftBlock({
  draft,
  onChange,
  onCopy,
}: {
  draft: AIEmailDraftResponse
  onChange: (changes: Pick<AIEmailDraftResponse, "subject" | "body">) => void
  onCopy: () => void
}) {
  return (
    <section className="mt-[9px] rounded-[8px] border border-[#BFDBFE] bg-[#F8FAFC] p-[10px]">
      <div className="flex flex-wrap items-center justify-between gap-[6px]">
        <div><p className="text-[9px] font-semibold text-[#0F172A]">Brouillon pour {draft.recipient.name}</p>{draft.recipient.email && <p className="mt-[2px] text-[7px] text-[#64748B]">{draft.recipient.email}</p>}</div>
        <span className="rounded-full bg-[#FFFBEB] px-[7px] py-[3px] text-[7px] font-semibold text-[#B45309]">Non envoyé</span>
      </div>
      <label className="mt-[9px] block text-[7px] font-semibold uppercase tracking-[0.06em] text-[#64748B]" htmlFor={`copilot-draft-subject-${draft.request_id}`}>Objet</label>
      <input id={`copilot-draft-subject-${draft.request_id}`} value={draft.subject} onChange={(event) => onChange({ subject: event.target.value, body: draft.body })} className="mt-[4px] h-[32px] w-full rounded-[6px] border border-[#CBD5E1] bg-white px-[8px] text-[9px] text-[#0F172A] outline-none focus:border-[#2563EB]" />
      <label className="mt-[8px] block text-[7px] font-semibold uppercase tracking-[0.06em] text-[#64748B]" htmlFor={`copilot-draft-body-${draft.request_id}`}>Message</label>
      <textarea id={`copilot-draft-body-${draft.request_id}`} value={draft.body} onChange={(event) => onChange({ subject: draft.subject, body: event.target.value })} rows={8} className="mt-[4px] w-full resize-y rounded-[6px] border border-[#CBD5E1] bg-white px-[8px] py-[7px] text-[9px] leading-[1.55] text-[#0F172A] outline-none focus:border-[#2563EB]" />
      <div className="mt-[8px] flex items-center justify-between gap-[8px]"><p className="text-[7px] text-[#64748B]">Relisez toujours le contenu avant utilisation.</p><button type="button" onClick={onCopy} className="flex shrink-0 items-center gap-[5px] rounded-[6px] bg-[#0F172A] px-[8px] py-[6px] text-[7px] font-semibold text-white"><Icon name="copy" size={10} /> Copier</button></div>
    </section>
  )
}

function TextBlock({ block, onNavigate }: { block: Extract<CopilotBlock, { type: "text" }>; onNavigate: (target: CopilotNavigationTarget) => void }) {
  const content = block.text ?? block.content ?? block.value
  if (!content) return null
  return (
    <section className="rounded-[8px] border border-[#E2E8F0] bg-white p-[11px]">
      {block.title && <h4 className="text-[9px] font-semibold text-[#334155]">{block.title}</h4>}
      <p className={`${block.title ? "mt-[6px]" : ""} whitespace-pre-wrap text-[10px] leading-[1.65] text-[#475569]`}>{content}</p>
      {block.link?.page && <button type="button" onClick={() => onNavigate(block.link as CopilotNavigationTarget)} className="mt-[8px] flex items-center gap-[5px] text-[9px] font-semibold text-[#2563EB]">Ouvrir <Icon name="arrow-right" size={11} /></button>}
    </section>
  )
}

function MetricCardsBlock({ block, onNavigate }: { block: Extract<CopilotBlock, { type: "metric_cards" }>; onNavigate: (target: CopilotNavigationTarget) => void }) {
  const cards = block.cards ?? block.items ?? []
  if (cards.length === 0) return null
  const toneStyles = {
    neutral: "bg-[#F8FAFC] text-[#0F172A]",
    positive: "bg-[#F0FDF4] text-[#15803D]",
    warning: "bg-[#FFFBEB] text-[#B45309]",
    danger: "bg-[#FEF2F2] text-[#B91C1C]",
  }
  return (
    <section>
      {block.title && <h4 className="mb-[7px] text-[9px] font-semibold text-[#334155]">{block.title}</h4>}
      <div className="grid grid-cols-2 gap-[6px]">
        {cards.map((card, index) => (
          <button key={`${card.label}-${index}`} type="button" disabled={!card.link?.page} onClick={() => card.link?.page && onNavigate(card.link)} className={`rounded-[8px] p-[10px] text-left ${toneStyles[card.tone ?? "neutral"]} disabled:cursor-default`}>
            <span className="block text-[8px] font-medium opacity-70">{card.label}</span>
            <strong className="mt-[4px] block text-[14px] leading-none">{displayMetricValue(card.value, card.format)}</strong>
            {card.detail && <span className="mt-[5px] block text-[8px] opacity-70">{card.detail}</span>}
          </button>
        ))}
      </div>
    </section>
  )
}

function EntityCardsBlock({ block, onNavigate }: { block: Extract<CopilotBlock, { type: "entity_cards" }>; onNavigate: (target: CopilotNavigationTarget) => void }) {
  const cards = block.cards ?? block.entities ?? block.items ?? []
  if (cards.length === 0) return null
  return (
    <section>
      {block.title && <h4 className="mb-[7px] text-[9px] font-semibold text-[#334155]">{block.title}</h4>}
      <div className="space-y-[6px]">
        {cards.map((card, index) => {
          const link = entityLink(card, block.entity_type)
          const fields = Object.entries(card.fields ?? {}).slice(0, 4)
          return (
            <article key={`${card.entity_type ?? "entity"}-${card.entity_id ?? card.id ?? index}`} className="rounded-[8px] border border-[#E2E8F0] bg-white p-[10px]">
              <div className="flex items-start gap-[8px]">
                <div className="flex h-[28px] w-[28px] shrink-0 items-center justify-center rounded-[7px] bg-[#EFF6FF] text-[#2563EB]"><Icon name={inferPage(card.entity_type ?? block.entity_type) === "invoices" ? "invoices" : "clients"} size={13} /></div>
                <div className="min-w-0 flex-1"><h5 className="break-words text-[10px] font-semibold text-[#0F172A]">{card.title ?? card.label ?? `Élément #${card.entity_id ?? card.id ?? index + 1}`}</h5>{card.subtitle && <p className="mt-[2px] break-words text-[8px] text-[#64748B]">{card.subtitle}</p>}{card.meta && <p className="mt-[3px] break-words text-[8px] font-medium text-[#2563EB]">{card.meta}</p>}{card.description && <p className="mt-[5px] break-words text-[9px] leading-[1.5] text-[#475569]">{card.description}</p>}</div>
              </div>
              {fields.length > 0 && <dl className="mt-[8px] grid grid-cols-2 gap-[5px]">{fields.map(([key, value]) => <div key={key} className="rounded-[6px] bg-[#F8FAFC] px-[7px] py-[5px]"><dt className="text-[7px] uppercase tracking-[0.06em] text-[#94A3B8]">{key.replaceAll("_", " ")}</dt><dd className="mt-[2px] break-words text-[8px] font-medium text-[#334155]">{displayValue(value)}</dd></div>)}</dl>}
              {link && <button type="button" onClick={() => onNavigate(link)} className="mt-[8px] flex items-center gap-[5px] text-[9px] font-semibold text-[#2563EB]">Ouvrir la fiche <Icon name="arrow-right" size={11} /></button>}
            </article>
          )
        })}
      </div>
    </section>
  )
}

function TableBlock({ block, onNavigate }: { block: Extract<CopilotBlock, { type: "table" }>; onNavigate: (target: CopilotNavigationTarget) => void }) {
  const rows = block.rows ?? []
  if (rows.length === 0) return null
  const fallbackColumns = Object.keys(rows[0]).filter((key) => key !== "link").map((key) => ({ key, label: key.replaceAll("_", " ") }))
  const columns = block.columns?.length ? block.columns : fallbackColumns
  return (
    <section>
      {block.title && <h4 className="mb-[7px] text-[9px] font-semibold text-[#334155]">{block.title}</h4>}
      <div className="overflow-x-auto rounded-[8px] border border-[#E2E8F0] bg-white">
        <table className="min-w-full border-collapse text-left">
          <thead><tr className="bg-[#F8FAFC]">{columns.map((column) => <th key={column.key} className="whitespace-nowrap border-b border-[#E2E8F0] px-[8px] py-[7px] text-[7px] font-semibold uppercase tracking-[0.06em] text-[#64748B]">{column.label}</th>)}{rows.some((row) => row.link?.page) && <th className="border-b border-[#E2E8F0] px-[8px] py-[7px] text-[7px] text-[#64748B]">ACTION</th>}</tr></thead>
          <tbody>{rows.map((row: CopilotTableRow, index) => <tr key={index} className="border-b border-[#E2E8F0] last:border-0">{columns.map((column) => <td key={column.key} className="max-w-[170px] break-words px-[8px] py-[7px] text-[8px] text-[#475569]">{displayTableValue(column.key, row[column.key])}</td>)}{rows.some((item) => item.link?.page) && <td className="px-[8px] py-[7px]">{row.link?.page && <button type="button" onClick={() => onNavigate(row.link as CopilotNavigationTarget)} className="whitespace-nowrap text-[8px] font-semibold text-[#2563EB]">Ouvrir</button>}</td>}</tr>)}</tbody>
        </table>
      </div>
      {block.link?.page && <button type="button" onClick={() => onNavigate(block.link as CopilotNavigationTarget)} className="mt-[7px] flex items-center gap-[5px] text-[8px] font-semibold text-[#2563EB]">Voir tous les résultats <Icon name="arrow-right" size={10} /></button>}
    </section>
  )
}

function StructuredBlocks({ blocks, onNavigate }: { blocks: CopilotBlock[]; onNavigate: (target: CopilotNavigationTarget) => void }) {
  if (blocks.length === 0) return null
  return (
    <div className="mt-[9px] space-y-[8px]">
      {blocks.map((block, index) => {
        if (block.type === "text") return <TextBlock key={index} block={block} onNavigate={onNavigate} />
        if (block.type === "metric_cards") return <MetricCardsBlock key={index} block={block} onNavigate={onNavigate} />
        if (block.type === "entity_cards") return <EntityCardsBlock key={index} block={block} onNavigate={onNavigate} />
        if (block.type === "table") return <TableBlock key={index} block={block} onNavigate={onNavigate} />
        return null
      })}
    </div>
  )
}

function nonDuplicateBlocks(response: CopilotResponse) {
  const message = response.message.trim()
  return response.blocks.filter((block) => {
    if (block.type !== "text") return true
    const text = (block.text ?? block.content ?? block.value ?? "").trim()
    return text !== message
  })
}

function trapTabKey(event: KeyboardEvent, container: HTMLElement | null) {
  if (event.key !== "Tab" || !container) return
  const focusable = Array.from(container.querySelectorAll<HTMLElement>(
    'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
  )).filter((element) => element.getAttribute("aria-hidden") !== "true")
  if (focusable.length === 0) {
    event.preventDefault()
    container.focus()
    return
  }
  const first = focusable[0]
  const last = focusable[focusable.length - 1]
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault()
    last.focus()
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault()
    first.focus()
  }
}

function CopilotDrawer({ currentPage, activeEntity, onNavigate }: CopilotDrawerProps) {
  const [open, setOpen] = useState(false)
  const [toolMode, setToolMode] = useState<CopilotToolMode>(null)
  const [question, setQuestion] = useState("")
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [remoteSuggestions, setRemoteSuggestions] = useState<{ contextKey: string; items: CopilotSuggestion[] } | null>(null)
  const [contextPreview, setContextPreview] = useState<{ contextKey: string; response: CopilotResponse } | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastQuestion, setLastQuestion] = useState<string | null>(null)
  const [confirmation, setConfirmation] = useState<ConfirmationState | null>(null)
  const [confirmationLoading, setConfirmationLoading] = useState(false)
  const [confirmationError, setConfirmationError] = useState<string | null>(null)
  const [confirmedProposals, setConfirmedProposals] = useState<Set<string>>(() => new Set())
  const [actionNotice, setActionNotice] = useState<string | null>(null)
  const requestRef = useRef<AbortController | null>(null)
  const contextRequestRef = useRef<AbortController | null>(null)
  const historyRequestRef = useRef<AbortController | null>(null)
  const confirmationRequestRef = useRef<AbortController | null>(null)
  const historyLoadedRef = useRef(false)
  const launcherRef = useRef<HTMLButtonElement | null>(null)
  const inputRef = useRef<HTMLTextAreaElement | null>(null)
  const messagesEndRef = useRef<HTMLDivElement | null>(null)
  const drawerRef = useRef<HTMLElement | null>(null)
  const confirmationDialogRef = useRef<HTMLDivElement | null>(null)
  const confirmationCancelRef = useRef<HTMLButtonElement | null>(null)
  const titleId = useId()

  const activeEntityType = activeEntity?.type
  const activeEntityId = activeEntity?.id
  const contextKey = `${currentPage}:${activeEntityType ?? "none"}:${activeEntityId ?? "none"}`
  const localSuggestions = contextualSuggestions(currentPage, activeEntity)
  const preview = contextPreview?.contextKey === contextKey ? contextPreview.response : null
  const suggestions = remoteSuggestions?.contextKey === contextKey && remoteSuggestions.items.length > 0
    ? remoteSuggestions.items.slice(0, 4)
    : preview?.suggestions.length
      ? preview.suggestions.slice(0, 4)
    : localSuggestions

  useEffect(() => {
    if (!open) return
    const timer = window.setTimeout(() => {
      if (confirmation) confirmationCancelRef.current?.focus()
      else inputRef.current?.focus()
    }, 80)
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Tab") {
        trapTabKey(event, confirmation ? confirmationDialogRef.current : drawerRef.current)
      } else if (event.key === "Escape") {
        if (confirmation) {
          if (!confirmationLoading) setConfirmation(null)
        } else {
          setOpen(false)
          window.setTimeout(() => launcherRef.current?.focus(), 0)
        }
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => {
      window.clearTimeout(timer)
      window.removeEventListener("keydown", handleKeyDown)
    }
  }, [confirmation, confirmationLoading, open])

  useEffect(() => {
    if (!open) return
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    const controller = new AbortController()
    contextRequestRef.current?.abort()
    contextRequestRef.current = controller
    askCopilot({
      page: currentPage,
      ...(activeEntityType && activeEntityId ? { active_entity: { type: activeEntityType, id: activeEntityId } } : {}),
    }, controller.signal)
      .then((response) => setContextPreview({ contextKey, response }))
      .catch(() => undefined)
      .finally(() => {
        if (contextRequestRef.current === controller) contextRequestRef.current = null
      })
    return () => controller.abort()
  }, [activeEntityId, activeEntityType, contextKey, currentPage, open])

  useEffect(() => {
    if (!open || historyLoadedRef.current) return
    const controller = new AbortController()
    historyRequestRef.current = controller
    getCopilotHistory(controller.signal)
      .then((history) => {
        historyLoadedRef.current = true
        setMessages((current) => current.length > 0
          ? current
          : history.items.map((item, index) => ({
              id: `history-${item.created_at}-${index}`,
              role: item.role,
              content: item.content,
              page: item.page,
            })))
      })
      .catch((reason: unknown) => {
        if (!isAbortError(reason)) historyLoadedRef.current = true
      })
      .finally(() => {
        if (historyRequestRef.current === controller) historyRequestRef.current = null
      })
    return () => controller.abort()
  }, [open])

  useEffect(() => {
    if (!open) return
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" })
  }, [loading, messages, open])

  useEffect(() => () => {
    requestRef.current?.abort()
    contextRequestRef.current?.abort()
    historyRequestRef.current?.abort()
    confirmationRequestRef.current?.abort()
  }, [])

  function openDrawer() {
    setOpen(true)
    setActionNotice(null)
  }

  function closeDrawer() {
    setOpen(false)
    setToolMode(null)
    setConfirmation(null)
    window.setTimeout(() => launcherRef.current?.focus(), 0)
  }

  function navigate(target: CopilotNavigationTarget) {
    onNavigate(target)
    closeDrawer()
  }

  function addEmailDraft(draft: AIEmailDraftResponse) {
    setMessages((items) => [...items, {
      id: makeId("email-draft"),
      role: "assistant",
      content: `Le brouillon pour ${draft.recipient.name} est prêt. Vous pouvez le relire, le modifier et le copier.`,
      page: currentPage,
      emailDraft: draft,
    }])
    setActionNotice("Brouillon créé. Aucun email n'a été envoyé.")
  }

  function updateEmailDraft(messageId: string, changes: Pick<AIEmailDraftResponse, "subject" | "body">) {
    setMessages((items) => items.map((item) => item.id === messageId && item.emailDraft
      ? { ...item, emailDraft: { ...item.emailDraft, ...changes } }
      : item))
  }

  async function copyEmailDraft(draft: AIEmailDraftResponse) {
    try {
      await navigator.clipboard.writeText(`Objet : ${draft.subject}\n\n${draft.body}`)
      setActionNotice("Brouillon copié dans le presse-papiers.")
    } catch {
      setError("La copie automatique est bloquée par votre navigateur.")
    }
  }

  function handleSuggestion(suggestion: CopilotSuggestion) {
    const searchableText = `${suggestion.id} ${suggestion.label} ${suggestion.prompt}`.toLocaleLowerCase("fr")
    if (/retrouver|trouver|recherch/.test(searchableText) && /client/.test(searchableText)) {
      setToolMode("search")
      setError(null)
      return
    }
    if (/email|e-mail|mail/.test(searchableText) && activeEntity?.type === "customer") {
      setToolMode("email")
      setError(null)
      return
    }
    void sendQuestion(suggestion.prompt)
  }

  async function sendQuestion(rawQuestion: string) {
    const cleanQuestion = rawQuestion.trim()
    if (cleanQuestion.length < 2 || loading) return

    requestRef.current?.abort()
    const controller = new AbortController()
    requestRef.current = controller
    setQuestion("")
    setLoading(true)
    setError(null)
    setActionNotice(null)
    setLastQuestion(cleanQuestion)
    setMessages((items) => [...items, { id: makeId("user"), role: "user", content: cleanQuestion }])

    try {
      const response = await askCopilot({
        page: currentPage,
        question: cleanQuestion,
        ...(activeEntity ? { active_entity: { type: activeEntity.type, id: activeEntity.id } } : {}),
      }, controller.signal)
      setMessages((items) => [...items, { id: makeId("assistant"), role: "assistant", content: response.message, response }])
      setRemoteSuggestions({ contextKey, items: response.suggestions })
    } catch (reason) {
      if (isAbortError(reason)) setError("Demande annulée dans l'interface. Si la génération avait déjà commencé, elle peut compter dans votre usage.")
      else setError(readableError(reason))
    } finally {
      if (requestRef.current === controller) {
        requestRef.current = null
        setLoading(false)
      }
    }
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    void sendQuestion(question)
  }

  async function confirmCurrentAction() {
    if (!confirmation) return
    confirmationRequestRef.current?.abort()
    const controller = new AbortController()
    confirmationRequestRef.current = controller
    setConfirmationLoading(true)
    setConfirmationError(null)
    try {
      if (confirmation.kind === "clear") {
        const clearedHistory = await clearCopilotHistory(controller.signal)
        setMessages([])
        setRemoteSuggestions(null)
        setConfirmedProposals(new Set())
        historyLoadedRef.current = true
        setContextPreview((current) => current
          ? { ...current, response: { ...current.response, memory: clearedHistory.memory } }
          : current)
        setActionNotice("Conversation effacée. Le contexte court du copilote a aussi été réinitialisé.")
      } else {
        const response = await confirmCopilotProposal(confirmation.proposal.proposal_id, controller.signal)
        setConfirmedProposals((items) => new Set(items).add(confirmation.proposal.proposal_id))
        setActionNotice(response.message || "Proposition confirmée. Aucune donnée CRM n'a été modifiée automatiquement.")
      }
      setConfirmation(null)
    } catch (reason) {
      if (!isAbortError(reason)) setConfirmationError(readableError(reason))
    } finally {
      if (confirmationRequestRef.current === controller) {
        confirmationRequestRef.current = null
        setConfirmationLoading(false)
      }
    }
  }

  function openProposalConfirmation(proposal: CopilotProposal) {
    setConfirmationError(null)
    setConfirmation({ kind: "proposal", proposal })
  }

  const latestMemory = [...messages].reverse().find((message) => message.response?.memory)?.response?.memory ?? preview?.memory

  return (
    <>
      <button
        ref={launcherRef}
        type="button"
        onClick={openDrawer}
        aria-label="Ouvrir le copilote Mine CRM AI"
        aria-expanded={open}
        aria-controls="mine-crm-copilot"
        tabIndex={open ? -1 : 0}
        className={`fixed bottom-[82px] right-[16px] z-[70] flex h-[48px] items-center gap-[8px] rounded-full bg-[#2563EB] px-[16px] text-[10px] font-semibold text-white shadow-[0_12px_32px_rgba(37,99,235,0.35)] transition hover:bg-[#1D4ED8] hover:shadow-[0_14px_36px_rgba(37,99,235,0.42)] md:bottom-[24px] md:right-[24px] ${open ? "pointer-events-none translate-y-2 opacity-0" : "opacity-100"}`}
      >
        <span className="flex h-[28px] w-[28px] items-center justify-center rounded-full bg-white/15"><Icon name="ai" size={15} /></span>
        Demander à Mine AI
      </button>

      {open && (
        <div className="fixed inset-0 z-[80] bg-[#0F172A]/25 backdrop-blur-[1px]" onMouseDown={(event) => { if (event.target === event.currentTarget) closeDrawer() }}>
          <aside ref={drawerRef} id="mine-crm-copilot" role={confirmation ? undefined : "dialog"} aria-modal={confirmation ? undefined : "true"} aria-hidden={confirmation ? "true" : undefined} inert={confirmation ? true : undefined} aria-labelledby={confirmation ? undefined : titleId} tabIndex={-1} className="absolute inset-y-0 right-0 flex w-full max-w-[430px] flex-col bg-white shadow-[-16px_0_42px_rgba(15,23,42,0.16)]">
            <header className="shrink-0 border-b border-[#E2E8F0] bg-[#0F172A] px-[16px] py-[14px] text-white">
              <div className="flex items-center gap-[10px]">
                <div className="flex h-[35px] w-[35px] shrink-0 items-center justify-center rounded-[9px] bg-[#2563EB]"><Icon name="ai" size={17} /></div>
                <div className="min-w-0 flex-1"><h2 id={titleId} className="text-[12px] font-semibold">Mine Copilot</h2><p className="mt-[2px] truncate text-[8px] text-[#94A3B8]">Contexte : {pageLabels[currentPage] ?? currentPage}</p></div>
                {messages.length > 0 && <button type="button" onClick={() => { setConfirmationError(null); setConfirmation({ kind: "clear" }) }} aria-label="Effacer la conversation" title="Effacer la conversation" className="flex h-[30px] w-[30px] items-center justify-center rounded-[7px] text-[#94A3B8] hover:bg-white/10 hover:text-white"><Icon name="trash" size={14} /></button>}
                <button type="button" onClick={closeDrawer} aria-label="Fermer le copilote" className="flex h-[30px] w-[30px] items-center justify-center rounded-[7px] text-[#94A3B8] hover:bg-white/10 hover:text-white"><Icon name="close" size={15} /></button>
              </div>
              <div className="mt-[10px] flex flex-wrap items-center gap-[6px]">
                <span className="inline-flex items-center gap-[5px] rounded-full bg-white/10 px-[8px] py-[4px] text-[7px] font-medium text-[#CBD5E1]"><span className="h-[5px] w-[5px] rounded-full bg-[#22C55E]" /> Prêt à vous aider</span>
                {activeEntity && <span className="max-w-[230px] truncate rounded-full bg-[#2563EB]/25 px-[8px] py-[4px] text-[7px] font-medium text-[#BFDBFE]">{activeEntity.label || `${activeEntity.type} #${activeEntity.id}`}</span>}
                {typeof latestMemory?.turns === "number" && <span className="ml-auto text-[7px] text-[#64748B]">Mémoire : {latestMemory.turns}{typeof latestMemory.max_turns === "number" ? `/${latestMemory.max_turns}` : ""} tours</span>}
              </div>
            </header>

            <div className="min-h-0 flex-1 overflow-y-auto bg-[#F8FAFC] px-[13px] py-[14px]" aria-live="polite" aria-relevant="additions text">
              <CopilotTools
                mode={toolMode}
                activeEntity={activeEntity}
                disabled={loading}
                onModeChange={setToolMode}
                onNavigate={navigate}
                onEmailDraft={addEmailDraft}
              />

              {messages.length === 0 && (
                <div className="rounded-[10px] border border-[#DBEAFE] bg-white p-[13px] shadow-[0_4px_14px_rgba(15,23,42,0.04)]">
                  <div className="flex items-start gap-[9px]"><span className="flex h-[28px] w-[28px] shrink-0 items-center justify-center rounded-[7px] bg-[#EFF6FF] text-[#2563EB]"><Icon name="ai" size={14} /></span><div><p className="text-[10px] font-semibold text-[#0F172A]">Comment puis-je vous faire gagner du temps ?</p><p className="mt-[5px] text-[9px] leading-[1.6] text-[#64748B]">Je réponds avec les seules données de votre entreprise. Je peux proposer une action, mais je n'envoie, ne supprime et ne modifie rien automatiquement.</p></div></div>
                </div>
              )}

              {preview && (
                <section className="mt-[10px] rounded-[10px] border border-[#E2E8F0] bg-white p-[11px] shadow-[0_3px_12px_rgba(15,23,42,0.03)]" aria-label="Aperçu contextuel">
                  <div className="flex items-center justify-between gap-[8px]"><p className="text-[8px] font-semibold uppercase tracking-[0.11em] text-[#2563EB]">Aperçu de {pageLabels[currentPage] ?? currentPage}</p><span className="rounded-full bg-[#F0FDF4] px-[6px] py-[3px] text-[7px] font-semibold text-[#15803D]">0 jeton IA</span></div>
                  <p className="mt-[7px] whitespace-pre-wrap text-[9px] leading-[1.55] text-[#475569]">{preview.message}</p>
                  <StructuredBlocks blocks={nonDuplicateBlocks(preview)} onNavigate={navigate} />
                </section>
              )}

              {messages.length === 0 && (
                <div>
                  <p className="mt-[15px] text-[8px] font-semibold uppercase tracking-[0.13em] text-[#94A3B8]">Suggestions pour {pageLabels[currentPage] ?? currentPage}</p>
                  <div className="mt-[7px] grid grid-cols-2 gap-[6px]">{suggestions.map((suggestion) => <button key={suggestion.id} type="button" onClick={() => handleSuggestion(suggestion)} className="min-h-[58px] rounded-[8px] border border-[#E2E8F0] bg-white p-[9px] text-left text-[9px] font-medium leading-[1.45] text-[#475569] shadow-sm transition hover:border-[#BFDBFE] hover:bg-[#EFF6FF] hover:text-[#2563EB]">{suggestion.label}<Icon name="arrow-right" size={10} className="mt-[6px] text-[#94A3B8]" /></button>)}</div>
                </div>
              )}

              <div className="space-y-[12px]">
                {messages.map((message) => (
                  <article key={message.id} className={message.role === "user" ? "ml-[40px]" : "mr-[18px]"}>
                    {message.role === "user" ? (
                      <div className="rounded-[10px] rounded-br-[3px] bg-[#2563EB] px-[11px] py-[9px] text-[10px] leading-[1.55] text-white shadow-sm">{message.content}</div>
                    ) : (
                      <div className="flex items-start gap-[7px]">
                        <span className="mt-[1px] flex h-[25px] w-[25px] shrink-0 items-center justify-center rounded-[7px] bg-[#0F172A] text-white"><Icon name="ai" size={12} /></span>
                        <div className="min-w-0 flex-1 rounded-[10px] rounded-tl-[3px] border border-[#E2E8F0] bg-white px-[11px] py-[10px] shadow-sm [overflow-wrap:anywhere]">
                          <MessageContextBadge page={message.response?.page ?? message.page} currentPage={currentPage} />
                          <p className="whitespace-pre-wrap break-words text-[10px] leading-[1.65] text-[#334155]">{message.content}</p>
                          {message.emailDraft && <EmailDraftBlock draft={message.emailDraft} onChange={(changes) => updateEmailDraft(message.id, changes)} onCopy={() => void copyEmailDraft(message.emailDraft as AIEmailDraftResponse)} />}
                          {message.response && <StructuredBlocks blocks={nonDuplicateBlocks(message.response)} onNavigate={navigate} />}
                          {message.response?.proposals.map((proposal) => {
                            const confirmed = confirmedProposals.has(proposal.proposal_id)
                            return <div key={proposal.proposal_id} className="mt-[8px] rounded-[8px] border border-[#FDE68A] bg-[#FFFBEB] p-[10px]"><div className="flex items-start gap-[7px]"><Icon name="shield" size={13} className="mt-[1px] shrink-0 text-[#D97706]" /><div className="min-w-0 flex-1"><p className="text-[9px] font-semibold text-[#92400E]">{proposal.title}</p><p className="mt-[4px] text-[8px] leading-[1.5] text-[#B45309]">{proposal.description}</p><p className="mt-[5px] text-[7px] font-medium uppercase tracking-[0.06em] text-[#D97706]">Proposition uniquement · aucune exécution automatique</p></div></div><div className="mt-[8px] flex flex-wrap items-center gap-[7px]">{confirmed ? <span className="flex items-center gap-[4px] text-[8px] font-semibold text-[#15803D]"><Icon name="check" size={11} /> Confirmée sans modification</span> : <button type="button" onClick={() => openProposalConfirmation(proposal)} className="rounded-[6px] bg-[#0F172A] px-[9px] py-[6px] text-[8px] font-semibold text-white">Examiner et confirmer</button>}{proposal.entity_type && proposal.entity_id && <button type="button" onClick={() => navigate({ page: inferPage(proposal.entity_type) ?? currentPage, entity_type: proposal.entity_type, entity_id: proposal.entity_id })} className="text-[8px] font-semibold text-[#2563EB]">Voir la fiche</button>}</div></div>
                          })}
                          {message.response && (message.response.sources.length > 0 || message.response.usage) && <div className="mt-[9px] flex flex-wrap items-center gap-[5px] border-t border-[#E2E8F0] pt-[7px] text-[7px] text-[#94A3B8]">{message.response.sources.slice(0, 3).map((source, index) => <span key={`${source.label}-${index}`} className="rounded-full bg-[#F1F5F9] px-[6px] py-[3px]">{source.label}</span>)}{typeof message.response.usage?.total_tokens === "number" && <span className="ml-auto">{message.response.usage.total_tokens} jetons</span>}{requestCost(message.response) && <span>· {requestCost(message.response)}</span>}</div>}
                        </div>
                      </div>
                    )}
                  </article>
                ))}
              </div>

              {loading && <div role="status" className="mt-[12px] mr-[50px] flex items-center gap-[7px]"><span className="flex h-[25px] w-[25px] shrink-0 items-center justify-center rounded-[7px] bg-[#0F172A] text-white"><Icon name="ai" size={12} /></span><div className="flex items-center gap-[5px] rounded-[9px] border border-[#E2E8F0] bg-white px-[10px] py-[9px]"><span className="h-[5px] w-[5px] animate-bounce rounded-full bg-[#94A3B8]" /><span className="h-[5px] w-[5px] animate-bounce rounded-full bg-[#94A3B8] [animation-delay:120ms]" /><span className="h-[5px] w-[5px] animate-bounce rounded-full bg-[#94A3B8] [animation-delay:240ms]" /><span className="ml-[4px] text-[8px] text-[#64748B]">Analyse en cours</span></div><button type="button" onClick={() => requestRef.current?.abort()} className="text-[8px] font-semibold text-[#64748B] underline">Annuler</button></div>}
              {error && <div role="alert" className="mt-[12px] rounded-[8px] border border-[#FECACA] bg-[#FEF2F2] p-[10px] text-[9px] text-[#B91C1C]"><p>{error}</p>{lastQuestion && !loading && <button type="button" onClick={() => void sendQuestion(lastQuestion)} className="mt-[6px] flex items-center gap-[4px] font-semibold underline"><Icon name="refresh" size={10} /> Réessayer</button>}</div>}
              {actionNotice && <div role="status" className="mt-[12px] flex items-start gap-[6px] rounded-[8px] border border-[#BBF7D0] bg-[#F0FDF4] p-[10px] text-[9px] leading-[1.5] text-[#15803D]"><Icon name="check" size={12} className="mt-[1px] shrink-0" />{actionNotice}</div>}
              {messages.length > 0 && !loading && <div className="mt-[14px]"><p className="text-[8px] font-semibold uppercase tracking-[0.11em] text-[#94A3B8]">Continuer</p><div className="mt-[6px] flex flex-wrap gap-[5px]">{suggestions.map((suggestion) => <button key={suggestion.id} type="button" onClick={() => handleSuggestion(suggestion)} className="rounded-full border border-[#DBEAFE] bg-white px-[8px] py-[5px] text-[8px] font-medium text-[#2563EB] hover:bg-[#EFF6FF]">{suggestion.label}</button>)}</div></div>}
              <div ref={messagesEndRef} />
            </div>

            <footer className="shrink-0 border-t border-[#E2E8F0] bg-white p-[12px] pb-[max(12px,env(safe-area-inset-bottom))]">
              <form onSubmit={handleSubmit} className="rounded-[9px] border border-[#CBD5E1] bg-white p-[7px] shadow-[0_3px_12px_rgba(15,23,42,0.05)] focus-within:border-[#2563EB] focus-within:ring-2 focus-within:ring-[#DBEAFE]">
                <label htmlFor="copilot-question" className="sr-only">Votre question pour le copilote</label>
                <textarea ref={inputRef} id="copilot-question" value={question} onChange={(event) => setQuestion(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); void sendQuestion(question) } }} maxLength={2000} rows={2} placeholder={`Posez une question sur ${pageLabels[currentPage] ?? "cette page"}...`} className="max-h-[120px] min-h-[42px] w-full resize-none border-0 px-[4px] py-[3px] text-[10px] leading-[1.55] text-[#0F172A] outline-none placeholder:text-[#94A3B8]" />
                <div className="mt-[4px] flex items-center justify-between gap-[8px]"><span className="text-[7px] text-[#94A3B8]">Entrée pour envoyer · Maj+Entrée pour une ligne</span><button type="submit" disabled={loading || question.trim().length < 2} aria-label="Envoyer la question" className="flex h-[29px] w-[29px] items-center justify-center rounded-[7px] bg-[#2563EB] text-white hover:bg-[#1D4ED8] disabled:cursor-not-allowed disabled:opacity-40"><Icon name="send" size={13} /></button></div>
              </form>
              <p className="mt-[6px] flex items-center justify-center gap-[4px] text-[7px] text-[#94A3B8]"><Icon name="shield" size={9} /> Vérifiez toujours les informations importantes.</p>
            </footer>
          </aside>
        </div>
      )}

      {confirmation && (
        <div className="fixed inset-0 z-[95] flex items-center justify-center bg-[#0F172A]/45 p-[16px]" role="dialog" aria-modal="true" aria-labelledby="copilot-confirmation-title">
          <div ref={confirmationDialogRef} tabIndex={-1} className="w-full max-w-[390px] rounded-[12px] bg-white p-[20px] shadow-2xl">
            <div className={`flex h-[38px] w-[38px] items-center justify-center rounded-full ${confirmation.kind === "clear" ? "bg-[#FEF2F2] text-[#DC2626]" : "bg-[#FFFBEB] text-[#D97706]"}`}><Icon name={confirmation.kind === "clear" ? "trash" : "shield"} size={17} /></div>
            <h3 id="copilot-confirmation-title" className="mt-[13px] text-[15px] font-semibold text-[#0F172A]">{confirmation.kind === "clear" ? "Effacer cette conversation ?" : confirmation.proposal.title}</h3>
            <p className="mt-[7px] text-[10px] leading-[1.6] text-[#64748B]">{confirmation.kind === "clear" ? "Les messages visibles et la mémoire courte associée à cette session seront supprimés." : confirmation.proposal.description}</p>
            {confirmation.kind === "proposal" && <div className="mt-[11px] rounded-[8px] border border-[#BFDBFE] bg-[#EFF6FF] p-[10px] text-[9px] leading-[1.55] text-[#1D4ED8]"><strong>Contrôle conservé :</strong> cette confirmation valide uniquement la proposition. Aucun email ne sera envoyé et aucune donnée CRM ne sera créée, modifiée ou supprimée.</div>}
            {confirmationError && <div role="alert" className="mt-[11px] rounded-[7px] border border-[#FECACA] bg-[#FEF2F2] p-[9px] text-[9px] text-[#B91C1C]">{confirmationError}</div>}
            <div className="mt-[17px] flex justify-end gap-[7px]"><button ref={confirmationCancelRef} type="button" disabled={confirmationLoading} onClick={() => setConfirmation(null)} className="h-[35px] rounded-[7px] border border-[#CBD5E1] px-[12px] text-[9px] font-semibold text-[#475569] hover:bg-[#F8FAFC] disabled:opacity-50">Annuler</button><button type="button" disabled={confirmationLoading} onClick={() => void confirmCurrentAction()} className={`h-[35px] rounded-[7px] px-[13px] text-[9px] font-semibold text-white disabled:opacity-50 ${confirmation.kind === "clear" ? "bg-[#DC2626] hover:bg-[#B91C1C]" : "bg-[#2563EB] hover:bg-[#1D4ED8]"}`}>{confirmationLoading ? "Confirmation..." : confirmation.kind === "clear" ? "Effacer" : "Confirmer la proposition"}</button></div>
          </div>
        </div>
      )}
    </>
  )
}

export default CopilotDrawer
