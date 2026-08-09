import { useState } from "react"


function Settings() {

  const [notifications, setNotifications] = useState(true)

  const [language, setLanguage] = useState("Français")

  const [timezone, setTimezone] = useState("Europe/Paris")


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
              defaultValue="Marie Dupuis"
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
              defaultValue="marie@novacrm.com"
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

        </div>


        {/* BUTTON */}

        <div className="mt-[18px] flex justify-end">

          <button
            type="button"
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
              defaultValue="Nova CRM"
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
              defaultValue="+33 6 12 34 56 78"
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
              Adresse
            </label>

            <input
              type="text"
              defaultValue="12 rue de Paris"
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
              defaultValue="contact@novacrm.com"
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

            <select
              value={language}
              onChange={(event) =>
                setLanguage(event.target.value)
              }
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

              <option>Français</option>
              <option>English</option>

            </select>

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
              onChange={(event) =>
                setTimezone(event.target.value)
              }
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
            onClick={() =>
              setNotifications(!notifications)
            }
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

      </section>

    </div>
  )
}


export default Settings