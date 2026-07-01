export const headerStyles = (theme, style = {}) => ({
  height: "70px",
  display: "flex",
  alignItems: "center",
  padding: `0 ${theme.spacing.lg}`,
  borderBottom: `1px solid ${theme.colors.border}`,
  background: theme.colors.primary,
  color: theme.colors.textLight,
  fontFamily: theme.typography.fontFamily,
  boxShadow: "0 8px 24px rgba(14, 77, 100, 0.15)",
  ...style
});
