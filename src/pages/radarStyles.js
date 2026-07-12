export function createRadarStyles(theme) {
  return {
    page: {
      display: "grid",
      gap: theme.spacing.xl
    },
    hero: {
      display: "grid",
      gap: theme.spacing.md,
      background: `linear-gradient(135deg, ${theme.colors.surface} 0%, ${theme.colors.surfaceSoft} 100%)`
    },
    heroBadge: {
      width: "fit-content"
    },
    title: {
      margin: 0,
      color: theme.colors.text,
      fontSize: "2rem",
      lineHeight: 1.1
    },
    subtitle: {
      margin: 0,
      color: theme.colors.primary,
      fontSize: "1.05rem",
      fontWeight: theme.typography.cardTitle.fontWeight
    },
    description: {
      margin: 0,
      color: theme.colors.muted,
      maxWidth: "72ch",
      lineHeight: 1.6
    },
    section: {
      display: "grid",
      gap: theme.spacing.md
    },
    sectionTitle: {
      margin: 0,
      color: theme.colors.text,
      fontSize: "1.2rem"
    },
    sectionHeader: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      gap: theme.spacing.sm,
      flexWrap: "wrap"
    },
    filterCard: {
      display: "grid",
      gap: theme.spacing.xs,
      padding: "10px 12px"
    },
    filterField: {
      display: "grid",
      gap: 4,
      color: theme.colors.muted,
      minWidth: "160px",
      flex: "1 0 160px",
      fontSize: "0.85rem"
    },
    filterControl: {
      width: "100%",
      minWidth: 0,
      boxSizing: "border-box",
      border: `1px solid ${theme.colors.border}`,
      borderRadius: theme.borderRadius.sm,
      padding: "6px 8px",
      minHeight: "32px",
      fontSize: "0.85rem"
    },
    filterFooter: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      gap: theme.spacing.sm,
      flexWrap: "wrap"
    },
    filterInfo: {
      color: theme.colors.muted,
      fontSize: "0.82rem"
    },
    linkButton: {
      background: "transparent",
      border: "none",
      padding: 0,
      margin: 0,
      color: theme.colors.primary,
      fontWeight: theme.typography.cardTitle.fontWeight,
      cursor: "pointer",
      textAlign: "left"
    },
    rowActions: {
      display: "flex",
      gap: theme.spacing.xs,
      flexWrap: "wrap"
    },
    tableContainer: {
      display: "grid",
      gap: theme.spacing.md
    },
    tableHeader: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      gap: theme.spacing.sm,
      flexWrap: "wrap"
    },
    actionRow: {
      display: "flex",
      flexWrap: "wrap",
      gap: theme.spacing.sm
    },
    errorText: {
      margin: 0,
      color: theme.colors.danger
    },
    detailCard: {
      display: "grid",
      gap: theme.spacing.sm
    },
    detailHeader: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      gap: theme.spacing.sm,
      flexWrap: "wrap"
    },
    detailTitle: {
      color: theme.colors.text
    },
    detailText: {
      margin: 0,
      color: theme.colors.text
    },
    detailField: {
      display: "grid",
      gap: 6,
      color: theme.colors.muted
    },
    detailSelect: {
      border: `1px solid ${theme.colors.border}`,
      borderRadius: theme.borderRadius.sm,
      padding: "8px 10px",
      maxWidth: "240px"
    },
    detailActions: {
      display: "flex",
      gap: theme.spacing.sm,
      flexWrap: "wrap"
    },
    timelineCard: {
      display: "grid",
      gap: theme.spacing.sm
    },
    timelineEmpty: {
      margin: 0,
      color: theme.colors.muted
    },
    timelineItem: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      gap: theme.spacing.sm,
      border: `1px solid ${theme.colors.border}`,
      borderRadius: theme.borderRadius.sm,
      padding: "10px 12px",
      flexWrap: "wrap"
    },
    timelineItemInfo: {
      display: "grid",
      gap: 2
    },
    timelineItemTitle: {
      color: theme.colors.text
    },
    timelineItemEvent: {
      color: theme.colors.muted,
      fontSize: "0.9rem"
    },
    timelineItemMeta: {
      display: "flex",
      alignItems: "center",
      gap: theme.spacing.xs
    },
    timelineDate: {
      color: theme.colors.muted,
      fontSize: "0.85rem"
    },
    flowCard: {
      display: "grid",
      gap: theme.spacing.xs,
      textAlign: "center",
      alignContent: "center",
      minHeight: "92px",
      padding: "10px 12px"
    },
    flowStepBadge: {
      width: "fit-content",
      margin: "0 auto"
    },
    flowName: {
      margin: 0,
      color: theme.colors.text,
      fontSize: "0.95rem"
    }
  };
}
