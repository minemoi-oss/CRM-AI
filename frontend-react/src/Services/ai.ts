import { authenticatedRequest } from "./auth"

export interface AIRequestUsage {
  input_tokens?: number
  output_tokens?: number
  total_tokens?: number
  estimated_cost_cents?: number
  estimated_cost_microusd?: number
}

export interface AISource {
  kind?: string
  label: string
  entity_type?: string
  entity_id?: number
}

export interface AIStatus {
  enabled: boolean
  ready: boolean
  provider: string
  model: string | null
  message: string | null
  capabilities: string[]
  limits: {
    daily_requests?: number
    monthly_budget_cents?: number
    monthly_budget_microusd?: number
    max_input_chars?: number
    max_output_tokens?: number
  }
  usage: {
    requests_today?: number
    requests_this_month?: number
    estimated_cost_cents_this_month?: number
    estimated_cost_microusd_this_month?: number
    remaining_requests_today?: number
    remaining_budget_cents?: number
    remaining_budget_microusd?: number
  }
}

export interface AIClient {
  id: number
  first_name?: string
  last_name?: string
  full_name?: string
  email?: string | null
  phone?: string | null
  created_at?: string
}

export interface AIClientSearchResponse {
  query: string
  items: AIClient[]
  total: number
}

export interface AIQuestionResponse {
  action?: string
  request_id?: number | string
  answer: string
  provider?: string
  model?: string | null
  sources: AISource[]
  usage?: AIRequestUsage
}

export interface AIEmailDraftResponse {
  action?: string
  request_id?: number | string
  recipient: {
    customer_id?: number
    id?: number
    name: string
    email?: string | null
  }
  subject: string
  body: string
  is_draft?: boolean
  provider?: string
  model?: string | null
  usage?: AIRequestUsage
}

export interface AIHistorySummaryResponse {
  action?: string
  request_id?: number | string
  customer: {
    id: number
    name: string
    email?: string | null
  }
  summary: string
  highlights: string[]
  warning?: string | null
  provider?: string
  model?: string | null
  sources: AISource[]
  usage?: AIRequestUsage
}

type LooseStatus = Partial<AIStatus> & {
  configured?: boolean
  privacy_mode?: string
  daily_request_limit?: number
  used_today?: number
  remaining_today?: number
  requests_this_month?: number
  estimated_cost_usd?: number
}

function asNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined
}

function normalizeSources(value: unknown): AISource[] {
  if (!Array.isArray(value)) return []
  return value.flatMap((item) => {
    if (typeof item === "string") return [{ label: item }]
    if (!item || typeof item !== "object") return []
    const source = item as Partial<AISource>
    return typeof source.label === "string" ? [{ ...source, label: source.label }] : []
  })
}

function requireText(value: unknown, fallback: string): string {
  if (typeof value === "string" && value.trim()) return value
  throw new Error(fallback)
}

export async function getAIStatus(signal?: AbortSignal): Promise<AIStatus> {
  const raw = await authenticatedRequest<LooseStatus>("/ai/status", { signal })
  const limits = raw.limits ?? {}
  const usage = raw.usage ?? {}
  const estimatedCostCents = asNumber(usage.estimated_cost_cents_this_month)
    ?? (typeof raw.estimated_cost_usd === "number" ? raw.estimated_cost_usd * 100 : undefined)

  return {
    enabled: raw.enabled !== false,
    ready: raw.ready ?? raw.configured ?? raw.enabled !== false,
    provider: typeof raw.provider === "string" ? raw.provider : "inconnu",
    model: typeof raw.model === "string" ? raw.model : null,
    message: typeof raw.message === "string" ? raw.message : null,
    capabilities: Array.isArray(raw.capabilities)
      ? raw.capabilities.filter((item): item is string => typeof item === "string")
      : [],
    limits: {
      ...limits,
      daily_requests: asNumber(limits.daily_requests) ?? asNumber(raw.daily_request_limit),
    },
    usage: {
      ...usage,
      requests_today: asNumber(usage.requests_today) ?? asNumber(raw.used_today),
      requests_this_month: asNumber(usage.requests_this_month) ?? asNumber(raw.requests_this_month),
      remaining_requests_today: asNumber(usage.remaining_requests_today) ?? asNumber(raw.remaining_today),
      estimated_cost_cents_this_month: estimatedCostCents,
    },
  }
}

type LooseClientSearch = Partial<AIClientSearchResponse> & {
  results?: AIClient[]
}

export async function searchAIClients(
  query: string,
  limit = 8,
  signal?: AbortSignal,
): Promise<AIClientSearchResponse> {
  const params = new URLSearchParams({ q: query.trim(), limit: String(limit) })
  const raw = await authenticatedRequest<LooseClientSearch | AIClient[]>(
    `/ai/customers/search?${params.toString()}`,
    { signal },
  )
  const items = Array.isArray(raw) ? raw : raw.items ?? raw.results ?? []
  return {
    query: Array.isArray(raw) ? query.trim() : raw.query ?? query.trim(),
    items,
    total: Array.isArray(raw) ? raw.length : raw.total ?? items.length,
  }
}

type LooseQuestion = Partial<AIQuestionResponse> & {
  response?: string
  message?: string
}

export async function askAI(question: string, signal?: AbortSignal): Promise<AIQuestionResponse> {
  const raw = await authenticatedRequest<LooseQuestion>("/ai/ask", {
    method: "POST",
    body: JSON.stringify({ question: question.trim() }),
    signal,
  })
  return {
    ...raw,
    answer: requireText(raw.answer ?? raw.response ?? raw.message, "L'assistant n'a renvoyé aucune réponse."),
    sources: normalizeSources(raw.sources),
  }
}

export interface AIEmailDraftInput {
  customer_id: number
  objective: string
  tone: "professional" | "friendly" | "concise"
  language: "fr"
}

type LooseEmailDraft = Partial<AIEmailDraftResponse> & {
  recipient?: Partial<AIEmailDraftResponse["recipient"]>
}

export async function createAIEmailDraft(
  input: AIEmailDraftInput,
  signal?: AbortSignal,
): Promise<AIEmailDraftResponse> {
  const raw = await authenticatedRequest<LooseEmailDraft>("/ai/email-drafts", {
    method: "POST",
    body: JSON.stringify(input),
    signal,
  })
  return {
    ...raw,
    recipient: {
      ...raw.recipient,
      name: typeof raw.recipient?.name === "string" ? raw.recipient.name : "Client",
    },
    subject: requireText(raw.subject, "Le brouillon ne contient pas d'objet."),
    body: requireText(raw.body, "Le brouillon ne contient aucun message."),
  }
}

type LooseSummary = Partial<AIHistorySummaryResponse> & {
  customer?: Partial<AIHistorySummaryResponse["customer"]>
  key_points?: string[]
}

export async function summarizeAIClientHistory(
  customerId: number,
  focus: string,
  signal?: AbortSignal,
): Promise<AIHistorySummaryResponse> {
  const raw = await authenticatedRequest<LooseSummary>(`/ai/customers/${customerId}/summary`, {
    method: "POST",
    body: JSON.stringify(focus.trim() ? { focus: focus.trim() } : {}),
    signal,
  })
  return {
    ...raw,
    customer: {
      ...raw.customer,
      id: raw.customer?.id ?? customerId,
      name: typeof raw.customer?.name === "string" ? raw.customer.name : "Client",
    },
    summary: requireText(raw.summary, "Aucun résumé n'a été généré."),
    highlights: Array.isArray(raw.highlights)
      ? raw.highlights.filter((item): item is string => typeof item === "string")
      : Array.isArray(raw.key_points)
        ? raw.key_points.filter((item): item is string => typeof item === "string")
        : [],
    sources: normalizeSources(raw.sources),
  }
}

export type CopilotPage = "dashboard" | "ai" | "clients" | "prospects" | "products" | "services" | "quotes" | "invoices" | "reports" | "settings"
export type CopilotEntityType = "customer" | "prospect" | "invoice" | "quote" | "service" | "product"

const copilotPages = new Set<CopilotPage>(["dashboard", "ai", "clients", "prospects", "products", "services", "quotes", "invoices", "reports", "settings"])

function isCopilotPage(value: unknown): value is CopilotPage {
  return typeof value === "string" && copilotPages.has(value as CopilotPage)
}

function requireCopilotMemory(value: unknown): CopilotMemory {
  if (!value || typeof value !== "object") throw new Error("La mémoire du copilote est invalide.")
  const memory = value as Partial<CopilotMemory>
  if (
    typeof memory.turns !== "number"
    || typeof memory.max_turns !== "number"
    || typeof memory.expires_in_seconds !== "number"
  ) {
    throw new Error("La mémoire du copilote est invalide.")
  }
  return {
    turns: memory.turns,
    max_turns: memory.max_turns,
    expires_in_seconds: memory.expires_in_seconds,
  }
}

export interface CopilotActiveEntity {
  type: CopilotEntityType
  id: number
  label?: string
}

export interface CopilotNavigationTarget {
  page: CopilotPage
  entity_type?: CopilotEntityType
  entity_id?: number
  query?: string
  label?: string
}

export interface CopilotSuggestion {
  id: string
  label: string
  prompt: string
}

export interface CopilotProposal {
  proposal_id: string
  action: string
  title: string
  description: string
  requires_confirmation: true
  execution_mode: "proposal_only"
  entity_type?: CopilotEntityType
  entity_id?: number
}

export interface CopilotMetricCard {
  label: string
  value: string | number
  format?: "number" | "currency" | "percent" | "text"
  detail?: string
  trend?: string
  tone?: "neutral" | "positive" | "warning" | "danger"
  link?: CopilotNavigationTarget
}

export interface CopilotEntityCard {
  entity_type?: CopilotEntityType
  entity_id?: number
  id?: number
  title?: string
  label?: string
  subtitle?: string
  meta?: string
  description?: string
  fields?: Record<string, string | number | null>
  link?: CopilotNavigationTarget
}

export interface CopilotTableColumn {
  key: string
  label: string
}

export interface CopilotTableRow {
  [key: string]: unknown
  link?: CopilotNavigationTarget
}

export type CopilotBlock =
  | {
      type: "text"
      title?: string
      text?: string
      content?: string
      value?: string
      link?: CopilotNavigationTarget
    }
  | {
      type: "metric_cards"
      title?: string
      cards?: CopilotMetricCard[]
      items?: CopilotMetricCard[]
    }
  | {
      type: "entity_cards"
      title?: string
      entity_type: CopilotEntityType
      cards?: CopilotEntityCard[]
      entities?: CopilotEntityCard[]
      items?: CopilotEntityCard[]
    }
  | {
      type: "table"
      title?: string
      columns?: CopilotTableColumn[]
      rows?: CopilotTableRow[]
      link?: CopilotNavigationTarget
    }

export interface CopilotMemory {
  turns: number
  max_turns: number
  expires_in_seconds: number
}

export interface CopilotResponse {
  request_id: string | null
  message: string
  page: CopilotPage
  blocks: CopilotBlock[]
  suggestions: CopilotSuggestion[]
  proposals: CopilotProposal[]
  sources: AISource[]
  usage: AIRequestUsage | null
  memory: CopilotMemory
}

export interface CopilotRequest {
  page: CopilotPage
  question?: string
  active_entity?: Pick<CopilotActiveEntity, "type" | "id">
}

type LooseCopilotResponse = Partial<CopilotResponse> & {
  answer?: string
}

export async function askCopilot(
  input: CopilotRequest,
  signal?: AbortSignal,
): Promise<CopilotResponse> {
  const raw = await authenticatedRequest<LooseCopilotResponse>("/ai/copilot", {
    method: "POST",
    body: JSON.stringify({
      page: input.page,
      ...(input.question?.trim() ? { question: input.question.trim() } : {}),
      ...(input.active_entity ? { active_entity: input.active_entity } : {}),
    }),
    signal,
  })

  return {
    request_id: typeof raw.request_id === "string" ? raw.request_id : null,
    message: requireText(raw.message ?? raw.answer, "Le copilote n'a renvoyé aucune réponse."),
    page: isCopilotPage(raw.page) ? raw.page : input.page,
    blocks: Array.isArray(raw.blocks) ? raw.blocks : [],
    suggestions: Array.isArray(raw.suggestions) ? raw.suggestions : [],
    proposals: Array.isArray(raw.proposals) ? raw.proposals : [],
    sources: normalizeSources(raw.sources),
    usage: raw.usage ?? null,
    memory: requireCopilotMemory(raw.memory),
  }
}

export interface CopilotProposalConfirmation {
  proposal_id: string
  status: "confirmed"
  executed: false
  message: string
}

export interface CopilotHistoryItem {
  role: "user" | "assistant"
  content: string
  created_at: string
  page: CopilotPage
}

export interface CopilotHistoryResponse {
  items: CopilotHistoryItem[]
  memory: CopilotMemory
}

export async function getCopilotHistory(signal?: AbortSignal): Promise<CopilotHistoryResponse> {
  const response = await authenticatedRequest<Partial<CopilotHistoryResponse>>("/ai/copilot/history", { signal })
  return {
    items: Array.isArray(response.items) ? response.items : [],
    memory: requireCopilotMemory(response.memory),
  }
}

export async function confirmCopilotProposal(
  proposalId: string,
  signal?: AbortSignal,
): Promise<CopilotProposalConfirmation> {
  return authenticatedRequest<CopilotProposalConfirmation>(
    `/ai/copilot/proposals/${encodeURIComponent(proposalId)}/confirm`,
    { method: "POST", signal },
  )
}

export async function clearCopilotHistory(signal?: AbortSignal): Promise<CopilotHistoryResponse> {
  const response = await authenticatedRequest<Partial<CopilotHistoryResponse>>("/ai/copilot/history", { method: "DELETE", signal })
  return {
    items: Array.isArray(response.items) ? response.items : [],
    memory: requireCopilotMemory(response.memory),
  }
}
