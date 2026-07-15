export function normalizeEmpresaId(value) {
  const normalized = String(value || "").trim();
  return normalized || null;
}

export function warnMissingEmpresaId() {
  console.warn("Operação sem empresa_id");
}

export function hasEmpresaId(empresaId) {
  return Boolean(normalizeEmpresaId(empresaId));
}

export function requireEmpresaId(empresaId) {
  const normalizedEmpresaId = normalizeEmpresaId(empresaId);
  if (!normalizedEmpresaId) {
    warnMissingEmpresaId();
    const error = new Error("Operacao sem empresa_id");
    error.code = "missing_empresa_id";
    throw error;
  }

  return normalizedEmpresaId;
}
