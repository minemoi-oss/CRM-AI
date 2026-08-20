import { useEffect, useState } from "react"

import {
  getCustomer,
  getCustomers,
  type Customer,
} from "../../Services/api"
import type { CopilotActiveEntity } from "../../Services/ai"

import ClientTable from "./ClientTable"
import CreateClient from "./CreateClient"
import ClientDetails from "./ClientDetails"
import EditClient from "./EditClient"


interface ClientsProps {
  focusCustomerId?: number
  focusQuery?: string
  onFocusConsumed?: () => void
  onActiveEntityChange?: (entity: CopilotActiveEntity | null) => void
}

function Clients({ focusCustomerId, focusQuery, onFocusConsumed, onActiveEntityChange }: ClientsProps = {}) {

  const [customers, setCustomers] =
    useState<Customer[]>([])

  const [loading, setLoading] =
    useState(true)

  const [error, setError] =
    useState<string | null>(null)

  const [search, setSearch] =
    useState("")

  const [page, setPage] =
    useState(1)

  const [total, setTotal] =
    useState(0)

  const [totalPages, setTotalPages] =
    useState(0)

  const [showCreateClient, setShowCreateClient] =
    useState(false)

  const [selectedCustomer, setSelectedCustomer] =
    useState<Customer | null>(null)

  const [editingCustomer, setEditingCustomer] =
    useState<Customer | null>(null)


  // ==========================================
  // CHARGER CLIENTS
  // ==========================================

  async function loadCustomers(
    searchValue = "",
    pageNumber = 1
  ) {

    try {

      setLoading(true)
      setError(null)

      const data =
        await getCustomers(
          searchValue,
          pageNumber,
          10
        )

      setCustomers(data.items)
      setTotal(data.total)
      setTotalPages(data.pages)
      setPage(data.page)

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


  useEffect(() => {

    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadCustomers()

  }, [])

  useEffect(() => {
    if (!focusCustomerId) return
    let active = true
    getCustomer(focusCustomerId)
      .then((customer) => {
        if (!active) return
        setSelectedCustomer(customer)
        onActiveEntityChange?.({
          type: "customer",
          id: customer.id,
          label: `${customer.first_name} ${customer.last_name}`.trim(),
        })
        onFocusConsumed?.()
      })
      .catch((reason: unknown) => {
        if (!active) return
        setError(reason instanceof Error ? reason.message : "Impossible d'ouvrir cette fiche client.")
        onActiveEntityChange?.(null)
        onFocusConsumed?.()
      })
    return () => {
      active = false
    }
  }, [focusCustomerId, onActiveEntityChange, onFocusConsumed])

  useEffect(() => {
    if (!focusQuery?.trim()) return
    const query = focusQuery.trim()
    Promise.resolve().then(() => {
      setSearch(query)
      void loadCustomers(query, 1)
      onFocusConsumed?.()
    })
  }, [focusQuery, onFocusConsumed])

  function openCustomerDetails(customer: Customer) {
    setSelectedCustomer(customer)
    onActiveEntityChange?.({
      type: "customer",
      id: customer.id,
      label: `${customer.first_name} ${customer.last_name}`.trim(),
    })
  }

  function closeCustomerDetails() {
    setSelectedCustomer(null)
    onActiveEntityChange?.(null)
  }

  function openCustomerEditor(customer: Customer) {
    setEditingCustomer(customer)
    onActiveEntityChange?.({
      type: "customer",
      id: customer.id,
      label: `${customer.first_name} ${customer.last_name}`.trim(),
    })
  }

  function closeCustomerEditor() {
    setEditingCustomer(null)
    onActiveEntityChange?.(null)
  }


  return (

    <div className="w-full">

      {/* =================================
          HEADER
      ================================= */}

      <div
        className="
          flex
          items-start
          justify-between
        "
      >

        <div>

          <p
            className="
              text-[13px]
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
              text-[28px]
              font-bold
              text-[#0F172A]
            "
          >
            Clients
          </h1>


          <p
            className="
              mt-[9px]
              text-[14px]
              text-[#64748B]
            "
          >
            Gérez vos clients et leurs informations.
          </p>

        </div>


        {/* NOUVEAU CLIENT */}

        <button
          type="button"
          onClick={() =>
            setShowCreateClient(true)
          }
          className="
            mt-[8px]
            flex
            h-[40px]
            items-center
            gap-[7px]
            rounded-[6px]
            bg-[#2563EB]
            px-[16px]
            text-[13px]
            font-medium
            text-white
            shadow-sm
            transition
            hover:bg-[#1D4ED8]
            active:scale-[0.98]
          "
        >
          <span className="text-[17px]">
            +
          </span>

          Nouveau client

        </button>

      </div>


      {/* =================================
          RECHERCHE
      ================================= */}

      <div
        className="
          mt-[24px]
          flex
          items-center
          gap-[8px]
        "
      >

        <input
          type="text"
          value={search}
          onChange={(event) =>
            setSearch(event.target.value)
          }
          placeholder="Rechercher un client..."
          className="
            h-[40px]
            w-[300px]
            rounded-[6px]
            border
            border-[#CBD5E1]
            bg-white
            px-[12px]
            text-[14px]
            text-[#0F172A]
            outline-none
            focus:border-[#2563EB]
          "
        />


        <button
          type="button"
          onClick={() => {

            setPage(1)

            loadCustomers(
              search,
              1
            )

          }}
          className="
            h-[40px]
            rounded-[6px]
            bg-[#2563EB]
            px-[16px]
            text-[14px]
            font-medium
            text-white
            hover:bg-[#1D4ED8]
          "
        >
          Rechercher
        </button>


        {search && (

          <button
            type="button"
            onClick={() => {

              setSearch("")
              setPage(1)

              loadCustomers(
                "",
                1
              )

            }}
            className="
              h-[40px]
              rounded-[6px]
              border
              border-[#CBD5E1]
              bg-white
              px-[14px]
              text-[14px]
              font-medium
              text-[#475569]
              hover:bg-[#F8FAFC]
            "
          >
            Réinitialiser
          </button>

        )}

      </div>


      {/* =================================
          TABLE
      ================================= */}

      <div className="mt-[16px]">

        {loading && (

          <div
            className="
              rounded-[8px]
              border
              border-[#E2E8F0]
              bg-white
              p-[20px]
              text-[14px]
              text-[#64748B]
            "
          >
            Chargement des clients...
          </div>

        )}


        {!loading && error && (

          <div
            className="
              rounded-[8px]
              border
              border-red-200
              bg-red-50
              p-[20px]
              text-[14px]
              text-red-600
            "
          >
            {error}
          </div>

        )}


        {!loading && !error && (

          <ClientTable
            customers={customers}
            onView={openCustomerDetails}
            onEdit={openCustomerEditor}
            onDeleted={() =>
              loadCustomers(
                search,
                page
              )
            }
          />

        )}


        {/* =================================
            PAGINATION
        ================================= */}

        {!loading &&
          !error &&
          totalPages > 0 && (

            <div
              className="
                mt-[20px]
                flex
                items-center
                justify-between
              "
            >

              <p
                className="
                  text-[14px]
                  text-[#64748B]
                "
              >
                {total} client
                {total > 1 ? "s" : ""}
              </p>


              <div
                className="
                  flex
                  items-center
                  gap-[8px]
                "
              >

                <button
                  type="button"
                  disabled={page === 1}
                  onClick={() =>
                    loadCustomers(
                      search,
                      page - 1
                    )
                  }
                  className="
                    rounded-[6px]
                    border
                    border-[#CBD5E1]
                    bg-white
                    px-[14px]
                    py-[8px]
                    text-[14px]
                    font-medium
                    text-[#475569]
                    hover:bg-[#F8FAFC]
                    disabled:cursor-not-allowed
                    disabled:opacity-40
                  "
                >
                  Précédent
                </button>


                <span
                  className="
                    px-[8px]
                    text-[14px]
                    text-[#475569]
                  "
                >
                  Page {page} / {totalPages}
                </span>


                <button
                  type="button"
                  disabled={
                    page === totalPages
                  }
                  onClick={() =>
                    loadCustomers(
                      search,
                      page + 1
                    )
                  }
                  className="
                    rounded-[6px]
                    border
                    border-[#CBD5E1]
                    bg-white
                    px-[14px]
                    py-[8px]
                    text-[14px]
                    font-medium
                    text-[#475569]
                    hover:bg-[#F8FAFC]
                    disabled:cursor-not-allowed
                    disabled:opacity-40
                  "
                >
                  Suivant
                </button>

              </div>

            </div>

          )}

      </div>


      {/* =================================
          CREATION
      ================================= */}

      {showCreateClient && (

        <CreateClient

          onClose={() =>
            setShowCreateClient(false)
          }

          onCreated={() => {

            loadCustomers(
              search,
              page
            )

          }}

        />

      )}


      {/* =================================
          DETAIL
      ================================= */}

      {selectedCustomer && (

        <ClientDetails

          customer={selectedCustomer}

          onClose={closeCustomerDetails}

        />

      )}


      {/* =================================
          MODIFICATION
      ================================= */}

      {editingCustomer && (

        <EditClient

          customer={editingCustomer}

          onClose={closeCustomerEditor}

          onUpdated={() => {

            setEditingCustomer(null)
            onActiveEntityChange?.(null)

            loadCustomers(
              search,
              page
            )

          }}

        />

      )}

    </div>

  )
}


export default Clients
