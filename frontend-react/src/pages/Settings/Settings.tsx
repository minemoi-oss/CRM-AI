import { useEffect, useState } from "react"
import { changePassword, getCompany, getCurrentUser, updateCompany, updateCurrentUser } from "../../Services/api"
import SecurityCenter from "./SecurityCenter"


function Settings() {

  const [notifications, setNotifications] = useState(() => localStorage.getItem("mine_crm_notifications") !== "false")

  const [timezone, setTimezone] = useState(() => localStorage.getItem("mine_crm_timezone") ?? "Africa/Casablanca")
  const [username, setUsername] = useState("")
  const [email, setEmail] = useState("")
  const [originalEmail, setOriginalEmail] = useState("")
  const [pendingEmail, setPendingEmail] = useState<string | null>(null)
  const [emailVerified, setEmailVerified] = useState<boolean | undefined>(undefined)
  const [emailCurrentPassword, setEmailCurrentPassword] = useState("")
  const [emailDevelopmentToken, setEmailDevelopmentToken] = useState<string | null>(null)
  const [companyName, setCompanyName] = useState("")
  const [companyPhone, setCompanyPhone] = useState("")
  const [companyWebsite, setCompanyWebsite] = useState("")
  const [companyEmail, setCompanyEmail] = useState("")
  const [message, setMessage] = useState<string | null>(null)
  const [showPasswordModal, setShowPasswordModal] = useState(false)
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [passwordLoading, setPasswordLoading] = useState(false)
  const [passwordError, setPasswordError] = useState<string | null>(null)

  useEffect(() => {
    Promise.all([getCurrentUser(), getCompany()]).then(([user, company]) => {
      setUsername(user.username)
      setEmail(user.email)
      setOriginalEmail(user.email)
      setPendingEmail(user.pending_email ?? null)
      setEmailVerified(user.email_verified)
      setCompanyName(company.name)
      setCompanyPhone(company.phone)
      setCompanyWebsite(company.website ?? "")
      setCompanyEmail(company.email)
    }).catch((reason) => setMessage(reason instanceof Error ? reason.message : "Chargement impossible"))
  }, [])

  async function saveUser() {
    try {
      const normalizedEmail = email.trim().toLowerCase()
      const emailChanged = normalizedEmail !== originalEmail.trim().toLowerCase()
      if (emailChanged && !emailCurrentPassword) {
        setMessage("Saisissez votre mot de passe actuel pour confirmer le changement d’email.")
        return
      }
      const response = await updateCurrentUser({
        username: username.trim(),
        email: normalizedEmail,
        ...(emailChanged ? { current_password: emailCurrentPassword } : {}),
      })
      setUsername(response.user.username)
      setEmail(response.user.email)
      setOriginalEmail(response.user.email)
      setPendingEmail(response.user.pending_email ?? (response.email_change_pending ? normalizedEmail : null))
      setEmailVerified(response.user.email_verified)
      setEmailCurrentPassword("")
      setEmailDevelopmentToken(
        import.meta.env.DEV ? response.development_token ?? null : null,
      )
      setMessage(response.message || "Informations personnelles enregistrées.")
    } catch (reason) {
      setMessage(reason instanceof Error ? reason.message : "Enregistrement impossible")
    }
  }

  async function saveCompany() {
    try {
      await updateCompany({ name: companyName, email: companyEmail, phone: companyPhone, website: companyWebsite || null })
      setMessage("Informations de l'entreprise enregistrées.")
    } catch (reason) {
      setMessage(reason instanceof Error ? reason.message : "Enregistrement impossible")
    }
  }

  function updateTimezone(value: string) {
    setTimezone(value)
    localStorage.setItem("mine_crm_timezone", value)
    setMessage("Fuseau horaire enregistré sur cet appareil.")
  }

  function toggleNotifications() {
    const nextValue = !notifications
    setNotifications(nextValue)
    localStorage.setItem("mine_crm_notifications", String(nextValue))
    setMessage(nextValue ? "Les rappels du Dashboard sont activés." : "Les rappels du Dashboard sont désactivés.")
  }

  async function submitPassword(event: React.FormEvent) {
    event.preventDefault()
    setPasswordError(null)
    if (newPassword !== confirmPassword) {
      setPasswordError("La confirmation ne correspond pas au nouveau mot de passe.")
      return
    }
    setPasswordLoading(true)
    try {
      const response = await changePassword(currentPassword, newPassword)
      setMessage(response.message)
      setCurrentPassword("")
      setNewPassword("")
      setConfirmPassword("")
      setShowPasswordModal(false)
    } catch (reason) {
      setPasswordError(reason instanceof Error ? reason.message : "Modification impossible")
    } finally {
      setPasswordLoading(false)
    }
  }


  return (
    <div className="w-full">

      {/* ==================================================
          HEADER
      ================================================== */}

      <div>

        <p
          className="
            text-[10px]
            font-semibold
            uppercase
            tracking-[0.20em]
            text-[#2563EB]
          "
        >
          PAGES
        </p>


        <h1
          className="
            mt-[8px]
            text-[30px]
            font-bold
            leading-none
            text-[#0F172A]
          "
        >
          Paramètres
        </h1>


        <p
          className="
            mt-[10px]
            text-[13px]
            text-[#64748B]
          "
        >
          Gérez les paramètres de votre compte et de votre entreprise.
        </p>

      </div>

      {message && (
        <div className="mt-[16px] rounded-[6px] border border-[#BFDBFE] bg-[#EFF6FF] px-[12px] py-[10px] text-[9px] text-[#2563EB]">
          {message}
        </div>
      )}


      {/* ==================================================
          COMPTE
      ================================================== */}

      <section
        className="
          mt-[24px]
          rounded-[10px]
          border
          border-[#DCE5F0]
          bg-white
          p-[20px]
          shadow-[0_3px_10px_rgba(15,23,42,0.04)]
        "
      >

        <div>

          <h2
            className="
              text-[12px]
              font-semibold
              text-[#0F172A]
            "
          >
            Informations personnelles
          </h2>

          <p
            className="
              mt-[5px]
              text-[9px]
              text-[#64748B]
            "
          >
            Modifiez les informations associées à votre compte.
          </p>

        </div>


        {/* FORM */}

        <div
          className="
            mt-[20px]
            grid
            responsive-grid
            grid-cols-2
            gap-[16px]
          "
        >

          {/* NOM */}

          <div>

            <label
              className="
                mb-[7px]
                block
                text-[9px]
                font-medium
                text-[#334155]
              "
            >
              Nom complet
            </label>

            <input
              type="text"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              className="
                h-[34px]
                w-full
                rounded-[6px]
                border
                border-[#CBD5E1]
                bg-white
                px-[10px]
                text-[9px]
                text-[#0F172A]
                outline-none
                focus:border-[#2563EB]
                focus:ring-1
                focus:ring-[#2563EB]
              "
            />

          </div>


          {/* EMAIL */}

          <div>

            <label
              className="
                mb-[7px]
                block
                text-[9px]
                font-medium
                text-[#334155]
              "
            >
              Adresse email
            </label>

            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              maxLength={254}
              className="
                h-[34px]
                w-full
                rounded-[6px]
                border
                border-[#CBD5E1]
                bg-white
                px-[10px]
                text-[9px]
                text-[#0F172A]
                outline-none
                focus:border-[#2563EB]
                focus:ring-1
                focus:ring-[#2563EB]
              "
            />

            {emailVerified !== undefined && (
              <p className={`mt-[5px] text-[8px] ${emailVerified ? "text-emerald-600" : "text-amber-600"}`}>
                {emailVerified ? "Adresse vérifiée" : "Adresse non vérifiée"}
              </p>
            )}

          </div>

        </div>

        {pendingEmail && (
          <div className="mt-[14px] rounded-[7px] border border-amber-200 bg-amber-50 px-[11px] py-[9px] text-[9px] text-amber-700">
            Changement en attente vers <span className="font-semibold">{pendingEmail}</span>. Validez le lien reçu par email pour terminer.
            {emailDevelopmentToken && import.meta.env.DEV && (
              <a href={`/?verify_token=${encodeURIComponent(emailDevelopmentToken)}`} className="ml-[8px] font-semibold text-[#2563EB] underline">
                Confirmer maintenant (mode local)
              </a>
            )}
          </div>
        )}

        {email.trim().toLowerCase() !== originalEmail.trim().toLowerCase() && (
          <div className="mt-[14px] max-w-[360px]">
            <label className="mb-[7px] block text-[9px] font-medium text-[#334155]">Mot de passe actuel</label>
            <input type="password" autoComplete="current-password" value={emailCurrentPassword} onChange={(event) => setEmailCurrentPassword(event.target.value)} maxLength={128} className="h-[34px] w-full rounded-[6px] border border-[#CBD5E1] bg-white px-[10px] text-[9px] text-[#0F172A] outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB]" />
            <p className="mt-[5px] text-[8px] text-[#64748B]">Requis pour protéger le changement d’adresse email.</p>
          </div>
        )}


        {/* BUTTON */}

        <div className="mt-[18px] flex justify-end">

          <button
            type="button"
            onClick={saveUser}
            className="
              h-[32px]
              rounded-[6px]
              bg-[#2563EB]
              px-[15px]
              text-[9px]
              font-semibold
              text-white
              transition
              hover:bg-[#1D4ED8]
            "
          >
            Enregistrer
          </button>

        </div>

      </section>


      {/* ==================================================
          ENTREPRISE
      ================================================== */}

      <section
        className="
          mt-[16px]
          rounded-[10px]
          border
          border-[#DCE5F0]
          bg-white
          p-[20px]
          shadow-[0_3px_10px_rgba(15,23,42,0.04)]
        "
      >

        <h2
          className="
            text-[12px]
            font-semibold
            text-[#0F172A]
          "
        >
          Entreprise
        </h2>

        <p
          className="
            mt-[5px]
            text-[9px]
            text-[#64748B]
          "
        >
          Informations utilisées pour vos clients et vos factures.
        </p>


        <div
          className="
            mt-[20px]
            grid
            responsive-grid
            grid-cols-2
            gap-[16px]
          "
        >

          {/* ENTREPRISE */}

          <div>

            <label
              className="
                mb-[7px]
                block
                text-[9px]
                font-medium
                text-[#334155]
              "
            >
              Nom de l'entreprise
            </label>

            <input
              type="text"
              value={companyName}
              onChange={(event) => setCompanyName(event.target.value)}
              className="
                h-[34px]
                w-full
                rounded-[6px]
                border
                border-[#CBD5E1]
                px-[10px]
                text-[9px]
                text-[#0F172A]
                outline-none
                focus:border-[#2563EB]
                focus:ring-1
                focus:ring-[#2563EB]
              "
            />

          </div>


          {/* TELEPHONE */}

          <div>

            <label
              className="
                mb-[7px]
                block
                text-[9px]
                font-medium
                text-[#334155]
              "
            >
              Téléphone
            </label>

            <input
              type="tel"
              value={companyPhone}
              onChange={(event) => setCompanyPhone(event.target.value)}
              className="
                h-[34px]
                w-full
                rounded-[6px]
                border
                border-[#CBD5E1]
                px-[10px]
                text-[9px]
                text-[#0F172A]
                outline-none
                focus:border-[#2563EB]
                focus:ring-1
                focus:ring-[#2563EB]
              "
            />

          </div>


          {/* ADRESSE */}

          <div>

            <label
              className="
                mb-[7px]
                block
                text-[9px]
                font-medium
                text-[#334155]
              "
            >
              Site web
            </label>

            <input
              type="text"
              value={companyWebsite}
              onChange={(event) => setCompanyWebsite(event.target.value)}
              className="
                h-[34px]
                w-full
                rounded-[6px]
                border
                border-[#CBD5E1]
                px-[10px]
                text-[9px]
                text-[#0F172A]
                outline-none
                focus:border-[#2563EB]
                focus:ring-1
                focus:ring-[#2563EB]
              "
            />

          </div>


          {/* EMAIL ENTREPRISE */}

          <div>

            <label
              className="
                mb-[7px]
                block
                text-[9px]
                font-medium
                text-[#334155]
              "
            >
              Email professionnel
            </label>

            <input
              type="email"
              value={companyEmail}
              onChange={(event) => setCompanyEmail(event.target.value)}
              className="
                h-[34px]
                w-full
                rounded-[6px]
                border
                border-[#CBD5E1]
                px-[10px]
                text-[9px]
                text-[#0F172A]
                outline-none
                focus:border-[#2563EB]
                focus:ring-1
                focus:ring-[#2563EB]
              "
            />

          </div>

        </div>


        <div className="mt-[18px] flex justify-end">

          <button
            type="button"
            onClick={saveCompany}
            className="
              h-[32px]
              rounded-[6px]
              bg-[#2563EB]
              px-[15px]
              text-[9px]
              font-semibold
              text-white
              hover:bg-[#1D4ED8]
            "
          >
            Enregistrer
          </button>

        </div>

      </section>


      {/* ==================================================
          PRÉFÉRENCES
      ================================================== */}

      <section
        className="
          mt-[16px]
          rounded-[10px]
          border
          border-[#DCE5F0]
          bg-white
          p-[20px]
          shadow-[0_3px_10px_rgba(15,23,42,0.04)]
        "
      >

        <h2
          className="
            text-[12px]
            font-semibold
            text-[#0F172A]
          "
        >
          Préférences
        </h2>

        <p
          className="
            mt-[5px]
            text-[9px]
            text-[#64748B]
          "
        >
          Configurez la langue et les notifications de votre application.
        </p>


        <div
          className="
            mt-[20px]
            grid
            responsive-grid
            grid-cols-2
            gap-[16px]
          "
        >

          {/* LANGUE */}

          <div>

            <label
              className="
                mb-[7px]
                block
                text-[9px]
                font-medium
                text-[#334155]
              "
            >
              Langue
            </label>

            <div className="flex h-[34px] w-full items-center rounded-[6px] border border-[#E2E8F0] bg-[#F8FAFC] px-[10px] text-[9px] text-[#0F172A]">
              Français <span className="ml-auto text-[8px] text-[#94A3B8]">Langue disponible</span>
            </div>

          </div>


          {/* TIMEZONE */}

          <div>

            <label
              className="
                mb-[7px]
                block
                text-[9px]
                font-medium
                text-[#334155]
              "
            >
              Fuseau horaire
            </label>

            <select
              value={timezone}
              onChange={(event) => updateTimezone(event.target.value)}
              className="
                h-[34px]
                w-full
                rounded-[6px]
                border
                border-[#CBD5E1]
                bg-white
                px-[10px]
                text-[9px]
                text-[#0F172A]
                outline-none
                focus:border-[#2563EB]
              "
            >

              <option value="Europe/Paris">
                Europe/Paris
              </option>

              <option value="Africa/Casablanca">
                Africa/Casablanca
              </option>

              <option value="UTC">
                UTC
              </option>

            </select>

          </div>

        </div>


        {/* NOTIFICATIONS */}

        <div
          className="
            mt-[20px]
            flex
            items-center
            justify-between
            border-t
            border-[#E2E8F0]
            pt-[17px]
          "
        >

          <div>

            <p className="text-[10px] font-semibold text-[#1E293B]">
              Notifications
            </p>

            <p className="mt-[4px] text-[8px] text-[#64748B]">
              Recevoir les notifications concernant les factures et les clients.
            </p>

          </div>


          <button
            type="button"
            onClick={toggleNotifications}
            className={`
              relative
              h-[20px]
              w-[36px]
              rounded-full
              transition
              ${
                notifications
                  ? "bg-[#2563EB]"
                  : "bg-[#CBD5E1]"
              }
            `}
          >

            <span
              className={`
                absolute
                top-[3px]
                h-[14px]
                w-[14px]
                rounded-full
                bg-white
                shadow-sm
                transition
                ${
                  notifications
                    ? "left-[19px]"
                    : "left-[3px]"
                }
              `}
            />

          </button>

        </div>

      </section>


      {/* ==================================================
          SÉCURITÉ
      ================================================== */}

      <section
        className="
          mt-[16px]
          rounded-[10px]
          border
          border-[#DCE5F0]
          bg-white
          p-[20px]
          shadow-[0_3px_10px_rgba(15,23,42,0.04)]
        "
      >

        <h2 className="text-[12px] font-semibold text-[#0F172A]">
          Sécurité
        </h2>

        <p className="mt-[5px] text-[9px] text-[#64748B]">
          Gérez la sécurité de votre compte.
        </p>


        <div className="mt-[18px]">

          <button
            type="button"
            onClick={() => { setPasswordError(null); setShowPasswordModal(true) }}
            className="
              h-[32px]
              rounded-[6px]
              border
              border-[#CBD5E1]
              bg-white
              px-[15px]
              text-[9px]
              font-semibold
              text-[#334155]
              hover:bg-[#F8FAFC]
            "
          >
            Modifier le mot de passe
          </button>

        </div>

        <SecurityCenter />

      </section>

      {showPasswordModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0F172A]/45 p-[20px]" role="dialog" aria-modal="true" aria-labelledby="password-title">
          <form onSubmit={submitPassword} className="w-full max-w-[440px] rounded-[12px] bg-white p-[24px] shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 id="password-title" className="text-[18px] font-bold text-[#0F172A]">Modifier le mot de passe</h2>
                <p className="mt-[5px] text-[11px] text-[#64748B]">Confirmez votre identité avant d’enregistrer le nouveau mot de passe.</p>
              </div>
              <button type="button" aria-label="Fermer" onClick={() => setShowPasswordModal(false)} className="text-[20px] leading-none text-[#64748B] hover:text-[#0F172A]">×</button>
            </div>

            <div className="mt-[22px] space-y-[14px]">
              <label className="block text-[10px] font-medium text-[#334155]">Mot de passe actuel<input autoFocus required maxLength={128} type="password" autoComplete="current-password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} className="mt-[6px] h-[40px] w-full rounded-[7px] border border-[#CBD5E1] px-[11px] text-[13px] outline-none focus:border-[#2563EB]" /></label>
              <label className="block text-[10px] font-medium text-[#334155]">Nouveau mot de passe<input required minLength={8} maxLength={128} type="password" autoComplete="new-password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} className="mt-[6px] h-[40px] w-full rounded-[7px] border border-[#CBD5E1] px-[11px] text-[13px] outline-none focus:border-[#2563EB]" /><span className="mt-[4px] block text-[8px] text-[#94A3B8]">8 caractères minimum, 128 maximum.</span></label>
              <label className="block text-[10px] font-medium text-[#334155]">Confirmer le nouveau mot de passe<input required minLength={8} maxLength={128} type="password" autoComplete="new-password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} className="mt-[6px] h-[40px] w-full rounded-[7px] border border-[#CBD5E1] px-[11px] text-[13px] outline-none focus:border-[#2563EB]" /></label>
            </div>

            {passwordError && <div className="mt-[14px] rounded-[7px] border border-red-200 bg-red-50 p-[10px] text-[10px] text-red-600">{passwordError}</div>}
            <div className="mt-[22px] flex justify-end gap-[8px]"><button type="button" onClick={() => setShowPasswordModal(false)} disabled={passwordLoading} className="h-[38px] rounded-[7px] border border-[#CBD5E1] px-[15px] text-[11px] font-medium text-[#475569] hover:bg-[#F8FAFC] disabled:opacity-50">Annuler</button><button type="submit" disabled={passwordLoading} className="h-[38px] rounded-[7px] bg-[#2563EB] px-[17px] text-[11px] font-semibold text-white hover:bg-[#1D4ED8] disabled:opacity-50">{passwordLoading ? "Modification..." : "Enregistrer"}</button></div>
          </form>
        </div>
      )}

    </div>
  )
}


export default Settings
