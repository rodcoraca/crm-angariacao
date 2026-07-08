import { colors } from "./colors";
import { typography } from "./typography";

export const theme = {
  colors,
  typography,

  radius: {
    sm: "8px",
    md: "12px",
    pill: "999px"
  },

  borderRadius: {
    sm: "8px",
    md: "12px",
    lg: "12px",
    xl: "12px",
    full: "999px"
  },

  elevation: {
    0: "none",
    1: "0 1px 2px rgba(16, 34, 45, 0.08)",
    2: "0 4px 10px rgba(16, 34, 45, 0.10)",
    3: "0 8px 18px rgba(16, 34, 45, 0.14)"
  },

  shadow: {
    sm: "0 1px 2px rgba(16, 34, 45, 0.08)",
    md: "0 4px 10px rgba(16, 34, 45, 0.10)",
    lg: "0 8px 18px rgba(16, 34, 45, 0.14)"
  },

  layout: {
    gap: "12px",
    padding: "16px",
    pagePadding: "20px"
  },

  spacing: {
    xs: "8px",
    sm: "12px",
    md: "16px",
    lg: "20px",
    xl: "24px"
  }
};