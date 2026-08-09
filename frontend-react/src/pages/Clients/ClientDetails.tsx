import type { Client } from "./ClientTable"

interface ClientDetailsProps {
  client: Client
  onBack?: () => void
}


// ======================================================
// ICONS
// ======================================================

function MailIcon() {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
    >
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="m4 7 8 6 8-6" />
    </svg>
  )
}


function PhoneIcon() {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
    >
      <path d="M6.5 3.5 9 3l2 5-2 1.5a14 14 0 0 0 5.5 5.5L16 13l5 2-.5 2.5a3 3 0 0 1-3.2 2.4C10 19.2 4.8 14 3.6 6.7A3 3 0 0 1 6.5 3.5Z" />
    </svg>
  )
}


function BuildingIcon() {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
    >
      <path d="M4 21V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v16" />
      <path d="M16 9h3a1 1 0 0 1 1 1v11" />
      <path d="M8 7h4" />
      <path d="M8 11h4" />
      <path d="M8 15h4" />
      <path d="M3 21h18" />
    </svg>
  )
}


function GlobeIcon() {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18" />
      <path d="M12 3a14 14 0 0 1 0 18" />
      <path d="M12 3a14 14 0 0 0 0 18" />
    </svg>
  )
}


function FileIcon() {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
    >
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" />
      <path d="M14 2v6h6" />
      <path d="M8 13h8" />
      <path d="M8 17h5" />
    </svg>
  )
}


function PaymentIcon() {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
    >
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="M3 10h18" />
      <path d="M7 15h3" />
    </svg>
  )
}


function MailActivityIcon() {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
    >
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="m4 7 8 6 8-6" />
    </svg>
  )
}


// ======================================================
// COMPONENT
// ======================================================

function ClientDetails({
  client,
}: ClientDetailsProps) {

  const initials = client.name
    .split(" ")
    .map((word) => word[0])
    .join("")
    .slice(0, 2)
    .toUpperCase()


  return (
    <div className="w-full">

      {/* ==================================================
          PAGE HEADER
      ================================================== */}

      <div className="mb-[20px]">

        <p
          className="
            text-[10px]
            font-semibold
            uppercase
            tracking-[0.18em]
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
          Client Details
        </h1>

        <p
          className="
            mt-[10px]
            text-[13px]
            text-[#64748B]
          "
        >
          Profil complet, historique, factures et notes internes.
        </p>

      </div>


      {/* ==================================================
          MAIN GRID
      ================================================== */}

      <div
        className="
          grid
          grid-cols-[322px_1fr]
          gap-[28px]
          items-start
        "
      >

        {/* ==================================================
            LEFT PROFILE CARD
        ================================================== */}

        <div
          className="
            rounded-[12px]
            border
            border-[#DCE5F0]
            bg-white
            px-[23px]
            py-[27px]
            shadow-[0_4px_14px_rgba(15,23,42,0.06)]
          "
        >

          {/* AVATAR */}

          <div className="flex justify-center">

            <div
              className="
                flex
                h-[96px]
                w-[96px]
                items-center
                justify-center
                rounded-full
                bg-[#2864EA]
                text-[30px]
                font-semibold
                text-white
              "
            >
              {initials}
            </div>

          </div>


          {/* NAME */}

          <div className="mt-[16px] text-center">

            <h2
              className="
                text-[17px]
                font-bold
                text-[#0F172A]
              "
            >
              {client.name}
            </h2>

            <p
              className="
                mt-[5px]
                text-[11px]
                text-[#64748B]
              "
            >
              {client.company}
            </p>

            <div className="mt-[11px] flex justify-center">

              <span
                className="
                  rounded-full
                  bg-[#DCFCE7]
                  px-[18px]
                  py-[4px]
                  text-[9px]
                  font-semibold
                  text-[#16A34A]
                "
              >
                {client.status}
              </span>

            </div>

          </div>


          {/* SEPARATOR */}

          <div className="my-[21px] border-t border-[#E2E8F0]" />


          {/* CONTACT INFORMATION */}

          <div className="space-y-[17px]">

            <div className="flex items-center gap-[10px]">

              <span className="text-[#64748B]">
                <MailIcon />
              </span>

              <span className="text-[10px] text-[#334155]">
                {client.email}
              </span>

            </div>


            <div className="flex items-center gap-[10px]">

              <span className="text-[#64748B]">
                <PhoneIcon />
              </span>

              <span className="text-[10px] text-[#334155]">
                {client.phone}
              </span>

            </div>


            <div className="flex items-center gap-[10px]">

              <span className="text-[#64748B]">
                <BuildingIcon />
              </span>

              <span className="text-[10px] text-[#334155]">
                {client.company} — Design
              </span>

            </div>


            <div className="flex items-center gap-[10px]">

              <span className="text-[#64748B]">
                <GlobeIcon />
              </span>

              <span className="text-[10px] text-[#334155]">
                {client.company.toLowerCase().replace(/\s/g, "")}.fr
              </span>

            </div>

          </div>


          {/* SEPARATOR */}

          <div className="my-[22px] border-t border-[#E2E8F0]" />


          {/* CLIENT SINCE */}

          <div>

            <p
              className="
                text-[8px]
                font-semibold
                uppercase
                text-[#94A3B8]
              "
            >
              CLIENT DEPUIS
            </p>

            <p
              className="
                mt-[8px]
                text-[10px]
                font-semibold
                text-[#334155]
              "
            >
              Mars 2024
            </p>

          </div>


          {/* TOTAL REVENUE */}

          <div className="mt-[19px]">

            <p
              className="
                text-[8px]
                font-semibold
                uppercase
                text-[#94A3B8]
              "
            >
              REVENU TOTAL
            </p>

            <p
              className="
                mt-[7px]
                text-[12px]
                font-semibold
                text-[#16C765]
              "
            >
              12 400 €
            </p>

          </div>

        </div>


        {/* ==================================================
            RIGHT CONTENT
        ================================================== */}

        <div>

          {/* ==================================================
              TABS
          ================================================== */}

          <div
            className="
              flex
              h-[51px]
              items-start
              justify-between
              border-b
              border-[#E2E8F0]
              px-[25px]
            "
          >

            {[
              "Profil",
              "Historique",
              "Factures",
              "Paiements",
              "Notes",
            ].map((tab, index) => (

              <button
                key={tab}
                type="button"
                className={`
                  relative
                  h-[51px]
                  px-[20px]
                  text-[10px]
                  font-medium
                  ${
                    index === 0
                      ? "text-[#2563EB]"
                      : "text-[#64748B]"
                  }
                `}
              >

                {tab}

                {index === 0 && (
                  <span
                    className="
                      absolute
                      bottom-[-1px]
                      left-0
                      right-0
                      h-[3px]
                      rounded-t-full
                      bg-[#2563EB]
                    "
                  />
                )}

              </button>

            ))}

          </div>


          {/* ==================================================
              INFORMATIONS
          ================================================== */}

          <div
            className="
              mt-[19px]
              rounded-[12px]
              border
              border-[#DCE5F0]
              bg-white
              px-[18px]
              py-[18px]
              shadow-[0_4px_14px_rgba(15,23,42,0.05)]
            "
          >

            <h3
              className="
                text-[13px]
                font-semibold
                text-[#1E293B]
              "
            >
              Informations
            </h3>


            <div className="mt-[17px] grid grid-cols-3 gap-x-[45px] gap-y-[16px]">

              <div>

                <p className="text-[8px] font-semibold uppercase text-[#94A3B8]">
                  Nom complet
                </p>

                <p className="mt-[7px] text-[10px] font-semibold text-[#1E293B]">
                  {client.name}
                </p>

              </div>


              <div>

                <p className="text-[8px] font-semibold uppercase text-[#94A3B8]">
                  Email
                </p>

                <p className="mt-[7px] text-[10px] font-semibold text-[#1E293B]">
                  {client.email}
                </p>

              </div>


              <div>

                <p className="text-[8px] font-semibold uppercase text-[#94A3B8]">
                  Téléphone
                </p>

                <p className="mt-[7px] text-[10px] font-semibold text-[#1E293B]">
                  {client.phone}
                </p>

              </div>


              <div>

                <p className="text-[8px] font-semibold uppercase text-[#94A3B8]">
                  Entreprise
                </p>

                <p className="mt-[7px] text-[10px] font-semibold text-[#1E293B]">
                  {client.company}
                </p>

              </div>


              <div>

                <p className="text-[8px] font-semibold uppercase text-[#94A3B8]">
                  Adresse
                </p>

                <p className="mt-[7px] text-[10px] font-semibold text-[#1E293B]">
                  14 rue des Lilas, Lyon
                </p>

              </div>


              <div>

                <p className="text-[8px] font-semibold uppercase text-[#94A3B8]">
                  Segment
                </p>

                <p className="mt-[7px] text-[10px] font-semibold text-[#1E293B]">
                  Grand compte
                </p>

              </div>

            </div>

          </div>


          {/* ==================================================
              HISTORY
          ================================================== */}

          <div
            className="
              mt-[18px]
              rounded-[12px]
              border
              border-[#DCE5F0]
              bg-white
              px-[18px]
              py-[18px]
              shadow-[0_4px_14px_rgba(15,23,42,0.05)]
            "
          >

            <h3
              className="
                text-[13px]
                font-semibold
                text-[#1E293B]
              "
            >
              Historique
            </h3>


            <div className="mt-[12px]">

              {/* ITEM */}

              <div className="flex items-center py-[8px]">

                <div
                  className="
                    flex
                    h-[29px]
                    w-[29px]
                    items-center
                    justify-center
                    rounded-full
                    bg-[#EFF6FF]
                    text-[#2563EB]
                  "
                >
                  <FileIcon />
                </div>

                <p className="ml-[11px] text-[10px] font-semibold text-[#1E293B]">
                  Facture #1042 émise
                </p>

                <p className="ml-auto mr-[40px] text-[10px] font-semibold text-[#1E293B]">
                  2 450,00 €
                </p>

                <p className="w-[58px] text-right text-[8px] text-[#94A3B8]">
                  28 juil. 2026
                </p>

              </div>


              {/* ITEM */}

              <div className="flex items-center py-[8px]">

                <div
                  className="
                    flex
                    h-[29px]
                    w-[29px]
                    items-center
                    justify-center
                    rounded-full
                    bg-[#EFF6FF]
                    text-[#2563EB]
                  "
                >
                  <PaymentIcon />
                </div>

                <p className="ml-[11px] text-[10px] font-semibold text-[#1E293B]">
                  Paiement reçu
                </p>

                <p className="ml-auto mr-[40px] text-[10px] font-semibold text-[#1E293B]">
                  1 200,00 €
                </p>

                <p className="w-[58px] text-right text-[8px] text-[#94A3B8]">
                  14 juil. 2026
                </p>

              </div>


              {/* ITEM */}

              <div className="flex items-center py-[8px]">

                <div
                  className="
                    flex
                    h-[29px]
                    w-[29px]
                    items-center
                    justify-center
                    rounded-full
                    bg-[#EFF6FF]
                    text-[#2563EB]
                  "
                >
                  <MailActivityIcon />
                </div>

                <p className="ml-[11px] text-[10px] font-semibold text-[#1E293B]">
                  Email de suivi envoyé
                </p>

                <p className="ml-auto w-[58px] text-right text-[8px] text-[#94A3B8]">
                  2 juil. 2026
                </p>

              </div>

            </div>

          </div>


          {/* ==================================================
              NOTES
          ================================================== */}

          <div
            className="
              mt-[18px]
              min-h-[115px]
              rounded-[12px]
              border
              border-[#DCE5F0]
              bg-white
              px-[18px]
              py-[18px]
              shadow-[0_4px_14px_rgba(15,23,42,0.05)]
            "
          >

            <h3
              className="
                text-[13px]
                font-semibold
                text-[#1E293B]
              "
            >
              Notes
            </h3>

            <p
              className="
                mt-[11px]
                text-[10px]
                italic
                leading-[18px]
                text-[#64748B]
              "
            >
              « Cliente très réactive, intéressée par une extension de
              contrat au T4. Prévoir un appel de suivi. »
            </p>

          </div>

        </div>

      </div>

    </div>
  )
}

export default ClientDetails