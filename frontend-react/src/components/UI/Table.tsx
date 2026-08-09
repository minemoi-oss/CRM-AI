import type { ReactNode } from "react"

interface TableColumn<T> {
  key: string
  header: string
  render?: (item: T) => ReactNode
}

interface TableProps<T> {
  columns: TableColumn<T>[]
  data: T[]
  getRowKey?: (item: T, index: number) => string | number
}

function Table<T>({
  columns,
  data,
  getRowKey,
}: TableProps<T>) {
  return (
    <div className="w-full overflow-x-auto rounded-lg border border-slate-200 bg-white">

      <table className="w-full border-collapse text-sm">

        <thead className="bg-slate-50">
          <tr>
            {columns.map((column) => (
              <th
                key={column.key}
                className="
                  border-b
                  border-slate-200
                  px-4
                  py-3
                  text-left
                  font-semibold
                  text-slate-700
                "
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>

        <tbody>
          {data.map((item, index) => (
            <tr
              key={getRowKey ? getRowKey(item, index) : index}
              className="hover:bg-slate-50"
            >
              {columns.map((column) => (
                <td
                  key={column.key}
                  className="
                    border-b
                    border-slate-100
                    px-4
                    py-3
                    text-slate-600
                  "
                >
                  {column.render
                    ? column.render(item)
                    : String(
                        item[column.key as keyof T] ?? ""
                      )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>

      </table>

    </div>
  )
}

export default Table