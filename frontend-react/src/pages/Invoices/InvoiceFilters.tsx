interface InvoiceFiltersProps {
  search: string
  setSearch: (value: string) => void
  status: string
  setStatus: (value: string) => void
}


function SearchIcon() {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-4-4" />
    </svg>
  )
}


function InvoiceFilters({
  search,
  setSearch,
  status,
  setStatus,
}: InvoiceFiltersProps) {

  return (
    <div className="flex items-center justify-between">

      <div className="flex items-center gap-[10px]">

        {/* SEARCH */}

        <div className="relative">

          <span
            className="
              absolute
              left-[11px]
              top-1/2
              -translate-y-1/2
              text-[#94A3B8]
            "
          >
            <SearchIcon />
          </span>

          <input
            type="text"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Rechercher une facture..."
            className="
              h-[36px]
              w-[260px]
              rounded-[6px]
              border
              border-[#CBD5E1]
              bg-white
              pl-[34px]
              pr-[10px]
              text-[9px]
              text-[#334155]
              outline-none
              transition
              placeholder:text-[#94A3B8]
              focus:border-[#2563EB]
              focus:ring-[3px]
              focus:ring-[#DBEAFE]
            "
          />

        </div>


        {/* STATUS */}

        <select
          value={status}
          onChange={(event) => setStatus(event.target.value)}
          className="
            h-[36px]
            rounded-[6px]
            border
            border-[#CBD5E1]
            bg-white
            px-[11px]
            text-[9px]
            text-[#475569]
            outline-none
            focus:border-[#2563EB]
          "
        >

          <option value="Toutes">
            Toutes
          </option>

          <option value="Payée">
            Payées
          </option>

          <option value="En attente">
            En attente
          </option>

          <option value="En retard">
            En retard
          </option>

        </select>

      </div>

    </div>
  )
}

export default InvoiceFilters