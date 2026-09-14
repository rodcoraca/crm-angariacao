import { supabase } from "../../../supabase";
import { applyEmpresaScope } from "../../../utils/empresaScope.js";

const CLIENTES_TABLE = "clientes";
const CLIENTES_SEGURAS_TABLE = "clientes_seguro";
const USUARIOS_TABLE = "usuarios";

export function fetchClientes(empresaId = null) {
  return applyEmpresaScope(
    supabase
      .from(CLIENTES_SEGURAS_TABLE)
      .select("*"),
    empresaId
  ).order("created_at", { ascending: false });
}

export function fetchUsuariosEmpresa(empresaId = null) {
  return applyEmpresaScope(
    supabase
      .from(USUARIOS_TABLE)
      .select("id, nome, apelido, email, auth_user_id, empresa_id"),
    empresaId
  ).order("nome", { ascending: true });
}

export async function insertCliente(payload) {
  const insertResult = await supabase
    .from(CLIENTES_TABLE)
    .insert([payload]);

  if (insertResult.error) {
    return insertResult;
  }

  const empresaId = payload?.empresa_id ?? null;
  const createdBy = payload?.created_by ?? null;
  const nomeDesignacao = payload?.nome_designacao ?? null;

  const query = applyEmpresaScope(
    supabase
      .from(CLIENTES_SEGURAS_TABLE)
      .select("*"),
    empresaId
  );

  if (empresaId) {
    query.eq("empresa_id", empresaId);
  }

  if (createdBy) {
    query.eq("created_by", createdBy);
  }

  if (nomeDesignacao) {
    query.ilike("nome_designacao", String(nomeDesignacao).trim());
  }

  const { data: clienteCriado, error: readError } = await query
    .order("created_at", { ascending: false })
    .limit(1);

  if (readError) {
    return { data: null, error: readError };
  }

  return {
    data: clienteCriado?.[0] || null,
    error: null
  };
}

export function updateCliente(clienteId, payload, empresaId = null) {
  return applyEmpresaScope(
    supabase
      .from(CLIENTES_TABLE)
      .update(payload)
      .eq("id", clienteId)
      .select(),
    empresaId
  );
}

export function deleteCliente(clienteId, empresaId = null) {
  return applyEmpresaScope(
    supabase
      .from(CLIENTES_TABLE)
      .delete()
      .eq("id", clienteId)
      .select(),
    empresaId
  );
}
