export function resolverContratoIdentidade(user) {
  const usuarioId = user?.perfil_id || null;
  const authUserId = user?.auth_user_id || user?.id || null;
  const responsavelId = usuarioId || authUserId || null;

  return {
    responsavelId,
    usuarioId,
    authUserId,
    idsRelacionados: [responsavelId, usuarioId, authUserId].filter(Boolean)
  };
}

export function pertenceAoMesmoContrato(agenteId, user) {
  const contrato = resolverContratoIdentidade(user);
  return contrato.idsRelacionados.includes(agenteId);
}
