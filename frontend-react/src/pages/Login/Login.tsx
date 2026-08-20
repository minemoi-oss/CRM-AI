import { useEffect, useRef, useState } from "react"
import {
  login,
  register,
  requestPasswordReset,
  requestVerificationEmail,
  resetPassword,
  verifyEmail,
  forgetSession,
  getPublicAuthToken,
} from "../../Services/auth"

interface LoginProps {
  onLogin: () => void
  onPublicActionComplete?: () => void
}

type AuthMode = "login" | "register" | "forgot" | "reset" | "verify" | "resend"

function initialMode(): AuthMode {
  if (getPublicAuthToken("reset")) return "reset"
  if (getPublicAuthToken("verify")) return "verify"
  return "login"
}

const titles: Record<AuthMode, string> = {
  login: "Connexion",
  register: "Créer un compte",
  forgot: "Mot de passe oublié",
  reset: "Nouveau mot de passe",
  verify: "Vérification de l’email",
  resend: "Renvoyer la vérification",
}

const descriptions: Record<AuthMode, string> = {
  login: "Heureux de vous revoir. Connectez-vous à votre compte.",
  register: "Démarrez votre espace professionnel sécurisé.",
  forgot: "Recevez un lien sécurisé pour choisir un nouveau mot de passe.",
  reset: "Choisissez un nouveau mot de passe pour votre compte.",
  verify: "Nous vérifions votre adresse email en toute sécurité.",
  resend: "Recevez un nouveau lien de vérification par email.",
}

function clearAuthQuery() {
  const url = new URL(window.location.href)
  url.searchParams.delete("reset_token")
  url.searchParams.delete("verify_token")
  url.searchParams.delete("token")
  window.history.replaceState({}, "", `/${url.search}${url.hash}`)
}

function Login({ onLogin, onPublicActionComplete }: LoginProps) {
  const [mode, setMode] = useState<AuthMode>(initialMode)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [username, setUsername] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [loading, setLoading] = useState(() => initialMode() === "verify")
  const [developmentAction, setDevelopmentAction] = useState<{
    kind: "reset" | "verify"
    token: string
  } | null>(null)
  const verificationStarted = useRef(false)

  useEffect(() => {
    if (mode !== "verify" || verificationStarted.current) return
    const token = getPublicAuthToken("verify")
    if (!token) return

    verificationStarted.current = true
    verifyEmail(token)
      .then((response) => {
        forgetSession()
        clearAuthQuery()
        setMode("login")
        setMessage(response.message || "Votre adresse email est maintenant vérifiée.")
      })
      .catch((reason) => {
        setError(reason instanceof Error ? reason.message : "Ce lien de vérification n’est plus valide.")
      })
      .finally(() => setLoading(false))
  }, [mode, onPublicActionComplete])

  function changeMode(nextMode: AuthMode) {
    setMode(nextMode)
    setError(null)
    setMessage(null)
    setPassword("")
    setConfirmPassword("")
    setDevelopmentAction(null)
  }

  function openDevelopmentAction() {
    if (!developmentAction) return
    const url = new URL(window.location.href)
    url.searchParams.delete("reset_token")
    url.searchParams.delete("verify_token")
    url.searchParams.set(`${developmentAction.kind}_token`, developmentAction.token)
    window.history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`)
    if (developmentAction.kind === "verify") {
      verificationStarted.current = false
      setLoading(true)
      setMode("verify")
    } else {
      setMode("reset")
    }
    setMessage(null)
    setError(null)
    setDevelopmentAction(null)
  }

  function validatePasswords() {
    if (password !== confirmPassword) {
      throw new Error("Les mots de passe ne correspondent pas.")
    }
    if (password.length < 8) {
      throw new Error("Le mot de passe doit contenir au moins 8 caractères.")
    }
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setLoading(true)
    setError(null)
    setMessage(null)

    try {
      if (mode === "register") {
        validatePasswords()
        const response = await register({ username, email, password })
        setPassword("")
        setConfirmPassword("")
        setMode("login")
        setMessage(response.message || "Compte créé. Consultez votre email pour le vérifier avant de vous connecter.")
        if (import.meta.env.DEV && response.development_token) {
          setDevelopmentAction({ kind: "verify", token: response.development_token })
        }
        return
      }

      if (mode === "forgot") {
        const response = await requestPasswordReset(email)
        setMessage(response.message || "Si ce compte existe, un lien de réinitialisation vient d’être envoyé.")
        if (import.meta.env.DEV && response.development_token) {
          setDevelopmentAction({ kind: "reset", token: response.development_token })
        }
        return
      }

      if (mode === "resend") {
        const response = await requestVerificationEmail(email)
        setMessage(response.message || "Si ce compte existe, un nouvel email de vérification vient d’être envoyé.")
        if (import.meta.env.DEV && response.development_token) {
          setDevelopmentAction({ kind: "verify", token: response.development_token })
        }
        return
      }

      if (mode === "reset") {
        validatePasswords()
        const token = getPublicAuthToken("reset")
        if (!token) throw new Error("Ce lien de réinitialisation est incomplet.")
        const response = await resetPassword(token, password)
        forgetSession()
        clearAuthQuery()
        setPassword("")
        setConfirmPassword("")
        setMode("login")
        setMessage(response.message || "Mot de passe modifié. Vous pouvez maintenant vous connecter.")
        return
      }

      await login({ email, password })
      onLogin()
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Une erreur est survenue. Réessayez.")
    } finally {
      setLoading(false)
    }
  }

  const asksEmail = mode === "login" || mode === "register" || mode === "forgot" || mode === "resend"
  const asksPassword = mode === "login" || mode === "register" || mode === "reset"
  const asksConfirmation = mode === "register" || mode === "reset"

  return (
    <div className="grid min-h-screen grid-cols-2 bg-[#F8FAFC] max-md:grid-cols-1">
      <section className="flex flex-col justify-between bg-[#0F172A] p-[48px] text-white max-md:hidden">
        <div><div className="flex h-[42px] w-[42px] items-center justify-center rounded-[12px] bg-[#2563EB] text-[16px] font-bold">M</div><p className="mt-[14px] text-[14px] font-semibold">Mine CRM AI</p></div>
        <div><h2 className="max-w-[520px] text-[40px] font-bold leading-[48px]">Gérez vos clients, simplifiez votre croissance.</h2><p className="mt-[16px] max-w-[500px] text-[14px] leading-[22px] text-[#94A3B8]">Clients, devis, factures, paiements et analyses réunis dans un espace professionnel et sécurisé.</p></div>
        <p className="text-[11px] text-[#64748B]">© 2026 Mine CRM AI</p>
      </section>

      <div className="flex items-center justify-center px-[24px] py-[40px]">
        <form onSubmit={handleSubmit} className="w-full max-w-[420px] rounded-[16px] border border-[#E2E8F0] bg-white p-[clamp(20px,4vw,28px)] shadow-sm">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#2563EB]">Mine CRM AI</p>
          <h1 className="mt-[8px] text-[clamp(23px,5vw,28px)] font-bold leading-tight text-[#0F172A]">{titles[mode]}</h1>
          <p className="mt-[8px] text-[13px] leading-[1.55] text-[#64748B]">{descriptions[mode]}</p>

          {mode === "register" && (
            <div className="mt-[24px]">
              <label className="text-[13px] font-medium text-[#334155]">Nom complet</label>
              <input autoFocus autoComplete="name" value={username} onChange={(event) => setUsername(event.target.value)} minLength={3} maxLength={100} required className="mt-[6px] h-[40px] w-full rounded-[6px] border border-[#CBD5E1] px-[12px] outline-none focus:border-[#2563EB]" />
            </div>
          )}

          {asksEmail && (
            <div className={mode === "register" ? "mt-[16px]" : "mt-[24px]"}>
              <label className="text-[13px] font-medium text-[#334155]">Email</label>
              <input autoFocus={mode !== "register"} type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} maxLength={254} required className="mt-[6px] h-[40px] w-full rounded-[6px] border border-[#CBD5E1] px-[12px] outline-none focus:border-[#2563EB]" />
            </div>
          )}

          {asksPassword && (
            <div className={mode === "reset" ? "mt-[24px]" : "mt-[16px]"}>
              <div className="flex items-center justify-between">
                <label className="text-[13px] font-medium text-[#334155]">{mode === "reset" ? "Nouveau mot de passe" : "Mot de passe"}</label>
                {mode === "login" && <button type="button" onClick={() => changeMode("forgot")} className="text-[11px] font-medium text-[#2563EB] hover:text-[#1D4ED8]">Mot de passe oublié ?</button>}
              </div>
              <input autoFocus={mode === "reset"} type="password" autoComplete={mode === "login" ? "current-password" : "new-password"} value={password} onChange={(event) => setPassword(event.target.value)} minLength={mode === "login" ? undefined : 8} maxLength={128} required className="mt-[6px] h-[40px] w-full rounded-[6px] border border-[#CBD5E1] px-[12px] outline-none focus:border-[#2563EB]" />
              {mode !== "login" && <p className="mt-[5px] text-[10px] text-[#94A3B8]">8 caractères minimum, 128 maximum.</p>}
            </div>
          )}

          {asksConfirmation && (
            <div className="mt-[16px]">
              <label className="text-[13px] font-medium text-[#334155]">Confirmer le mot de passe</label>
              <input type="password" autoComplete="new-password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} minLength={8} maxLength={128} required className="mt-[6px] h-[40px] w-full rounded-[6px] border border-[#CBD5E1] px-[12px] outline-none focus:border-[#2563EB]" />
            </div>
          )}

          {message && <div role="status" className="mt-[16px] rounded-[7px] border border-emerald-200 bg-emerald-50 px-[12px] py-[10px] text-[12px] leading-[18px] text-emerald-700">{message}</div>}
          {developmentAction && import.meta.env.DEV && (
            <button type="button" onClick={openDevelopmentAction} className="mt-[10px] w-full rounded-[6px] border border-dashed border-[#93C5FD] bg-[#EFF6FF] px-[12px] py-[9px] text-[11px] font-medium text-[#2563EB] hover:bg-[#DBEAFE]">
              {developmentAction.kind === "verify" ? "Mode local · vérifier maintenant" : "Mode local · ouvrir la réinitialisation"}
            </button>
          )}
          {error && <div role="alert" className="mt-[16px] rounded-[7px] border border-red-200 bg-red-50 px-[12px] py-[10px] text-[12px] leading-[18px] text-red-700">{error}</div>}

          {mode !== "verify" && (
            <button type="submit" disabled={loading} className="mt-[22px] h-[40px] w-full rounded-[6px] bg-[#2563EB] text-[14px] font-medium text-white hover:bg-[#1D4ED8] disabled:opacity-50">
              {loading ? "Chargement..." : mode === "register" ? "Créer mon compte" : mode === "forgot" ? "Envoyer le lien" : mode === "resend" ? "Renvoyer l’email" : mode === "reset" ? "Enregistrer le mot de passe" : "Se connecter"}
            </button>
          )}

          {mode === "verify" && <div className="mt-[22px] text-center text-[12px] text-[#64748B]">{loading ? "Vérification en cours..." : "Vous pouvez poursuivre vers la connexion."}</div>}

          {mode === "login" ? (
            <div className="mt-[16px] space-y-[10px] text-center">
              <button type="button" onClick={() => changeMode("register")} className="block w-full text-[12px] font-medium text-[#2563EB] hover:text-[#1D4ED8]">Pas encore de compte ? Créer un compte</button>
              <button type="button" onClick={() => changeMode("resend")} className="block w-full text-[11px] text-[#64748B] hover:text-[#2563EB]">Renvoyer l’email de vérification</button>
            </div>
          ) : (
            <button type="button" onClick={() => { clearAuthQuery(); changeMode("login"); onPublicActionComplete?.() }} className="mt-[16px] w-full text-[12px] font-medium text-[#2563EB] hover:text-[#1D4ED8]">Retour à la connexion</button>
          )}
        </form>
      </div>
    </div>
  )
}

export default Login
