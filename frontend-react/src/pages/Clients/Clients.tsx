import { useEffect, useState } from "react"
import {
  getCustomers,
  type Customer,
} from "../../Services/api"
import ClientTable from "./ClientTable"

function Clients() {

  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {

    async function loadCustomers() {

      try {
        setLoading(true)
        setError(null)

        const data = await getCustomers()

        setCustomers(data)

      } catch (error) {

        console.error(
          "Erreur récupération clients :",
          error
        )

        setError(
          "Impossible de récupérer les clients."
        )

      } finally {

        setLoading(false)

      }
    }

    loadCustomers()

  }, [])

  return (
    <div className="w-full">

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
          text-[#0F172A]
        "
      >
        Clients
      </h1>

      <p
        className="
          mt-[9px]
          text-[13px]
          text-[#64748B]
        "
      >
        Gérez vos clients et leurs informations.
      </p>

      <div className="mt-[24px]">

        {loading && (
          <div className="rounded-[8px] border border-[#E2E8F0] bg-white p-[20px] text-[10px] text-[#64748B]">
            Chargement des clients...
          </div>
        )}

        {!loading && error && (
          <div className="rounded-[8px] border border-red-200 bg-red-50 p-[20px] text-[10px] text-red-600">
            {error}
          </div>
        )}

        {!loading && !error && (
          <ClientTable customers={customers} />
        )}

      </div>

    </div>
  )
}

export default Clients