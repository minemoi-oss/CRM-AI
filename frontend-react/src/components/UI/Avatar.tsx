interface AvatarProps {
  src?: string
  alt?: string
  name?: string
  size?: "sm" | "md" | "lg"
}

function Avatar({
  src,
  alt = "",
  name = "",
  size = "md",
}: AvatarProps) {

  const sizes = {
    sm: "h-8 w-8 text-xs",
    md: "h-10 w-10 text-sm",
    lg: "h-12 w-12 text-base",
  }

  const initials = name
    .split(" ")
    .map((word) => word[0])
    .join("")
    .slice(0, 2)
    .toUpperCase()

  return (
    <div
      className={`
        flex
        items-center
        justify-center
        overflow-hidden
        rounded-full
        bg-slate-200
        font-medium
        text-slate-700
        ${sizes[size]}
      `}
    >
      {src ? (
        <img
          src={src}
          alt={alt || name}
          className="h-full w-full object-cover"
        />
      ) : (
        initials
      )}
    </div>
  )
}

export default Avatar