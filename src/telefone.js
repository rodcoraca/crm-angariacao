export function normalizarTelefone(valor) {
  if (!valor) return "";

  const digitos = String(valor).replace(/\D/g, "");
  return digitos.slice(0, 12);
}

export function validarTelefone(valor) {
  const telefone = String(valor || "").replace(/\D/g, "");
  return /^\d{12}$/.test(telefone);
}

export function telefonesCoincidem(telefone, telefoneCadastrado) {
  const normalizado = normalizarTelefone(telefone);
  const cadastrado = normalizarTelefone(telefoneCadastrado);

  if (!normalizado || !cadastrado) return false;
  if (normalizado === cadastrado) return true;

  const temDozeDigitos = normalizado.length === 12 && cadastrado.length === 12;
  if (!temDozeDigitos) return false;

  const baseNormalizada = normalizado.slice(-9);
  const baseCadastrada = cadastrado.slice(-9);

  return baseNormalizada === baseCadastrada;
}
