const configuredApiUrl = import.meta.env.VITE_API_URL?.trim()

export const API_URL = configuredApiUrl
  ? configuredApiUrl.replace(/\/$/, "")
  : `${window.location.protocol}//${window.location.hostname}:8000`

const CSRF_COOKIE_NAME = "mine_crm_csrf"
const REFRESH_LOCK_NAME = `mine-crm-ai:${new URL(API_URL, window.location.origin).origin}:refresh`
const AUTH_CHANNEL_NAME = "mine-crm-ai:auth-state"

export function getPublicAuthToken(kind: "reset" | "verify") {
  const params = new URLSearchParams(window.location.search)
  const explicitToken = params.get(`${kind}_token`)
  if (explicitToken) return explicitToken
  const legacyPathMatches = kind === "reset"
    ? window.location.pathname.includes("reset-password")
    : window.location.pathname.includes("verify-email")
  return legacyPathMatches ? params.get("token") : null
}

export function hasPublicAuthAction() {
  return Boolean(getPublicAuthToken("reset") || getPublicAuthToken("verify"))
}

export interface AuthUser {
  id: number
  username: string
  email: string
  is_active: boolean
  email_verified?: boolean
  pending_email?: string | null
}

export interface LoginData {
  email: string
  password: string
}

export interface RegisterData {
  username: string
  email: string
  password: string
}

export interface AuthTokenResponse {
  access_token: string
  token_type: string
  expires_in: number
  user?: AuthUser
}

export interface MessageResponse {
  message: string
  development_token?: string | null
}

export class ApiError extends Error {
  status: number
  retryAfter: number | null

  constructor(message: string, status: number, retryAfter: number | null = null) {
    super(message)
    this.name = "ApiError"
    this.status = status
    this.retryAfter = retryAfter
  }
}

let accessToken: string | null = null
let accessTokenExpiresAt = 0
let refreshPromise: Promise<AuthTokenResponse> | null = null
let bootstrapPromise: Promise<boolean> | null = null
const authListeners = new Set<(authenticated: boolean) => void>()
const authChannel = typeof BroadcastChannel === "undefined"
  ? null
  : new BroadcastChannel(AUTH_CHANNEL_NAME)

function notifyAuthState(authenticated: boolean) {
  authListeners.forEach((listener) => listener(authenticated))
}

function setAccessToken(token: string | null, expiresIn = 0, notify = false) {
  accessToken = token
  accessTokenExpiresAt = token && expiresIn > 0 ? Date.now() + expiresIn * 1000 : 0
  if (notify) notifyAuthState(Boolean(token))
}

function clearLocalSession(notify = true) {
  setAccessToken(null, 0, notify)
}

export function forgetSession() {
  clearLocalSession()
  authChannel?.postMessage({ type: "session-ended" })
}

authChannel?.addEventListener("message", (event: MessageEvent<unknown>) => {
  if (
    typeof event.data === "object"
    && event.data !== null
    && "type" in event.data
    && (event.data.type === "session-ended" || event.data.type === "session-started")
  ) {
    clearLocalSession()
  }
})

export function onAuthStateChange(listener: (authenticated: boolean) => void) {
  authListeners.add(listener)
  return () => {
    authListeners.delete(listener)
  }
}

function getCookie(name: string) {
  const prefix = `${encodeURIComponent(name)}=`
  const cookie = document.cookie
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(prefix))

  return cookie ? decodeURIComponent(cookie.slice(prefix.length)) : null
}

function csrfHeaders(): HeadersInit {
  const csrfToken = getCookie(CSRF_COOKIE_NAME)
  return csrfToken ? { "X-CSRF-Token": csrfToken } : {}
}

async function readError(response: Response, fallback: string): Promise<ApiError> {
  let message = fallback
  const contentType = response.headers.get("content-type") ?? ""

  if (contentType.includes("application/json")) {
    const body = await response.json().catch(() => null) as {
      detail?: string | { msg?: string }[]
      message?: string
    } | null

    if (typeof body?.detail === "string") message = body.detail
    else if (Array.isArray(body?.detail)) {
      message = body.detail.map((item) => item.msg ?? "Donnée invalide").join(" · ")
    } else if (typeof body?.message === "string") message = body.message
  } else {
    const text = await response.text().catch(() => "")
    if (text.trim()) message = text.trim()
  }

  const retryHeader = response.headers.get("retry-after")
  const retryAfter = retryHeader && Number.isFinite(Number(retryHeader))
    ? Number(retryHeader)
    : null

  if (response.status === 429 && retryAfter) {
    message = `${message} Réessayez dans ${retryAfter} seconde${retryAfter > 1 ? "s" : ""}.`
  }

  return new ApiError(message, response.status, retryAfter)
}

async function publicJsonRequest<T>(path: string, options: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  })

  if (!response.ok) throw await readError(response, `Erreur API ${response.status}`)
  if (response.status === 204) return undefined as T
  return response.json() as Promise<T>
}

export async function login(data: LoginData): Promise<AuthTokenResponse> {
  const response = await fetch(`${API_URL}/auth/login`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      username: data.email.trim().toLowerCase(),
      password: data.password,
    }),
  })

  if (!response.ok) throw await readError(response, "Email ou mot de passe incorrect.")

  const result = await response.json() as AuthTokenResponse
  setAccessToken(result.access_token, result.expires_in)
  authChannel?.postMessage({ type: "session-started" })
  return result
}

export async function register(data: RegisterData): Promise<MessageResponse & { user?: AuthUser }> {
  return publicJsonRequest("/auth/register", {
    method: "POST",
    body: JSON.stringify({
      ...data,
      username: data.username.trim(),
      email: data.email.trim().toLowerCase(),
    }),
  })
}

export async function requestPasswordReset(email: string): Promise<MessageResponse> {
  return publicJsonRequest("/auth/password/forgot", {
    method: "POST",
    body: JSON.stringify({ email: email.trim().toLowerCase() }),
  })
}

export async function resetPassword(token: string, newPassword: string): Promise<MessageResponse> {
  return publicJsonRequest("/auth/password/reset", {
    method: "POST",
    body: JSON.stringify({ token, new_password: newPassword }),
  })
}

export async function verifyEmail(token: string): Promise<MessageResponse> {
  return publicJsonRequest("/auth/email/verify", {
    method: "POST",
    body: JSON.stringify({ token }),
  })
}

export async function requestVerificationEmail(email: string): Promise<MessageResponse> {
  return publicJsonRequest("/auth/email/verification/request", {
    method: "POST",
    body: JSON.stringify({ email: email.trim().toLowerCase() }),
  })
}

export function refreshAccessToken(): Promise<AuthTokenResponse> {
  if (refreshPromise) return refreshPromise

  const performRefresh = async () => {
    const response = await fetch(`${API_URL}/auth/refresh`, {
      method: "POST",
      credentials: "include",
      headers: csrfHeaders(),
    })

    if (!response.ok) {
      setAccessToken(null)
      throw await readError(response, "Votre session a expiré.")
    }

    const result = await response.json() as AuthTokenResponse
    setAccessToken(result.access_token, result.expires_in)
    return result
  }

  const lockedRefresh = navigator.locks
    ? navigator.locks.request(REFRESH_LOCK_NAME, { mode: "exclusive" }, performRefresh)
    : performRefresh()

  refreshPromise = lockedRefresh.finally(() => {
    refreshPromise = null
  })

  return refreshPromise
}

export function bootstrapAuth(): Promise<boolean> {
  if (!bootstrapPromise) {
    bootstrapPromise = refreshAccessToken()
      .then(() => true)
      .catch(() => false)
  }
  return bootstrapPromise
}

export async function authenticatedRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  const accessTokenIsExpiring = accessTokenExpiresAt > 0 && accessTokenExpiresAt - Date.now() <= 15_000
  if (!accessToken || accessTokenIsExpiring) {
    try {
      await refreshAccessToken()
    } catch {
      forgetSession()
      throw new ApiError("Votre session a expiré. Reconnectez-vous.", 401)
    }
  }

  const send = (token: string) => fetch(`${API_URL}${path}`, {
    ...options,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
      Authorization: `Bearer ${token}`,
    },
  })

  const tokenUsed = accessToken as string
  let response = await send(tokenUsed)

  if (response.status === 401) {
    try {
      if (!accessToken || accessToken === tokenUsed) await refreshAccessToken()
      response = await send(accessToken as string)
    } catch {
      forgetSession()
      throw new ApiError("Votre session a expiré. Reconnectez-vous.", 401)
    }
  }

  if (response.status === 401) {
    forgetSession()
    throw new ApiError("Votre session a expiré. Reconnectez-vous.", 401)
  }

  if (!response.ok) throw await readError(response, `Erreur API ${response.status}`)
  if (response.status === 204) return undefined as T
  return response.json() as Promise<T>
}

export async function logout(): Promise<void> {
  let response: Response | null = null
  try {
    response = await fetch(`${API_URL}/auth/logout`, {
      method: "POST",
      credentials: "include",
      headers: csrfHeaders(),
    })
  } catch {
    // The bearer fallback below may still revoke the server-side session.
  }

  if (response?.ok) {
    forgetSession()
    return
  }

  if (accessToken) {
    try {
      const fallback = await fetch(`${API_URL}/auth/logout-current`, {
        method: "POST",
        credentials: "include",
        headers: { Authorization: `Bearer ${accessToken}` },
      })
      if (fallback.ok) {
        forgetSession()
        return
      }
    } catch {
      // Keep the local session so the UI cannot claim a successful logout.
    }
  }

  if (response) throw await readError(response, "Déconnexion impossible.")
  throw new ApiError("Déconnexion impossible. Vérifiez votre connexion puis réessayez.", 0)
}

export async function logoutAllSessions(): Promise<MessageResponse> {
  const response = await authenticatedRequest<MessageResponse>("/auth/logout-all", { method: "POST" })
  forgetSession()
  return response
}
