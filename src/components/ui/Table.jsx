import { useTheme } from "../../theme/ThemeContext";

export default function Table({ columns = [], rows = [], emptyMessage = "Sem dados", style, ...props }) {
  const theme = useTheme();

  return (
    <div style={{ overflowX: "auto", borderRadius: theme.borderRadius.lg, border: `1px solid ${theme.colors.border}`, background: theme.colors.surface, boxShadow: theme.shadow.sm }}>
      <table {...props} style={{ width: "100%", borderCollapse: "collapse", fontFamily: theme.typography.fontFamily, ...style }}>
        {columns.length > 0 ? (
          <thead>
            <tr style={{ background: theme.colors.surfaceSoft }}>
              {columns.map((column) => (
                <th
                  key={column.key || column.title}
                  style={{
                    textAlign: column.align || "left",
                    padding: `${theme.spacing.sm} ${theme.spacing.md}`,
                    color: theme.colors.muted,
                    fontSize: "0.9rem",
                    fontWeight: 600,
                    borderBottom: `1px solid ${theme.colors.border}`
                  }}
                >
                  {column.title}
                </th>
              ))}
            </tr>
          </thead>
        ) : null}
        <tbody>
          {rows.length > 0 ? (
            rows.map((row, rowIndex) => (
              <tr key={row.id || rowIndex} style={{ borderBottom: `1px solid ${theme.colors.border}` }}>
                {columns.map((column) => (
                  <td
                    key={`${row.id || rowIndex}-${column.key || column.title}`}
                    style={{
                      padding: `${theme.spacing.sm} ${theme.spacing.md}`,
                      color: theme.colors.text,
                      fontSize: "0.95rem"
                    }}
                  >
                    {column.render ? column.render(row) : row[column.key]}
                  </td>
                ))}
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={columns.length || 1} style={{ padding: theme.spacing.lg, textAlign: "center", color: theme.colors.muted }}>
                {emptyMessage}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
