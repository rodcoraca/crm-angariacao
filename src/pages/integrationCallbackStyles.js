export function createIntegrationCallbackStyles(theme, status) {
  return {
    page: {
      minHeight: "100vh",
      display: "grid",
      placeItems: "center",
      padding: theme.layout.pagePadding,
      background: theme.colors.background
    },
    shell: {
      width: "min(920px, 100%)",
      display: "grid",
      gap: theme.layout.gap
    },
    cardBase: {
      padding: theme.layout.padding,
      display: "grid",
      gap: theme.layout.gap
    },
    eyebrow: {
      color: theme.colors.accent,
      fontWeight: theme.typography.cardTitle.fontWeight,
      fontSize: theme.typography.caption.fontSize
    },
    title: {
      margin: 0,
      color: theme.colors.text,
      fontSize: theme.typography.h1.fontSize,
      fontWeight: theme.typography.h1.fontWeight
    },
    description: {
      margin: 0,
      color: theme.colors.muted,
      lineHeight: theme.typography.body.lineHeight,
      fontSize: theme.typography.body.fontSize
    },
    statusText: {
      margin: 0,
      color:
        status === "error"
          ? theme.colors.statusDangerText
          : status === "success"
            ? theme.colors.statusSuccessText
            : theme.colors.muted,
      fontSize: theme.typography.body.fontSize
    },
    contentGrid: {
      display: "grid",
      gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
      gap: theme.layout.padding
    },
    sectionTitle: {
      margin: 0,
      color: theme.colors.text,
      fontSize: theme.typography.h2.fontSize,
      fontWeight: theme.typography.h2.fontWeight
    },
    fieldLabel: {
      display: "grid",
      gap: theme.spacing.xs,
      color: theme.colors.text,
      fontSize: theme.typography.caption.fontSize
    },
    fieldInput: {
      width: "100%",
      padding: `${theme.spacing.sm} ${theme.spacing.md}`,
      borderRadius: theme.borderRadius.md,
      border: `1px solid ${theme.colors.border}`,
      fontSize: theme.typography.body.fontSize,
      outline: "none"
    },
    actionRow: {
      display: "flex",
      gap: theme.spacing.sm,
      flexWrap: "wrap"
    },
    stateGrid: {
      display: "grid",
      gap: theme.spacing.sm,
      color: theme.colors.text,
      fontSize: theme.typography.body.fontSize
    }
  };
}
