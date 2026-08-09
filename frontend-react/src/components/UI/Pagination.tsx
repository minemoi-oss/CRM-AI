interface PaginationProps {
  currentPage: number
  totalPages: number
  onPageChange: (page: number) => void
}

function Pagination({
  currentPage,
  totalPages,
  onPageChange,
}: PaginationProps) {
  if (totalPages <= 1) {
    return null
  }

  return (
    <div className="flex items-center gap-2">

      <button
        type="button"
        disabled={currentPage === 1}
        onClick={() => onPageChange(currentPage - 1)}
        className="
          rounded-md
          border
          border-slate-300
          px-3
          py-2
          text-sm
          disabled:cursor-not-allowed
          disabled:opacity-40
          hover:bg-slate-50
        "
      >
        ←
      </button>

      {Array.from(
        { length: totalPages },
        (_, index) => index + 1
      ).map((page) => (
        <button
          key={page}
          type="button"
          onClick={() => onPageChange(page)}
          className={`
            h-9
            min-w-9
            rounded-md
            px-2
            text-sm
            ${
              currentPage === page
                ? "bg-blue-600 text-white"
                : "border border-slate-300 text-slate-700 hover:bg-slate-50"
            }
          `}
        >
          {page}
        </button>
      ))}

      <button
        type="button"
        disabled={currentPage === totalPages}
        onClick={() => onPageChange(currentPage + 1)}
        className="
          rounded-md
          border
          border-slate-300
          px-3
          py-2
          text-sm
          disabled:cursor-not-allowed
          disabled:opacity-40
          hover:bg-slate-50
        "
      >
        →
      </button>

    </div>
  )
}

export default Pagination