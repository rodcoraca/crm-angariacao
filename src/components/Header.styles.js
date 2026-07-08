export const headerStyles = (theme, style = {}) => ({
  height: "70px",
  display: "flex",
  alignItems: "center",
  padding: `0 ${theme.layout.pagePadding}`,
  borderBottom: `1px solid ${theme.colors.border}`,
  background: theme.colors.primary,
  color: theme.colors.textLight,
  fontFamily: theme.typography.fontFamily,
  boxShadow: theme.elevation[2],
  ...style
});
