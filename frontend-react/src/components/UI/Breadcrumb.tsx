interface BreadcrumbItem {
  label: string
  href?: string
}

interface BreadcrumbProps {
  items: BreadcrumbItem[]
}

function Breadcrumb({
  items,
}: BreadcrumbProps) {
  return (
    <nav aria-label="Breadcrumb">

      <ol className="flex flex-wrap items-center gap-2 text-sm">

        {items.map((item, index) => (
          <li
            key={`${item.label}-${index}`}
            className="flex items-center gap-2"
          >

            {item.href ? (
              <a
                href={item.href}
                className="text-slate-500 hover:text-blue-600"
              >
                {item.label}
              </a>
            ) : (
              <span className="font-medium text-slate-900">
                {item.label}
              </span>
            )}

            {index < items.length - 1 && (
              <span className="text-slate-400">
                /
              </span>
            )}

          </li>
        ))}

      </ol>

    </nav>
  )
}

export default Breadcrumb