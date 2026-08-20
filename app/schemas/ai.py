from datetime import datetime
from typing import Annotated, Literal

from pydantic import BaseModel, Field, field_validator


AIAction = Literal["ask", "email_draft", "customer_summary", "copilot"]
AIProviderName = Literal["local", "openai"]


class AIUsageResponse(BaseModel):
    input_tokens: int = Field(ge=0)
    output_tokens: int = Field(ge=0)
    total_tokens: int = Field(ge=0)
    estimated_cost_microusd: int = Field(ge=0)
    estimated_cost_cents: float = Field(ge=0)
    estimated_cost_usd: float = Field(ge=0)
    duration_ms: int = Field(ge=0)


class AISource(BaseModel):
    kind: str
    label: str


class AIStatusLimits(BaseModel):
    daily_requests: int
    monthly_budget_cents: float
    monthly_budget_microusd: int
    max_input_chars: int
    max_output_tokens: int


class AIStatusUsage(BaseModel):
    requests_today: int
    requests_this_month: int
    estimated_cost_microusd_this_month: int
    estimated_cost_cents_this_month: float
    estimated_cost_usd_this_month: float
    remaining_requests_today: int
    remaining_budget_microusd: int
    remaining_budget_cents: float


class AIStatusResponse(BaseModel):
    enabled: bool
    provider: AIProviderName
    model: str
    ready: bool
    message: str
    capabilities: list[str]
    limits: AIStatusLimits
    usage: AIStatusUsage


class AICustomerSearchItem(BaseModel):
    id: int
    first_name: str
    last_name: str
    full_name: str
    email: str
    phone: str
    created_at: datetime


class AICustomerSearchResponse(BaseModel):
    query: str
    items: list[AICustomerSearchItem]
    total: int


class AIAskRequest(BaseModel):
    # The service applies the configured (normally smaller) effective limit.
    # This upper bound also supports deployments that intentionally raise it.
    question: str = Field(min_length=2, max_length=20_000)


class AIAskResponse(BaseModel):
    action: Literal["ask"] = "ask"
    request_id: str
    answer: str
    provider: AIProviderName
    model: str
    sources: list[AISource]
    usage: AIUsageResponse


class AIEmailDraftRequest(BaseModel):
    customer_id: int = Field(gt=0)
    objective: str = Field(min_length=2, max_length=2_000)
    tone: Literal["professional", "friendly", "concise"] = "professional"
    language: Literal["fr", "en"] = "fr"


class AIEmailRecipient(BaseModel):
    customer_id: int
    name: str
    email: str


class AIEmailDraftResponse(BaseModel):
    action: Literal["email_draft"] = "email_draft"
    is_draft: Literal[True] = True
    request_id: str
    recipient: AIEmailRecipient
    subject: str
    body: str
    provider: AIProviderName
    model: str
    usage: AIUsageResponse


class AICustomerSummaryRequest(BaseModel):
    focus: str | None = Field(default=None, max_length=500)


class AICustomerIdentity(BaseModel):
    id: int
    name: str
    email: str


class AICustomerSummaryResponse(BaseModel):
    action: Literal["customer_summary"] = "customer_summary"
    request_id: str
    customer: AICustomerIdentity
    summary: str
    highlights: list[str]
    warning: str
    provider: AIProviderName
    model: str
    sources: list[AISource]
    usage: AIUsageResponse


CopilotPage = Literal[
    "dashboard",
    "ai",
    "clients",
    "prospects",
    "products",
    "services",
    "quotes",
    "invoices",
    "reports",
    "settings",
]
CopilotEntityType = Literal[
    "customer",
    "prospect",
    "invoice",
    "quote",
    "service",
    "product",
]


class CopilotActiveEntity(BaseModel):
    type: CopilotEntityType
    id: int = Field(gt=0)


class CopilotRequest(BaseModel):
    page: CopilotPage
    question: str | None = Field(default=None, max_length=20_000)
    active_entity: CopilotActiveEntity | None = None

    @field_validator("question")
    @classmethod
    def normalize_question(cls, value: str | None) -> str | None:
        if value is None:
            return None
        normalized = value.strip()
        return normalized or None


class CopilotLink(BaseModel):
    page: CopilotPage
    entity_type: CopilotEntityType | None = None
    entity_id: int | None = Field(default=None, gt=0)
    query: str | None = Field(default=None, max_length=100)


class CopilotMetricItem(BaseModel):
    label: str
    value: str | int | float
    format: Literal["number", "currency", "percent", "text"] = "number"
    link: CopilotLink | None = None


class CopilotMetricCardsBlock(BaseModel):
    type: Literal["metric_cards"] = "metric_cards"
    items: list[CopilotMetricItem]


class CopilotEntityCardItem(BaseModel):
    id: int
    title: str
    subtitle: str | None = None
    meta: str | None = None
    link: CopilotLink


class CopilotEntityCardsBlock(BaseModel):
    type: Literal["entity_cards"] = "entity_cards"
    entity_type: CopilotEntityType
    items: list[CopilotEntityCardItem]


class CopilotTableColumn(BaseModel):
    key: str
    label: str


class CopilotTableBlock(BaseModel):
    type: Literal["table"] = "table"
    columns: list[CopilotTableColumn]
    rows: list[dict[str, str | int | float | bool | CopilotLink | None]]
    link: CopilotLink | None = None


class CopilotTextBlock(BaseModel):
    type: Literal["text"] = "text"
    text: str


CopilotBlock = Annotated[
    CopilotTextBlock
    | CopilotMetricCardsBlock
    | CopilotEntityCardsBlock
    | CopilotTableBlock,
    Field(discriminator="type"),
]


class CopilotSuggestion(BaseModel):
    id: str
    label: str
    prompt: str


class CopilotProposal(BaseModel):
    proposal_id: str
    action: str
    title: str
    description: str
    requires_confirmation: Literal[True] = True
    execution_mode: Literal["proposal_only"] = "proposal_only"
    entity_type: CopilotEntityType | None = None
    entity_id: int | None = Field(default=None, gt=0)


class CopilotMemoryInfo(BaseModel):
    turns: int = Field(ge=0)
    max_turns: int = Field(gt=0)
    expires_in_seconds: int = Field(ge=0)


class CopilotResponse(BaseModel):
    request_id: str | None
    message: str
    page: CopilotPage
    blocks: list[CopilotBlock]
    suggestions: list[CopilotSuggestion]
    proposals: list[CopilotProposal]
    sources: list[AISource]
    usage: AIUsageResponse | None
    memory: CopilotMemoryInfo


class CopilotHistoryItem(BaseModel):
    role: Literal["user", "assistant"]
    content: str
    created_at: datetime
    page: CopilotPage
    entity_type: CopilotEntityType | None = None
    entity_id: int | None = Field(default=None, gt=0)


class CopilotHistoryResponse(BaseModel):
    items: list[CopilotHistoryItem]
    memory: CopilotMemoryInfo


class CopilotProposalConfirmationResponse(BaseModel):
    proposal_id: str
    status: Literal["confirmed"] = "confirmed"
    executed: Literal[False] = False
    message: str
