import { useTheme } from "../theme/ThemeContext";
import { headerStyles } from "./Header.styles";

export default function Header({ children, style, ...props }) {
  const theme = useTheme();

  return (
    <header
      {...props}
      style={headerStyles(theme, style)}
    >
      {children}
    </header>
  );
}
