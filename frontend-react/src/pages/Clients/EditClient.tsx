import { useState } from "react"

import {
  updateCustomer,
  type Customer,
  type CustomerUpdate,
} from "../../Services/api"


interface EditClientProps {

  customer: Customer

  onClose: () => void

  onUpdated: () => void
}


function EditClient({
  customer,
  onClose,
  onUpdated,
}: EditClientProps) {


  const [firstName, setFirstName] =
    useState(customer.first_name)

  const [lastName, setLastName] =
    useState(customer.last_name)

  const [email, setEmail] =
    useState(customer.email)

  const [phone, setPhone] =
    useState(customer.phone)

  const [companyId, setCompanyId] =
    useState(
      customer.company_id !== null
        ? String(customer.company_id)
        : ""
    )


  const [loading, setLoading] =
    useState(false)

  const [error, setError] =
    useState<string | null>(null)


  async function handleSubmit(
    event: React.FormEvent
  ) {

    event.preventDefault()

    setLoading(true)
    setError(null)


    try {

      const data: CustomerUpdate = {

        first_name: firstName,

        last_name: lastName,

        email: email,

        phone: phone,

      }


      await updateCustomer(
        customer.id,
        data
      )


      onUpdated()

    } catch (error) {

      console.error(
        "Erreur modification client :",
        error
      )

      setError(
        error instanceof Error
          ? error.message
          : "Impossible de modifier le client."
      )

    } finally {

      setLoading(false)

    }

  }


  return (

    <div
      className="
        fixed
        inset-0
        z-50
        flex
        items-center
        justify-center
        bg-black/30
      "
    >

      <div
        className="
          w-[460px]
          rounded-[10px]
          bg-white
          p-[24px]
          shadow-xl
        "
      >

        {/* HEADER */}

        <div
          className="
            flex
            items-center
            justify-between
          "
        >

          <div>

            <h2
              className="
                text-[20px]
                font-semibold
                text-[#0F172A]
              "
            >
              Modifier le client
            </h2>

            <p
              className="
                mt-[5px]
                text-[13px]
                text-[#64748B]
              "
            >
              Modifiez les informations du client.
            </p>

          </div>


          <button
            type="button"
            onClick={onClose}
            className="
              text-[20px]
              text-[#64748B]
              hover:text-[#0F172A]
            "
          >
            ×
          </button>

        </div>


        {/* FORMULAIRE */}

        <form
          onSubmit={handleSubmit}
          className="
            mt-[24px]
            space-y-[15px]
          "
        >

          {/* PRENOM */}

          <div>

            <label
              className="
                mb-[6px]
                block
                text-[13px]
                font-medium
                text-[#334155]
              "
            >
              Prénom
            </label>

            <input
              value={firstName}
              onChange={(event) =>
                setFirstName(
                  event.target.value
                )
              }
              required
              minLength={2}
              maxLength={50}
              className="
                h-[40px]
                w-full
                rounded-[6px]
                border
                border-[#CBD5E1]
                px-[11px]
                text-[14px]
                outline-none
                focus:border-[#2563EB]
              "
            />

          </div>


          {/* NOM */}

          <div>

            <label
              className="
                mb-[6px]
                block
                text-[13px]
                font-medium
                text-[#334155]
              "
            >
              Nom
            </label>

            <input
              value={lastName}
              onChange={(event) =>
                setLastName(
                  event.target.value
                )
              }
              required
              minLength={2}
              maxLength={50}
              className="
                h-[40px]
                w-full
                rounded-[6px]
                border
                border-[#CBD5E1]
                px-[11px]
                text-[14px]
                outline-none
                focus:border-[#2563EB]
              "
            />

          </div>


          {/* EMAIL */}

          <div>

            <label
              className="
                mb-[6px]
                block
                text-[13px]
                font-medium
                text-[#334155]
              "
            >
              Email
            </label>

            <input
              type="email"
              value={email}
              onChange={(event) =>
                setEmail(
                  event.target.value
                )
              }
              required
              className="
                h-[40px]
                w-full
                rounded-[6px]
                border
                border-[#CBD5E1]
                px-[11px]
                text-[14px]
                outline-none
                focus:border-[#2563EB]
              "
            />

          </div>


          {/* TELEPHONE */}

          <div>

            <label
              className="
                mb-[6px]
                block
                text-[13px]
                font-medium
                text-[#334155]
              "
            >
              Téléphone
            </label>

            <input
              value={phone}
              onChange={(event) =>
                setPhone(
                  event.target.value
                )
              }
              required
              minLength={8}
              maxLength={20}
              className="
                h-[40px]
                w-full
                rounded-[6px]
                border
                border-[#CBD5E1]
                px-[11px]
                text-[14px]
                outline-none
                focus:border-[#2563EB]
              "
            />

          </div>


          {/* ENTREPRISE */}

          <div>

            <label
              className="
                mb-[6px]
                block
                text-[13px]
                font-medium
                text-[#334155]
              "
            >
              ID entreprise
            </label>

            <input
              type="number"
              value={companyId}
              onChange={(event) =>
                setCompanyId(
                  event.target.value
                )
              }
              className="
                h-[40px]
                w-full
                rounded-[6px]
                border
                border-[#CBD5E1]
                px-[11px]
                text-[14px]
                outline-none
                focus:border-[#2563EB]
              "
              placeholder="Optionnel"
            />

          </div>


          {/* ERREUR */}

          {error && (

            <div
              className="
                rounded-[6px]
                bg-red-50
                px-[11px]
                py-[10px]
                text-[13px]
                text-red-600
              "
            >
              {error}
            </div>

          )}


          {/* ACTIONS */}

          <div
            className="
              flex
              justify-end
              gap-[8px]
              pt-[8px]
            "
          >

            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="
                h-[40px]
                rounded-[6px]
                border
                border-[#CBD5E1]
                px-[16px]
                text-[13px]
                font-medium
                text-[#475569]
                hover:bg-[#F8FAFC]
                disabled:opacity-50
              "
            >
              Annuler
            </button>


            <button
              type="submit"
              disabled={loading}
              className="
                h-[40px]
                rounded-[6px]
                bg-[#2563EB]
                px-[18px]
                text-[13px]
                font-medium
                text-white
                hover:bg-[#1D4ED8]
                disabled:cursor-not-allowed
                disabled:opacity-50
              "
            >
              {loading
                ? "Enregistrement..."
                : "Enregistrer"}
            </button>

          </div>

        </form>

      </div>

    </div>

  )
}


export default EditClient
