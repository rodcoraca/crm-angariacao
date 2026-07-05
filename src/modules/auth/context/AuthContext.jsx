import { createContext, useContext } from "react";

const AuthContext = createContext({
  user: null,
  perfil: null,
  activeCompanyId: null,
  session: null
});

export function AuthProvider({ value, children }) {
  return <AuthContext.Provider value={value || {}}>{children}</AuthContext.Provider>;
}

export function useAuthContext() {
  return useContext(AuthContext);
}
