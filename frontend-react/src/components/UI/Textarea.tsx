interface TextareaProps {
  label?: string
  errorMessage?: string
  successMessage?: string
  disabled?: boolean
  className?: string
  [key: string]: any
}

function Textarea({
  label,
  errorMessage,
  successMessage,
  disabled = false,
  className = "",
  ...props
}: TextareaProps) {

  const borderStyle = errorMessage
    ? "border-red-500 focus:ring-red-100"
    : successMessage
      ? "border-green-500 focus:ring-green-100"
      : "border-slate-300 focus:border-blue-500 focus:ring-blue-100"

  return (
    <div className="w-full">

      {label && (
        <label className="mb-2 block text-sm font-medium text-slate-700">
          {label}
        </label>
      )}

      <textarea
        {...props}
        disabled={disabled}
        className={`
          min-h-24
          w-full
          resize-y
          rounded-md
          border
          bg-white
          px-3
          py-2
          text-sm
          outline-none
          focus:ring-2
          disabled:cursor-not-allowed
          disabled:bg-slate-100
          disabled:text-slate-400
          ${borderStyle}
          ${className}
        `}
      />

      {errorMessage && (
        <p className="mt-1 text-xs text-red-500">
          {errorMessage}
        </p>
      )}

      {successMessage && (
        <p className="mt-1 text-xs text-green-500">
          {successMessage}
        </p>
      )}

    </div>
  )
}

export default Textarea