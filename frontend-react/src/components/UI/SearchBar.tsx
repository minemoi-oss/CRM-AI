import type { InputHTMLAttributes } from "react"

interface SearchBarProps
  extends InputHTMLAttributes<HTMLInputElement> {
  onSearch?: () => void
}

function SearchBar({
  onSearch,
  className = "",
  ...props
}: SearchBarProps) {
  return (
    <div className="relative">

      <input
        {...props}
        type="search"
        className={`
          h-10
          w-full
          rounded-md
          border
          border-slate-300
          bg-white
          px-10
          text-sm
          outline-none
          focus:border-blue-500
          focus:ring-2
          focus:ring-blue-100
          ${className}
        `}
      />

      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
        🔍
      </span>

      {onSearch && (
        <button
          type="button"
          onClick={onSearch}
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded px-2 py-1 text-sm text-slate-500 hover:bg-slate-100"
        >
          Rechercher
        </button>
      )}

    </div>
  )
}

export default SearchBar