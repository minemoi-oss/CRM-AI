import { API_URL, authenticatedRequest, forgetSession, logoutAllSessions } from "./auth"


// ==========================================
// BACKEND
// ==========================================

export async function checkBackend() {

  const response = await fetch(`${API_URL}/health/db`, { credentials: "include" })

  if (!response.ok) {
    throw new Error(
      "Le backend ne répond pas correctement"
    )
  }

  return response.json()
}


// ==========================================
// CUSTOMER
// ==========================================

export interface Customer {

  id: number

  first_name: string

  last_name: string

  email: string

  phone: string

  company_id: number | null

  created_at: string

  updated_at: string
}


export interface CustomerCreate {

  first_name: string

  last_name: string

  email: string

  phone: string
}


export interface CustomerUpdate {

  first_name: string

  last_name: string

  email: string

  phone: string
}


export interface CustomerListResponse {

  items: Customer[]

  total: number

  page: number

  size: number

  pages: number
}


// ==========================================
// AFFICHER + RECHERCHER + PAGINATION
// ==========================================

export async function getCustomers(

  search = "",

  page = 1,

  size = 10

): Promise<CustomerListResponse> {

  const params = new URLSearchParams()

  if (search.trim() !== "") {

    params.append(
      "search",
      search.trim()
    )

  }

  params.append(
    "page",
    String(page)
  )

  params.append(
    "size",
    String(size)
  )


  return authenticatedRequest<CustomerListResponse>(`/customers?${params.toString()}`)
}


// ==========================================
// CRÉER
// ==========================================

export async function createCustomer(

  customer: CustomerCreate

): Promise<Customer> {
  return authenticatedRequest<Customer>("/customers", {
    method: "POST",
    body: JSON.stringify(customer),
  })
}


// ==========================================
// DÉTAIL
// ==========================================

export async function getCustomer(

  customerId: number

): Promise<Customer> {
  return authenticatedRequest<Customer>(`/customers/${customerId}`)
}


// ==========================================
// MODIFIER
// ==========================================

export async function updateCustomer(

  customerId: number,

  customer: CustomerUpdate

): Promise<Customer> {
  return authenticatedRequest<Customer>(`/customers/${customerId}`, {
    method: "PUT",
    body: JSON.stringify(customer),
  })
}


// ==========================================
// SUPPRIMER
// ==========================================

export async function deleteCustomer(

  customerId: number

): Promise<void> {
  await authenticatedRequest<void>(`/customers/${customerId}`, { method: "DELETE" })
}


// ==========================================
// PROSPECTS
// ==========================================

export type ProspectStatus =
  | "new"
  | "contacted"
  | "qualified"
  | "lost"
  | "converted"

export type EditableProspectStatus = Exclude<ProspectStatus, "converted">

export type ProspectPriority = "low" | "medium" | "high"

export interface Prospect {
  id: number
  first_name: string
  last_name: string
  email: string
  phone: string
  organization: string | null
  notes: string | null
  status: ProspectStatus
  priority: ProspectPriority
  customer_id: number | null
  converted_at: string | null
  created_at: string
  updated_at: string
}

export interface ProspectInput {
  first_name: string
  last_name: string
  email: string
  phone: string
  organization: string | null
  notes: string | null
  status: EditableProspectStatus
  priority: ProspectPriority
}

export interface ProspectListResponse {
  items: Prospect[]
  total: number
  page: number
  size: number
  pages: number
}

export interface ProspectConversionResponse {
  prospect: Prospect
  customer: Customer
}


export interface DashboardData {
  total_clients: number
  monthly_revenue: number
  pending_invoices: number
  conversion_rate: number
  monthly_revenues: { month: string; value: number }[]
  recent_clients: { id: number; name: string; email: string; company: string; status: "Actif" | "En attente" | "Inactif" }[]
  recent_activities: { id: string; title: string; description: string; created_at: string; type: "client" | "payment" | "invoice" | "email" }[]
}

export interface Invoice {
  id: number
  invoice_number: string
  quote_id: number
  status: string
  total: number
  created_at: string
  updated_at: string
  customer_name: string
  payment_method: string | null
  due_date: string
}

export interface Quote {
  id: number
  customer_id: number
  status: string
  total: number
  created_at: string
  updated_at: string
}

export interface Product {
  id: number
  name: string
  description: string | null
  price: number
  stock: number
  company_id: number
  created_at: string
  updated_at: string
}

export interface Service {
  id: number
  name: string
  description: string | null
  pricing_type: "fixed" | "hourly"
  price: number
  duration: number | null
  company_id: number
  created_at: string
  updated_at: string
}

export interface QuoteItem {
  id: number
  quote_id: number
  product_id: number | null
  service_id: number | null
  item_type: "product" | "service"
  item_name: string
  unit: "unit" | "package" | "hour"
  quantity: number
  unit_price: number
  line_total: number
}

export interface ReportData {
  total_invoiced: number
  total_paid: number
  outstanding: number
  invoice_count: number
  client_count: number
  conversion_rate: number
  monthly_revenues: { month: string; value: number }[]
}

export interface Payment {
  id: number
  invoice_id: number
  amount: number
  payment_method: string
  status: string
  paid_at: string | null
  created_at: string
}

export interface CurrentUser {
  id: number
  username: string
  email: string
  is_active: boolean
  email_verified?: boolean
  pending_email?: string | null
}

export interface UserUpdateInput {
  username: string
  email: string
  current_password?: string
}

export interface UserUpdateResponse {
  user: CurrentUser
  message: string
  email_change_pending: boolean
  development_token?: string | null
}

export interface UserSession {
  id: string
  user_agent: string | null
  ip_address: string | null
  created_at: string
  last_used_at: string
  expires_at: string
  revoked_at?: string | null
  current?: boolean
  is_current?: boolean
}

export interface SecurityEvent {
  id: number
  event_type: string
  success?: boolean
  ip_address: string | null
  user_agent: string | null
  details?: Record<string, unknown> | null
  created_at: string
}

export interface Company {
  id: number
  name: string
  email: string
  phone: string
  website: string | null
  created_at: string
  updated_at: string
}

export const getDashboard = (months: 6 | 12 = 6) => authenticatedRequest<DashboardData>(`/dashboard/?months=${months}`)
export const getReports = (months: 6 | 12 = 6) => authenticatedRequest<ReportData>(`/dashboard/reports?months=${months}`)
export const getInvoices = () => authenticatedRequest<Invoice[]>("/invoices")
export const getQuotes = () => authenticatedRequest<Quote[]>("/quotes")
export const createQuote = (customerId: number) =>
  authenticatedRequest<Quote>("/quotes", { method: "POST", body: JSON.stringify({ customer_id: customerId }) })
export const deleteQuote = (quoteId: number) =>
  authenticatedRequest<{ message: string }>(`/quotes/${quoteId}`, { method: "DELETE" })
export const getProducts = () => authenticatedRequest<Product[]>("/products")
export type ProductInput = Pick<Product, "name" | "description" | "price" | "stock">
export const createProduct = (data: ProductInput) =>
  authenticatedRequest<Product>("/products", { method: "POST", body: JSON.stringify(data) })
export const updateProduct = (productId: number, data: ProductInput) =>
  authenticatedRequest<Product>(`/products/${productId}`, { method: "PUT", body: JSON.stringify(data) })
export const deleteProduct = (productId: number) =>
  authenticatedRequest<{ message: string }>(`/products/${productId}`, { method: "DELETE" })
export type ServiceInput = Pick<Service, "name" | "description" | "pricing_type" | "price" | "duration">
export const getServices = () => authenticatedRequest<Service[]>("/services")
export const createService = (data: ServiceInput) => authenticatedRequest<Service>("/services", { method: "POST", body: JSON.stringify(data) })
export const updateService = (serviceId: number, data: ServiceInput) => authenticatedRequest<Service>(`/services/${serviceId}`, { method: "PUT", body: JSON.stringify(data) })
export const deleteService = (serviceId: number) => authenticatedRequest<{ message: string }>(`/services/${serviceId}`, { method: "DELETE" })
export type QuoteLineInput =
  | { product_id: number; service_id?: never; quantity: number }
  | { product_id?: never; service_id: number; quantity: number }
export const createQuoteItem = (quoteId: number, item: QuoteLineInput) =>
  authenticatedRequest<QuoteItem>("/quote-items", { method: "POST", body: JSON.stringify({ quote_id: quoteId, ...item }) })
export const createQuoteWithItems = (customerId: number, items: QuoteLineInput[]) =>
  authenticatedRequest<Quote>("/quotes/with-items", { method: "POST", body: JSON.stringify({ customer_id: customerId, items }) })
export const createInvoice = (quoteId: number) =>
  authenticatedRequest<Invoice>("/invoices", { method: "POST", body: JSON.stringify({ quote_id: quoteId }) })
export const getPayments = () => authenticatedRequest<Payment[]>("/payments")
export const createPayment = (invoiceId: number, amount: number, paymentMethod: string) =>
  authenticatedRequest<Payment>("/payments", { method: "POST", body: JSON.stringify({ invoice_id: invoiceId, amount, payment_method: paymentMethod }) })
export const getCurrentUser = () => authenticatedRequest<CurrentUser>("/auth/me")
export async function updateCurrentUser(data: UserUpdateInput): Promise<UserUpdateResponse> {
  const response = await authenticatedRequest<CurrentUser | UserUpdateResponse>("/auth/me", {
    method: "PUT",
    body: JSON.stringify(data),
  })
  if ("user" in response) return response
  return {
    user: response,
    message: response.pending_email
      ? `Un lien de confirmation a été envoyé à ${response.pending_email}.`
      : "Informations personnelles enregistrées.",
    email_change_pending: Boolean(response.pending_email),
  }
}
export async function changePassword(currentPassword: string, newPassword: string) {
  const response = await authenticatedRequest<{ message: string }>("/auth/me/password", {
    method: "PUT",
    body: JSON.stringify({ current_password: currentPassword, new_password: newPassword }),
  })
  forgetSession()
  return response
}
export async function getSessions(): Promise<UserSession[]> {
  const response = await authenticatedRequest<UserSession[] | { items: UserSession[] }>("/auth/sessions")
  return Array.isArray(response) ? response : response.items
}
export const revokeSession = (sessionId: string) =>
  authenticatedRequest<{ message: string }>(`/auth/sessions/${sessionId}`, { method: "DELETE" })
export async function getSecurityEvents(): Promise<SecurityEvent[]> {
  const response = await authenticatedRequest<SecurityEvent[] | { items: SecurityEvent[] }>("/auth/security-events?limit=50")
  return Array.isArray(response) ? response : response.items
}
export const logoutEverywhere = logoutAllSessions
export const getCompany = () => authenticatedRequest<Company>("/companies/me")
export const createCompany = (data: Pick<Company, "name" | "email" | "phone" | "website">) =>
  authenticatedRequest<Company>("/companies", { method: "POST", body: JSON.stringify(data) })
export const updateCompany = (data: Pick<Company, "name" | "email" | "phone" | "website">) =>
  authenticatedRequest<Company>("/companies/me", { method: "PUT", body: JSON.stringify(data) })

export interface ProspectListFilters {
  search?: string
  status?: ProspectStatus | ""
  priority?: ProspectPriority | ""
  page?: number
  size?: number
}

export function getProspects({
  search = "",
  status = "",
  priority = "",
  page = 1,
  size = 10,
}: ProspectListFilters = {}) {
  const params = new URLSearchParams({ page: String(page), size: String(size) })

  if (search.trim()) params.set("search", search.trim())
  if (status) params.set("status", status)
  if (priority) params.set("priority", priority)

  return authenticatedRequest<ProspectListResponse>(`/prospects?${params.toString()}`)
}

export const createProspect = (data: ProspectInput) =>
  authenticatedRequest<Prospect>("/prospects", {
    method: "POST",
    body: JSON.stringify(data),
  })

export const updateProspect = (prospectId: number, data: ProspectInput) =>
  authenticatedRequest<Prospect>(`/prospects/${prospectId}`, {
    method: "PUT",
    body: JSON.stringify(data),
  })

export const deleteProspect = (prospectId: number) =>
  authenticatedRequest<{ message: string }>(`/prospects/${prospectId}`, {
    method: "DELETE",
  })

export const convertProspect = (prospectId: number) =>
  authenticatedRequest<ProspectConversionResponse>(`/prospects/${prospectId}/convert`, {
    method: "POST",
  })
