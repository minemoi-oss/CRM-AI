interface SkeletonProps {
  className?: string
}

function Skeleton({
  className = "",
}: SkeletonProps) {
  return (
    <div
      className={`
        animate-pulse
        rounded-md
        bg-slate-200
        ${className}
      `}
    />
  )
}

export default Skeleton