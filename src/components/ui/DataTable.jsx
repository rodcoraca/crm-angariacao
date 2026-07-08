import { useMemo, useState } from "react";
import { useTheme } from "../../theme/ThemeContext";
import EmptyState from "./EmptyState";

function getSortableValue(row, column) {
  if (typeof column.sortAccessor === "function") return column.sortAccessor(row);
  if (!column.key) return "";
  return row[column.key];
}

function defaultSort(a, b) {
  if (a == null && b == null) return 0;
  if (a == null) return -1;
  if (b == null) return 1;

  if (typeof a === "number" && typeof b === "number") {
    return a - b;
  }

  return String(a).localeCompare(String(b), "pt", { sensitivity: "base" });
}

export default function DataTable({
  columns = [],
  rows = [],
  rowKey = "id",
  emptyTitle = "Sem registos",
  emptyDescription = "Nao existem dados para os filtros aplicados.",
  compact = false,
  sortable = true,
  striped = false,
  onRowClick,
  style,
  tableStyle
}) {
  const theme = useTheme();
  const [sortState, setSortState] = useState({ key: "", direction: "asc" });
  const [hoveredRowKey, setHoveredRowKey] = useState(null);
  const [hoveredHeaderKey, setHoveredHeaderKey] = useState(null);

  const sortedRows = useMemo(() => {
    if (!sortable || !sortState.key) return rows;

    const column = columns.find((item) => item.key === sortState.key);
    if (!column) return rows;

    const sorted = [...rows].sort((left, right) => {
      const leftValue = getSortableValue(left, column);
      const rightValue = getSortableValue(right, column);
      const result = defaultSort(leftValue, rightValue);
      return sortState.direction === "asc" ? result : result * -1;
    });

    return sorted;
  }, [columns, rows, sortState, sortable]);

  function toggleSort(column) {
    if (!sortable || column.sortable === false || !column.key) return;

    setSortState((prev) => {
      if (prev.key !== column.key) {
        return { key: column.key, direction: "asc" };
      }

      return {
        key: column.key,
        direction: prev.direction === "asc" ? "desc" : "asc"
      };
    });
  }

  const rowPadding = compact ? `${theme.spacing.xs} ${theme.spacing.sm}` : `${theme.spacing.sm} ${theme.spacing.md}`;

  return (
    <div
      style={{
        overflowX: "auto",
        borderRadius: theme.borderRadius.md,
        border: `1px solid ${theme.colors.border}`,
        background: theme.colors.surface,
        boxShadow: theme.elevation[1],
        ...style
      }}
    >
      <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: theme.typography.fontFamily, ...tableStyle }}>
        <thead>
          <tr style={{ background: theme.colors.surfaceSoft }}>
            {columns.map((column) => {
              const isSorted = sortState.key === column.key;
              const canSort = sortable && column.sortable !== false && Boolean(column.key);

              return (
                <th
                  key={column.key || column.title}
                  onClick={() => toggleSort(column)}
                  onMouseEnter={() => setHoveredHeaderKey(column.key || column.title)}
                  onMouseLeave={() => setHoveredHeaderKey(null)}
                  style={{
                    textAlign: column.align || "left",
                    padding: rowPadding,
                    color: theme.colors.muted,
                    fontSize: theme.typography.caption.fontSize,
                    fontWeight: theme.typography.cardTitle.fontWeight,
                    borderBottom: `1px solid ${theme.colors.border}`,
                    userSelect: "none",
                    cursor: canSort ? "pointer" : "default",
                    whiteSpace: "nowrap",
                    background: canSort && hoveredHeaderKey === (column.key || column.title) ? theme.colors.surface : theme.colors.surfaceSoft,
                    transition: "background-color 200ms ease, color 200ms ease"
                  }}
                >
                  {column.title}
                  {canSort ? (
                    <span style={{ marginLeft: theme.spacing.xs, color: isSorted ? theme.colors.text : theme.colors.muted, opacity: isSorted ? 1 : 0.55 }}>
                      {isSorted && sortState.direction === "desc" ? "v" : "^"}
                    </span>
                  ) : null}
                </th>
              );
            })}
          </tr>
        </thead>

        <tbody>
          {sortedRows.length ? (
            sortedRows.map((row, index) => {
              const computedKey = typeof rowKey === "function" ? rowKey(row) : row[rowKey] || index;

              return (
                <tr
                  key={computedKey}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                  onMouseEnter={() => setHoveredRowKey(computedKey)}
                  onMouseLeave={() => setHoveredRowKey(null)}
                  data-clickable={onRowClick ? "true" : "false"}
                  style={{
                    borderBottom: `1px solid ${theme.colors.border}`,
                    background: onRowClick && hoveredRowKey === computedKey
                      ? theme.colors.surfaceSoft
                      : striped && index % 2 === 1
                        ? theme.colors.surfaceSoft
                        : theme.colors.surface,
                    cursor: onRowClick ? "pointer" : "default",
                    transform: onRowClick && hoveredRowKey === computedKey ? "translateY(-2px)" : "translateY(0)",
                    boxShadow: onRowClick && hoveredRowKey === computedKey ? theme.elevation[1] : "none",
                    transition: "transform 200ms ease, box-shadow 200ms ease, background-color 200ms ease"
                  }}
                >
                  {columns.map((column) => (
                    <td
                      key={`${computedKey}_${column.key || column.title}`}
                      style={{
                        padding: rowPadding,
                        color: theme.colors.text,
                        fontSize: theme.typography.body.fontSize,
                        fontWeight: theme.typography.body.fontWeight,
                        verticalAlign: "top"
                      }}
                    >
                      {typeof column.render === "function" ? column.render(row) : row[column.key]}
                    </td>
                  ))}
                </tr>
              );
            })
          ) : (
            <tr>
              <td colSpan={columns.length || 1} style={{ padding: theme.spacing.lg }}>
                <EmptyState title={emptyTitle} description={emptyDescription} style={{ border: "none", boxShadow: "none", padding: theme.spacing.md }} />
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
