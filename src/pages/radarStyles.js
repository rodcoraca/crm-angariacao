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
    cardGrid: {
      display: "grid",
      gap: theme.spacing.md,
      gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))"
    },
    filterCard: {
      display: "grid",
      gap: theme.spacing.sm
    },
    filtersGrid: {
      display: "flex",
      gap: theme.spacing.sm,
      alignItems: "flex-start",
      flexWrap: "nowrap",
      overflowX: "auto",
      overflowY: "hidden",
      paddingBottom: 2
    },
    filterField: {
      display: "grid",
      gap: 6,
      color: theme.colors.muted,
      minWidth: "180px",
      flex: "1 0 180px"
    },
    filterControl: {
      width: "100%",
      minWidth: 0,
      boxSizing: "border-box",
      border: `1px solid ${theme.colors.border}`,
      borderRadius: theme.borderRadius.sm,
      padding: "8px 10px"
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
      fontSize: "0.9rem"
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
    roadmapList: {
      display: "grid",
      gap: theme.spacing.sm
    },
    roadmapItem: {
      display: "flex",
      alignItems: "center",
      gap: theme.spacing.sm,
      color: theme.colors.text,
      fontWeight: theme.typography.cardTitle.fontWeight
    },
    roadmapStep: {
      minWidth: "44px"
    },
    flowGrid: {
      display: "grid",
      gap: theme.spacing.sm,
      gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))"
    },
    flowCard: {
      display: "grid",
      gap: theme.spacing.xs,
      textAlign: "center",
      alignContent: "center",
      minHeight: "120px"
    },
    flowStepBadge: {
      width: "fit-content",
      margin: "0 auto"
    },
    flowName: {
      margin: 0,
      color: theme.colors.text,
      fontSize: "1rem"
    },
    footer: {
      textAlign: "center",
      color: theme.colors.muted,
      margin: 0,
      lineHeight: 1.5
    }
  };
}
