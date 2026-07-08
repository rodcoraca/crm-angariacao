export function createDashboardStyles(theme) {
  return {
    page: {
      display: "grid",
      gap: theme.layout.gap
    },
    filtros: {
      display: "flex",
      flexWrap: "wrap",
      gap: theme.layout.gap,
      marginBottom: theme.layout.gap,
      alignItems: "center"
    },
    input: {
      flex: "1 1 220px",
      minWidth: "220px"
    },
    select: {
      flex: "0 0 220px",
      minWidth: "220px"
    },
    btnExport: {
      minWidth: "150px"
    },
    tableWrapper: {
      background: theme.colors.surface,
      borderRadius: theme.borderRadius.md,
      boxShadow: theme.elevation[2],
      overflow: "hidden",
      marginTop: theme.spacing.md
    },
    td: {
      padding: theme.layout.padding,
      fontSize: theme.typography.body.fontSize,
      fontWeight: theme.typography.body.fontWeight,
      color: theme.colors.text
    },
    tdNome: {
      padding: theme.layout.padding,
      fontSize: theme.typography.body.fontSize,
      fontWeight: theme.typography.cardTitle.fontWeight,
      color: theme.colors.text
    },
    cardDetalhe: {
      background: theme.colors.surface,
      padding: theme.spacing.lg,
      borderRadius: theme.borderRadius.md,
      boxShadow: theme.elevation[2],
      marginBottom: theme.layout.gap
    },
    headerDetalhe: {
      display: "flex",
      justifyContent: "space-between",
      marginBottom: theme.spacing.sm
    },
    obsBox: {
      marginTop: theme.spacing.sm,
      padding: theme.layout.padding,
      background: theme.colors.light,
      borderRadius: theme.borderRadius.sm,
      color: theme.colors.text
    },
    tipoBadge: {
      padding: `${theme.spacing.xs} ${theme.spacing.sm}`,
      borderRadius: theme.borderRadius.full,
      fontSize: theme.typography.badge.fontSize,
      fontWeight: theme.typography.badge.fontWeight
    },
    clickableCell: {
      padding: 0,
      cursor: "pointer"
    }
  };
}
