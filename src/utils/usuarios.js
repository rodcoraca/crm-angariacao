export const MODULOS = [
  { key: 'fluxo', label: 'Fluxo' },
  { key: 'dashboard', label: 'Leads - Todos' },
  { key: 'quente', label: 'Leads - Quentes' },
  { key: 'morno', label: 'Leads - Mornos' },
  { key: 'frio', label: 'Leads - Frios' },
  { key: 'mensagens', label: 'Mensagens' },
  { key: 'estoque_np', label: 'Estoque' },
  { key: 'usuarios', label: 'Utilizadores' },
  { key: 'logs', label: 'Logs' },
];

export function modulosDisponiveis() {
  return MODULOS.map((modulo) => modulo.key);
}

export function temAcesso(usuario, modulo) {
  if (!usuario) return false;
  return Boolean(usuario.permissoes?.[modulo]);
}

export function permissoesBase() {
  return MODULOS.reduce((acc, modulo) => {
    acc[modulo.key] = true;
    return acc;
  }, {});
}

export function normalizarPermissoes(permissoes) {
  const base = permissoesBase();
  const entrada = permissoes || {};
  return Object.keys(base).reduce((acc, key) => {
    acc[key] = Boolean(entrada[key]);
    return acc;
  }, {});
}
