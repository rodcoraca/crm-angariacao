import { createContext, useContext } from "react";
import { theme } from "./theme";

const ThemeContext = createContext(theme);

export function ThemeProvider({ children, value = theme }) {
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  return useContext(ThemeContext);
}
