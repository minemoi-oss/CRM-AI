import { useEffect, useState } from "react"
import {
  getSecurityEvents,
  getSessions,
  logoutEverywhere,
  revokeSession,
  type SecurityEvent,
  type UserSession,
} from "../../Services/api"
import { forgetSession } from "../../Services/auth"

function deviceName(userAgent: string | null) {
  if (!userAgent) return "Appareil inconnu"
  const browser = userAgent.includes("Edg/") ? "Edge"
    : userAgent.includes("Chrome/") ? "Chrome"
      : userAgent.includes("Firefox/") ? "Firefox"
        : userAgent.includes("Safari/") ? "Safari"
          : "Navigateur"
  const system = userAgent.includes("Windows") ? "Windows"
    : userAgent.includes("Mac OS") ? "macOS"
      : userAgent.includes("Android") ? "Android"
        : userAgent.includes("iPhone") || userAgent.includes("iPad") ? "iOS"
          : userAgent.includes("Linux") ? "Linux"
            : "système inconnu"
  return `${browser} · ${system}`
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value))
}

function eventLabel(eventType: string) {
  const labels: Record<string, string> = {
    login_success: "Connexion réussie",
    login_failed: "Échec de connexion",
    logout: "Déconnexion",
    logout_all: "Déconnexion de tous les appareils",
    password_changed: "Mot de passe modifié",
    password_reset_requested: "Réinitialisation demandée",
    password_reset: "Mot de passe réinitialisé",
    email_verification_requested: "Vérification d’email demandée",
    email_verified: "Adresse email vérifiée",
    email_change_requested: "Changement d’email demandé",
    session_revoked: "Session révoquée",
    refresh_token_reuse: "Alerte de sécurité détectée",
  }
  return labels[eventType] ?? eventType.replaceAll("_", " ")
}

function SecurityCenter() {
  const [sessions, setSessions] = useState<UserSession[]>([])
  const [events, setEvents] = useState<SecurityEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busySession, setBusySession] = useState<string | null>(null)
  const [confirmLogoutAll, setConfirmLogoutAll] = useState(false)
  const [logoutAllLoading, setLogoutAllLoading] = useState(false)

  useEffect(() => {
    let active = true
    Promise.allSettled([getSessions(), getSecurityEvents()]).then(([sessionsResult, eventsResult]) => {
      if (!active) return
      if (sessionsResult.status === "fulfilled") setSessions(sessionsResult.value)
      if (eventsResult.status === "fulfilled") setEvents(eventsResult.value)
      if (sessionsResult.status === "rejected" || eventsResult.status === "rejected") {
        setError("Certaines informations de sécurité n’ont pas pu être chargées.")
      }
      setLoading(false)
    })
    return () => { active = false }
  }, [])

  async function removeSession(session: UserSession) {
    setBusySession(session.id)
    setError(null)
    try {
      await revokeSession(session.id)
      if (session.current || session.is_current) {
        forgetSession()
        return
      }
      setSessions((current) => current.filter((item) => item.id !== session.id))
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Impossible de révoquer cette session.")
    } finally {
      setBusySession(null)
    }
  }

  async function disconnectEverywhere() {
    if (!confirmLogoutAll) {
      setConfirmLogoutAll(true)
      return
    }
    setLogoutAllLoading(true)
    setError(null)
    try {
      await logoutEverywhere()
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Déconnexion impossible.")
      setLogoutAllLoading(false)
      setConfirmLogoutAll(false)
    }
  }

  return (
    <div className="mt-[20px] border-t border-[#E2E8F0] pt-[18px]">
      <div className="flex flex-wrap items-start justify-between gap-[12px]">
        <div>
          <h3 className="text-[10px] font-semibold text-[#1E293B]">Sessions et appareils</h3>
          <p className="mt-[4px] text-[8px] text-[#64748B]">Contrôlez les appareils connectés à votre compte.</p>
        </div>
        <button type="button" disabled={logoutAllLoading} onClick={() => void disconnectEverywhere()} onBlur={() => setConfirmLogoutAll(false)} className={`h-[30px] rounded-[6px] border px-[12px] text-[8px] font-semibold transition disabled:opacity-50 ${confirmLogoutAll ? "border-red-300 bg-red-50 text-red-700" : "border-[#CBD5E1] bg-white text-[#475569] hover:bg-[#F8FAFC]"}`}>
          {logoutAllLoading ? "Déconnexion..." : confirmLogoutAll ? "Confirmer la déconnexion" : "Déconnecter tous les appareils"}
        </button>
      </div>

      {error && <div role="alert" className="mt-[12px] rounded-[6px] border border-amber-200 bg-amber-50 px-[10px] py-[8px] text-[8px] text-amber-700">{error}</div>}

      <div className="mt-[13px] space-y-[8px]">
        {loading && <div className="rounded-[7px] border border-[#E2E8F0] bg-[#F8FAFC] px-[12px] py-[11px] text-[8px] text-[#64748B]">Chargement des sessions...</div>}
        {!loading && sessions.length === 0 && <div className="rounded-[7px] border border-[#E2E8F0] bg-[#F8FAFC] px-[12px] py-[11px] text-[8px] text-[#64748B]">Aucune session active à afficher.</div>}
        {sessions.map((session) => {
          const isCurrent = Boolean(session.current || session.is_current)
          return (
            <div key={session.id} className="flex flex-wrap items-center gap-[10px] rounded-[7px] border border-[#E2E8F0] px-[12px] py-[10px]">
              <div className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-[7px] bg-[#EFF6FF] text-[11px] font-bold text-[#2563EB]">{deviceName(session.user_agent).slice(0, 1)}</div>
              <div className="min-w-[160px] flex-1">
                <div className="flex items-center gap-[7px]"><p className="text-[9px] font-semibold text-[#1E293B]">{deviceName(session.user_agent)}</p>{isCurrent && <span className="rounded-full bg-emerald-50 px-[7px] py-[2px] text-[7px] font-semibold text-emerald-700">Cet appareil</span>}</div>
                <p className="mt-[3px] text-[7px] text-[#64748B]">IP {session.ip_address ?? "inconnue"} · Dernière activité {formatDate(session.last_used_at)}</p>
              </div>
              <button type="button" disabled={busySession === session.id} onClick={() => void removeSession(session)} className="h-[27px] rounded-[5px] border border-[#CBD5E1] px-[10px] text-[8px] font-medium text-[#475569] hover:border-red-200 hover:bg-red-50 hover:text-red-700 disabled:opacity-50">{busySession === session.id ? "Révocation..." : isCurrent ? "Déconnecter" : "Révoquer"}</button>
            </div>
          )
        })}
      </div>

      <div className="mt-[20px] border-t border-[#E2E8F0] pt-[18px]">
        <h3 className="text-[10px] font-semibold text-[#1E293B]">Journal de sécurité</h3>
        <p className="mt-[4px] text-[8px] text-[#64748B]">Les activités sensibles récentes de votre compte.</p>
        <div className="mt-[12px] overflow-hidden rounded-[7px] border border-[#E2E8F0]">
          {events.length === 0 && <div className="px-[12px] py-[11px] text-[8px] text-[#64748B]">Aucune activité récente à afficher.</div>}
          {events.slice(0, 10).map((event, index) => (
            <div key={event.id} className={`flex items-center gap-[10px] px-[12px] py-[9px] ${index > 0 ? "border-t border-[#E2E8F0]" : ""}`}>
              <span className={`h-[7px] w-[7px] shrink-0 rounded-full ${event.success === false ? "bg-red-500" : "bg-[#2563EB]"}`} />
              <div className="min-w-0 flex-1"><p className="truncate text-[8px] font-medium capitalize text-[#334155]">{eventLabel(event.event_type)}</p><p className="mt-[2px] text-[7px] text-[#94A3B8]">{formatDate(event.created_at)} · IP {event.ip_address ?? "inconnue"}</p></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default SecurityCenter
