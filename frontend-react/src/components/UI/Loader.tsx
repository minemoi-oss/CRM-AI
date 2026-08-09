interface LoaderProps {
  size?: "sm" | "md" | "lg"
}

function Loader({
  size = "md",
}: LoaderProps) {

  const sizes = {
    sm: "h-4 w-4",
    md: "h-6 w-6",
    lg: "h-10 w-10",
  }

  return (
    <span
      className={`
        inline-block
        animate-spin
        rounded-full
        border-2
        border-slate-300
        border-t-blue-600
        ${sizes[size]}
      `}
      aria-label="Chargement"
    />
  )
}

export default Loader