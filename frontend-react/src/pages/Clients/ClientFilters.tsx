interface ClientFiltersProps {
  search: string
  setSearch: (value: string) => void
  status: string
  setStatus: (value: string) => void
}

function SearchIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-4-4" />
    </svg>
  )
}

function FilterIcon() {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <path d="M4 6h16" />
      <path d="M7 12h10" />
      <path d="M10 18h4" />
    </svg>
  )
}

function ClientFilters({
  search,
  setSearch,
  status,
  setStatus,
}: ClientFiltersProps) {
  return (
    <div className="flex items-center justify-between gap-[10px]">

      {/* SEARCH */}

      <div className="relative flex-1">

        <div className="absolute left-[11px] top-1/2 -translate-y-1/2 text-[#94A3B8]">
          <SearchIcon />
        </div>

        <input
          type="text"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Rechercher un client..."
          className="
            h-[34px]
            w-full
            rounded-[6px]
            border
            border-[#CBD5E1]
            bg-white
            pl-[32px]
            pr-[10px]
            text-[9px]
            text-[#334155]
            outline-none
            placeholder:text-[#94A3B8]
            focus:border-[#2563EB]
          "
        />

      </div>


      {/* STATUS */}

      <select
        value={status}
        onChange={(event) => setStatus(event.target.value)}
        className="
          h-[34px]
          w-[125px]
          rounded-[6px]
          border
          border-[#CBD5E1]
          bg-white
          px-[9px]
          text-[9px]
          text-[#64748B]
          outline-none
          focus:border-[#2563EB]
        "
      >
        <option value="Tous">
          Tous les statuts
        </option>

        <option value="Actif">
          Actif
        </option>

        <option value="Prospect">
          Prospect
        </option>

        <option value="Inactif">
          Inactif
        </option>
      </select>


      {/* FILTER */}

      <button
        type="button"
        className="
          flex
          h-[34px]
          items-center
          gap-[6px]
          rounded-[6px]
          border
          border-[#CBD5E1]
          bg-white
          px-[10px]
          text-[9px]
          font-medium
          text-[#64748B]
          hover:bg-[#F8FAFC]
        "
      >
        <FilterIcon />
        Filtres
      </button>

    </div>
  )
}

export default ClientFilters